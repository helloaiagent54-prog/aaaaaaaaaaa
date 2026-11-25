import { Router } from 'express';
import { z } from 'zod';
import { requireDatabase } from '../../database/connection.ts';
import {
  requireAuth,
  requirePermission,
  type AuthenticatedRequest,
} from '../../middleware/auth.middleware.ts';
import { asyncHandler } from '../../middleware/error.middleware.ts';
import { recordAuditLog } from '../../services/audit.service.ts';
import { CouponModel, CouponRedemptionModel } from './marketing.model.ts';

const router = Router();
router.use(requireDatabase, requireAuth);

const couponSchema = z.object({
  code: z.string().trim().toUpperCase().min(2).max(40),
  description: z.string().trim().max(240).optional(),
  type: z.enum(['fixed', 'percentage']),
  value: z.number().min(1),
  maxDiscountCap: z.number().min(0).nullable().optional(),
  minOrderAmount: z.number().min(0).default(0),
  usageLimit: z.number().int().min(1).nullable().optional(),
  perCustomerLimit: z.number().int().min(1).nullable().optional(),
  eligibleCategoryIds: z.array(z.string()).default([]),
  eligibleProductIds: z.array(z.string()).default([]),
  startsAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().default(true),
});

router.get(
  '/admin/coupons',
  requirePermission('coupons:write'),
  asyncHandler(async (_req, res) => {
    const coupons = await CouponModel.find().sort({ createdAt: -1 });
    const recentRedemptions = await CouponRedemptionModel.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('userId', 'name email');
    res.json({ coupons, recentRedemptions });
  })
);

router.post(
  '/admin/coupons',
  requirePermission('coupons:write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = couponSchema.parse(req.body);
    if (parsed.type === 'percentage' && parsed.value > 95) {
      res.status(400).json({ error: 'Percentage coupon cannot exceed 95%.' });
      return;
    }

    const coupon = await CouponModel.create({
      ...parsed,
      startsAt: parsed.startsAt ? new Date(parsed.startsAt) : null,
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
    });

    await recordAuditLog({
      actorId: req.user!._id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'CREATE_COUPON',
      resourceType: 'Coupon',
      resourceId: String(coupon._id),
      details: { code: coupon.code, type: coupon.type, value: coupon.value },
      ipAddress: req.ip,
    });

    res.status(201).json({ coupon });
  })
);

router.patch(
  '/admin/coupons/:id',
  requirePermission('coupons:write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = couponSchema.partial().parse(req.body);
    const coupon = await CouponModel.findByIdAndUpdate(
      req.params.id,
      {
        ...parsed,
        startsAt:
          parsed.startsAt !== undefined
            ? parsed.startsAt
              ? new Date(parsed.startsAt)
              : null
            : undefined,
        expiresAt:
          parsed.expiresAt !== undefined
            ? parsed.expiresAt
              ? new Date(parsed.expiresAt)
              : null
            : undefined,
      },
      { new: true }
    );
    if (!coupon) {
      res.status(404).json({ error: 'Coupon not found' });
      return;
    }

    await recordAuditLog({
      actorId: req.user!._id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'UPDATE_COUPON',
      resourceType: 'Coupon',
      resourceId: String(coupon._id),
      details: parsed,
      ipAddress: req.ip,
    });

    res.json({ coupon });
  })
);

export default router;
