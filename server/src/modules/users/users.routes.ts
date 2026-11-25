import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { validateBangladeshHierarchy } from '../../../../shared/bangladeshLocations.ts';
import { STAFF_ROLES, type StaffRole } from '../../../../shared/rbac.ts';
import { escapeRegex } from '../../../../shared/security.ts';
import { requireDatabase } from '../../database/connection.ts';
import {
  requireAuth,
  requirePermission,
  type AuthenticatedRequest,
} from '../../middleware/auth.middleware.ts';
import { asyncHandler } from '../../middleware/error.middleware.ts';
import { recordAuditLog } from '../../services/audit.service.ts';
import { ProductModel } from '../catalog/catalog.model.ts';
import { UserModel } from './user.model.ts';

const router = Router();
router.use(requireDatabase, requireAuth);

const addressInputSchema = z.object({
  label: z.string().trim().min(1).max(40),
  recipientName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(8).max(25),
  divisionCode: z.string().min(1),
  districtCode: z.string().min(1),
  upazilaCode: z.string().min(1),
  areaCode: z.string().min(1),
  houseAddress: z.string().trim().min(3).max(200),
  roadStreet: z.string().trim().max(120).optional(),
  landmark: z.string().trim().max(120).optional(),
  deliveryInstructions: z.string().trim().max(240).optional(),
  isDefault: z.boolean().optional(),
});

router.patch(
  '/profile',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const schema = z.object({
      name: z.string().trim().min(2).max(100).optional(),
      phone: z.string().trim().max(25).optional(),
      notificationPreferences: z
        .object({
          orderUpdates: z.boolean(),
          promotions: z.boolean(),
          backInStock: z.boolean(),
        })
        .optional(),
    });
    const parsed = schema.parse(req.body);
    const user = await UserModel.findById(req.user!._id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (parsed.name !== undefined) user.name = parsed.name;
    if (parsed.phone !== undefined) user.phone = parsed.phone;
    if (parsed.notificationPreferences) {
      user.notificationPreferences = parsed.notificationPreferences;
    }
    await user.save();
    res.json({
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        savedAddresses: user.savedAddresses,
        wishlist: user.wishlist.map((id: unknown) => String(id)),
        notificationPreferences: user.notificationPreferences,
      },
    });
  })
);

router.post(
  '/change-password',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8).max(100),
    });
    const parsed = schema.parse(req.body);
    const user = await UserModel.findById(req.user!._id).select('+passwordHash');
    if (!user || !user.passwordHash) {
      res.status(400).json({ error: 'Password change unavailable for OAuth-only account.' });
      return;
    }
    const valid = await bcrypt.compare(parsed.currentPassword, user.passwordHash);
    if (!valid) {
      res.status(400).json({ error: 'Current password is incorrect.' });
      return;
    }
    user.passwordHash = await bcrypt.hash(parsed.newPassword, 12);
    await user.save();
    res.json({ ok: true, message: 'Password updated successfully.' });
  })
);

// Saved Addresses with Bangladesh hierarchical validation
router.get(
  '/addresses',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const user = await UserModel.findById(req.user!._id);
    res.json({ addresses: user?.savedAddresses || [] });
  })
);

router.post(
  '/addresses',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = addressInputSchema.parse(req.body);
    const hierarchy = validateBangladeshHierarchy(parsed);
    if (!hierarchy.valid || !hierarchy.zone) {
      res.status(400).json({ error: 'Invalid Bangladesh Division/District/Upazila/Area combination.' });
      return;
    }

    const user = await UserModel.findById(req.user!._id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const shouldBeDefault = parsed.isDefault || user.savedAddresses.length === 0;
    if (shouldBeDefault) {
      for (const addr of user.savedAddresses) {
        addr.isDefault = false;
      }
    }

    user.savedAddresses.push({
      label: parsed.label,
      recipientName: parsed.recipientName,
      phone: parsed.phone,
      divisionCode: parsed.divisionCode,
      divisionName: hierarchy.divisionName!,
      districtCode: parsed.districtCode,
      districtName: hierarchy.districtName!,
      upazilaCode: parsed.upazilaCode,
      upazilaName: hierarchy.upazilaName!,
      areaCode: parsed.areaCode,
      areaName: hierarchy.areaName!,
      zone: hierarchy.zone,
      houseAddress: parsed.houseAddress,
      roadStreet: parsed.roadStreet,
      landmark: parsed.landmark,
      deliveryInstructions: parsed.deliveryInstructions,
      isDefault: shouldBeDefault,
    } as never);

    await user.save();
    res.status(201).json({ addresses: user.savedAddresses });
  })
);

router.patch(
  '/addresses/:addressId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = addressInputSchema.partial().parse(req.body);
    const user = await UserModel.findById(req.user!._id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const addr = user.savedAddresses.find(
      (a: { _id?: unknown }) => String(a._id) === req.params.addressId
    );
    if (!addr) {
      res.status(404).json({ error: 'Saved address not found' });
      return;
    }

    const nextCodes = {
      divisionCode: parsed.divisionCode ?? addr.divisionCode,
      districtCode: parsed.districtCode ?? addr.districtCode,
      upazilaCode: parsed.upazilaCode ?? addr.upazilaCode,
      areaCode: parsed.areaCode ?? addr.areaCode,
    };
    const hierarchy = validateBangladeshHierarchy(nextCodes);
    if (!hierarchy.valid || !hierarchy.zone) {
      res.status(400).json({ error: 'Invalid Bangladesh administrative area hierarchy.' });
      return;
    }

    if (parsed.isDefault) {
      for (const item of user.savedAddresses) {
        item.isDefault = false;
      }
    }

    Object.assign(addr, {
      ...parsed,
      divisionName: hierarchy.divisionName,
      districtName: hierarchy.districtName,
      upazilaName: hierarchy.upazilaName,
      areaName: hierarchy.areaName,
      zone: hierarchy.zone,
    });

    await user.save();
    res.json({ addresses: user.savedAddresses });
  })
);

router.delete(
  '/addresses/:addressId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const user = await UserModel.findById(req.user!._id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const beforeLen = user.savedAddresses.length;
    user.savedAddresses = user.savedAddresses.filter(
      (a: { _id?: unknown }) => String(a._id) !== req.params.addressId
    ) as typeof user.savedAddresses;

    if (user.savedAddresses.length === beforeLen) {
      res.status(404).json({ error: 'Address not found' });
      return;
    }

    if (
      user.savedAddresses.length > 0 &&
      !user.savedAddresses.some((a: { isDefault?: boolean }) => a.isDefault)
    ) {
      user.savedAddresses[0].isDefault = true;
    }

    await user.save();
    res.json({ addresses: user.savedAddresses });
  })
);

// Wishlist
router.get(
  '/wishlist',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const user = await UserModel.findById(req.user!._id).populate({
      path: 'wishlist',
      match: { status: 'published' },
      populate: [
        { path: 'brandId', select: 'name slug' },
        { path: 'categoryId', select: 'name slug' },
      ],
    });
    res.json({ items: user?.wishlist || [] });
  })
);

router.post(
  '/wishlist/toggle',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const productId = z.string().min(1).parse(req.body?.productId);
    const productExists = await ProductModel.exists({ _id: productId, status: 'published' });
    if (!productExists) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const user = await UserModel.findById(req.user!._id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const idx = user.wishlist.findIndex((id: unknown) => String(id) === productId);
    let added = false;
    if (idx >= 0) {
      user.wishlist.splice(idx, 1);
    } else {
      user.wishlist.push(productId as never);
      added = true;
    }
    await user.save();

    res.json({
      added,
      wishlist: user.wishlist.map((id: unknown) => String(id)),
    });
  })
);

// Admin: Customer list
router.get(
  '/admin/customers',
  requirePermission('customers:read'),
  asyncHandler(async (req, res) => {
    const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));

    const filter: Record<string, unknown> = { role: 'customer' };
    if (search) {
      const escapedSearch = escapeRegex(search);
      filter.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } },
        { phone: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    const [customers, total] = await Promise.all([
      UserModel.find(filter)
        .select('name email phone isActive emailVerified authProvider createdAt lastLoginAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      UserModel.countDocuments(filter),
    ]);

    res.json({ customers, total, page, totalPages: Math.ceil(total / limit) });
  })
);

// Admin: Staff RBAC management
router.get(
  '/admin/staff',
  requirePermission('staff:manage'),
  asyncHandler(async (_req, res) => {
    const staff = await UserModel.find({ role: { $ne: 'customer' } })
      .select('name email phone role isActive createdAt lastLoginAt')
      .sort({ createdAt: -1 });
    res.json({ staff });
  })
);

router.post(
  '/admin/staff',
  requirePermission('staff:manage'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const schema = z.object({
      name: z.string().trim().min(2).max(100),
      email: z.string().trim().email(),
      phone: z.string().trim().max(25).optional(),
      password: z.string().min(8).max(100),
      role: z.enum(STAFF_ROLES as [StaffRole, ...StaffRole[]]),
    });
    const parsed = schema.parse(req.body);
    const passwordHash = await bcrypt.hash(parsed.password, 12);

    const staffUser = await UserModel.create({
      name: parsed.name,
      email: parsed.email.toLowerCase(),
      phone: parsed.phone,
      passwordHash,
      role: parsed.role,
      emailVerified: true,
      isActive: true,
    });

    await recordAuditLog({
      actorId: req.user!._id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'CREATE_STAFF',
      resourceType: 'User',
      resourceId: String(staffUser._id),
      details: { role: staffUser.role, email: staffUser.email },
      ipAddress: req.ip,
    });

    res.status(201).json({
      staff: {
        id: String(staffUser._id),
        name: staffUser.name,
        email: staffUser.email,
        role: staffUser.role,
        isActive: staffUser.isActive,
      },
    });
  })
);

router.patch(
  '/admin/staff/:staffId',
  requirePermission('staff:manage'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const schema = z.object({
      role: z.enum(STAFF_ROLES as [StaffRole, ...StaffRole[]]).optional(),
      isActive: z.boolean().optional(),
    });
    const parsed = schema.parse(req.body);

    const target = await UserModel.findById(req.params.staffId);
    if (!target) {
      res.status(404).json({ error: 'Staff member not found' });
      return;
    }

    if (String(target._id) === String(req.user!._id) && parsed.isActive === false) {
      res.status(400).json({ error: 'You cannot deactivate your own Super Admin account.' });
      return;
    }

    const losingSuperAdmin =
      target.role === 'super_admin' &&
      target.isActive &&
      ((parsed.role && parsed.role !== 'super_admin') || parsed.isActive === false);
    if (losingSuperAdmin) {
      const otherActiveSuperAdmin = await UserModel.exists({
        _id: { $ne: target._id },
        role: 'super_admin',
        isActive: true,
      });
      if (!otherActiveSuperAdmin) {
        res.status(409).json({
          error: 'At least one active Super Admin account must remain.',
        });
        return;
      }
    }

    if (parsed.role) target.role = parsed.role;
    if (parsed.isActive !== undefined) target.isActive = parsed.isActive;
    await target.save();

    await recordAuditLog({
      actorId: req.user!._id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'UPDATE_STAFF_PERMISSIONS',
      resourceType: 'User',
      resourceId: String(target._id),
      details: parsed,
      ipAddress: req.ip,
    });

    res.json({
      staff: {
        id: String(target._id),
        name: target.name,
        email: target.email,
        role: target.role,
        isActive: target.isActive,
      },
    });
  })
);

export default router;
