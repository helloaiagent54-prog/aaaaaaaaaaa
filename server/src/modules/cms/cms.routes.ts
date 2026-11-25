import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { env } from '../../config/env.ts';
import { isSafeDestinationUrl } from '../../../../shared/security.ts';
import { requireDatabase } from '../../database/connection.ts';
import {
  requireAuth,
  requirePermission,
  type AuthenticatedRequest,
} from '../../middleware/auth.middleware.ts';
import { asyncHandler } from '../../middleware/error.middleware.ts';
import { recordAuditLog } from '../../services/audit.service.ts';
import {
  destroyCloudinaryAssetIfUnused,
  uploadBufferToCloudinary,
} from '../../services/cloudinary.service.ts';
import {
  HomepageConfigModel,
  PromotionalPlacementModel,
  StoreSettingsModel,
} from './cms.model.ts';

const router = Router();
router.use(requireDatabase);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 },
});

export async function ensureDefaultCmsDocuments() {
  let homepage = await HomepageConfigModel.findOne({ key: 'primary' });
  if (!homepage) {
    homepage = await HomepageConfigModel.create({
      key: 'primary',
      announcementItems: [
        { icon: 'truck', text: 'Free Shipping on Orders Over ৳999' },
        { icon: 'rotate', text: '7 Days Easy Return' },
        { icon: 'shield', text: 'Secure Payment' },
      ],
      announcementPhone: '+880 1700 000000',
      heroSlides: [
        {
          badge: 'Big Savings, Big Happiness',
          headlinePrefix: 'Smart Shopping',
          headlineHighlight: 'Bigger',
          headlineSuffix: 'Savings!',
          subtitle: 'Up to 60% Off on Top Brands Across Bangladesh',
          ctaText: 'Shop Now',
          ctaLink: '/shop',
          imageUrl: '/src/assets/images/hero_shopper_bags_1795621229978.jpg',
          isActive: true,
        },
        {
          badge: 'Authentic Electronics & Gadgets',
          headlinePrefix: 'Upgrade Your',
          headlineHighlight: 'Tech',
          headlineSuffix: 'Setup Today',
          subtitle: 'Official Warranty & Cash on Delivery Nationwide',
          ctaText: 'Explore Electronics',
          ctaLink: '/category/electronics',
          imageUrl: '/src/assets/images/promo_tech_laptops_1795621230990.jpg',
          isActive: true,
        },
      ],
      trustPoints: [
        { title: 'Premium Quality', subtitle: 'Best Products', icon: 'gem' },
        { title: 'Secure Payment', subtitle: '100% Secure', icon: 'shield' },
        { title: 'Easy Return', subtitle: '7 Days Return', icon: 'rotate' },
        { title: '24/7 Support', subtitle: 'Always Here', icon: 'headphones' },
      ],
      dualBanners: [
        {
          eyebrow: 'Up to',
          title: '70% OFF on Electronics',
          ctaText: 'Shop Now',
          ctaLink: '/category/electronics',
          imageUrl: '/src/assets/images/promo_electronics_bundle_1795621230553.jpg',
          theme: 'ice',
        },
        {
          eyebrow: 'Flat',
          title: '50% OFF on Fashion Collection',
          ctaText: 'Shop Now',
          ctaLink: '/category/fashion',
          imageUrl: '/src/assets/images/promo_fashion_bundle_1795621230765.jpg',
          theme: 'blush',
        },
      ],
      sections: [
        { id: 'hero', label: 'Hero Campaign', enabled: true, order: 1 },
        { id: 'categories', label: 'Shop by Category', enabled: true, order: 2 },
        { id: 'dual_banners', label: 'Dual Category Banners', enabled: true, order: 3 },
        { id: 'featured_products', label: 'Featured Products', enabled: true, order: 4 },
        { id: 'promo_placement', label: 'Promotional Ad Placement', enabled: true, order: 5 },
        { id: 'best_sellers', label: 'Best Sellers', enabled: true, order: 6 },
        { id: 'happy_clients', label: 'Authentic Customer Reviews', enabled: true, order: 7 },
        { id: 'newsletter', label: 'Newsletter Subscription', enabled: true, order: 8 },
      ],
      status: 'published',
    });
  }

  let settings = await StoreSettingsModel.findOne({ key: 'primary' });
  if (!settings) {
    settings = await StoreSettingsModel.create({ key: 'primary' });
  }

  return { homepage, settings };
}

// Public: Homepage Configuration + Active Valid Promotional Placements + Public Store Settings
router.get(
  '/public/homepage',
  asyncHandler(async (_req, res) => {
    const { homepage, settings } = await ensureDefaultCmsDocuments();
    const now = new Date();

    const activePromos = await PromotionalPlacementModel.find({
      isEnabled: true,
      status: 'published',
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
      ],
    })
      .sort({ updatedAt: -1 })
      .lean();

    res.json({
      homepage: homepage.status === 'published' ? homepage : null,
      activePromotions: activePromos,
      storeSettings: {
        storeName: settings.storeName,
        tagline: settings.tagline,
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone,
        businessAddress: settings.businessAddress,
        socialLinks: settings.socialLinks,
        shipping: settings.shipping,
        policies: settings.policies,
        seoDefaults: settings.seoDefaults,
        adsense: settings.adsense,
      },
    });
  })
);

router.get(
  '/public/settings',
  asyncHandler(async (_req, res) => {
    const { settings } = await ensureDefaultCmsDocuments();
    res.json({ settings });
  })
);

// ADMIN: Cloudinary Image Upload
router.get(
  '/admin/cloudinary/status',
  requireAuth,
  requirePermission('catalog:write'),
  (_req, res) => {
    res.json({
      configured: env.cloudinary.isConfigured,
      cloudName: env.cloudinary.cloudName || null,
    });
  }
);

router.post(
  '/admin/upload',
  requireAuth,
  requirePermission('catalog:write'),
  upload.single('file'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'No image file provided.' });
      return;
    }

    const folder = z
      .enum(['products', 'categories', 'brands', 'cms', 'promotions'])
      .catch('products')
      .parse(req.body?.folder);
    const alt = typeof req.body?.alt === 'string' ? req.body.alt.trim().slice(0, 160) : '';

    const asset = await uploadBufferToCloudinary(req.file.buffer, folder, alt);

    await recordAuditLog({
      actorId: req.user!._id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'CLOUDINARY_UPLOAD',
      resourceType: 'MediaAsset',
      resourceId: asset.publicId,
      details: { folder, url: asset.url },
      ipAddress: req.ip,
    });

    res.status(201).json({ asset });
  })
);

// ADMIN: Homepage CMS Config
router.get(
  '/admin/homepage',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (_req, res) => {
    const { homepage } = await ensureDefaultCmsDocuments();
    res.json({ homepage });
  })
);

router.put(
  '/admin/homepage',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const schema = z.object({
      announcementItems: z.array(z.object({ icon: z.string(), text: z.string().min(1) })).optional(),
      announcementPhone: z.string().max(40).optional(),
      heroSlides: z
        .array(
          z.object({
            badge: z.string().default(''),
            headlinePrefix: z.string().min(1),
            headlineHighlight: z.string().default(''),
            headlineSuffix: z.string().default(''),
            subtitle: z.string().default(''),
            ctaText: z.string().min(1),
            ctaLink: z.string().trim().min(1).refine((v) => isSafeDestinationUrl(v), 'Unsafe or invalid CTA URL'),
            imageUrl: z.string().min(1),
            imagePublicId: z.string().optional(),
            isActive: z.boolean().default(true),
          })
        )
        .optional(),
      trustPoints: z
        .array(z.object({ title: z.string(), subtitle: z.string(), icon: z.string() }))
        .optional(),
      dualBanners: z
        .array(
          z.object({
            eyebrow: z.string().default(''),
            title: z.string().min(1),
            ctaText: z.string().min(1),
            ctaLink: z.string().trim().min(1).refine((v) => isSafeDestinationUrl(v), 'Unsafe or invalid banner URL'),
            imageUrl: z.string().min(1),
            imagePublicId: z.string().optional(),
            theme: z.enum(['ice', 'blush']).default('ice'),
          })
        )
        .optional(),
      sections: z
        .array(
          z.object({
            id: z.string(),
            label: z.string(),
            enabled: z.boolean(),
            order: z.number().int(),
          })
        )
        .optional(),
      status: z.enum(['draft', 'published']).optional(),
    });

    const parsed = schema.parse(req.body);
    const { homepage } = await ensureDefaultCmsDocuments();

    Object.assign(homepage, parsed, { updatedBy: req.user!._id });
    await homepage.save();

    await recordAuditLog({
      actorId: req.user!._id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'UPDATE_HOMEPAGE_CMS',
      resourceType: 'HomepageConfig',
      resourceId: String(homepage._id),
      details: { status: homepage.status },
      ipAddress: req.ip,
    });

    res.json({ homepage });
  })
);

// ADMIN: Promotional Ad Placements
router.get(
  '/admin/promotions',
  requireAuth,
  requirePermission('ads:write'),
  asyncHandler(async (_req, res) => {
    const promotions = await PromotionalPlacementModel.find().sort({ updatedAt: -1 });
    res.json({ promotions });
  })
);

const promoSchema = z.object({
  title: z.string().trim().min(2).max(140),
  subtitle: z.string().trim().max(220).optional(),
  ctaText: z.string().trim().max(40).optional(),
  destinationUrl: z.string().trim().min(1).refine(isSafeDestinationUrl, 'Unsafe or invalid URL'),
  altText: z.string().trim().min(2).max(180),
  imageUrl: z.string().min(1),
  imagePublicId: z.string().optional(),
  placementSlot: z.enum(['homepage_mid_banner', 'homepage_sidebar', 'top_strip']).default('homepage_mid_banner'),
  layoutStyle: z.enum(['dark_emerald_banner', 'clean_card']).default('dark_emerald_banner'),
  isEnabled: z.boolean().default(false),
  status: z.enum(['draft', 'published']).default('draft'),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
});

router.post(
  '/admin/promotions',
  requireAuth,
  requirePermission('ads:write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = promoSchema.parse(req.body);
    const promotion = await PromotionalPlacementModel.create({
      ...parsed,
      startsAt: parsed.startsAt ? new Date(parsed.startsAt) : null,
      endsAt: parsed.endsAt ? new Date(parsed.endsAt) : null,
      updatedBy: req.user!._id,
    });

    await recordAuditLog({
      actorId: req.user!._id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'CREATE_PROMO_PLACEMENT',
      resourceType: 'PromotionalPlacement',
      resourceId: String(promotion._id),
      details: { title: promotion.title, isEnabled: promotion.isEnabled, status: promotion.status },
      ipAddress: req.ip,
    });

    res.status(201).json({ promotion });
  })
);

router.patch(
  '/admin/promotions/:id',
  requireAuth,
  requirePermission('ads:write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = promoSchema.partial().parse(req.body);
    const existing = await PromotionalPlacementModel.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Promotional placement not found' });
      return;
    }

    const oldPublicId = existing.imagePublicId;
    Object.assign(existing, {
      ...parsed,
      startsAt:
        parsed.startsAt !== undefined
          ? parsed.startsAt
            ? new Date(parsed.startsAt)
            : null
          : existing.startsAt,
      endsAt:
        parsed.endsAt !== undefined ? (parsed.endsAt ? new Date(parsed.endsAt) : null) : existing.endsAt,
      updatedBy: req.user!._id,
    });
    await existing.save();

    if (oldPublicId && parsed.imagePublicId && parsed.imagePublicId !== oldPublicId) {
      void destroyCloudinaryAssetIfUnused(oldPublicId);
    }

    res.json({ promotion: existing });
  })
);

router.delete(
  '/admin/promotions/:id',
  requireAuth,
  requirePermission('ads:write'),
  asyncHandler(async (req, res) => {
    const deleted = await PromotionalPlacementModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Promotional placement not found' });
      return;
    }
    if (deleted.imagePublicId) {
      void destroyCloudinaryAssetIfUnused(deleted.imagePublicId);
    }
    res.json({ ok: true });
  })
);

// ADMIN: Store Settings
router.get(
  '/admin/settings',
  requireAuth,
  requirePermission('settings:write'),
  asyncHandler(async (_req, res) => {
    const { settings } = await ensureDefaultCmsDocuments();
    res.json({ settings });
  })
);

router.put(
  '/admin/settings',
  requireAuth,
  requirePermission('settings:write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const schema = z.object({
      storeName: z.string().trim().min(2).max(100).optional(),
      tagline: z.string().trim().max(140).optional(),
      supportEmail: z.string().trim().email().or(z.literal('')).optional(),
      supportPhone: z.string().trim().max(30).optional(),
      businessAddress: z.string().trim().max(240).optional(),
      socialLinks: z
        .object({
          whatsapp: z.string().trim().refine((v) => isSafeDestinationUrl(v, { allowRelative: false, allowEmpty: true }), 'Invalid social URL').optional(),
          messenger: z.string().trim().refine((v) => isSafeDestinationUrl(v, { allowRelative: false, allowEmpty: true }), 'Invalid social URL').optional(),
          facebook: z.string().trim().refine((v) => isSafeDestinationUrl(v, { allowRelative: false, allowEmpty: true }), 'Invalid social URL').optional(),
          instagram: z.string().trim().refine((v) => isSafeDestinationUrl(v, { allowRelative: false, allowEmpty: true }), 'Invalid social URL').optional(),
          linkedin: z.string().trim().refine((v) => isSafeDestinationUrl(v, { allowRelative: false, allowEmpty: true }), 'Invalid social URL').optional(),
          youtube: z.string().trim().refine((v) => isSafeDestinationUrl(v, { allowRelative: false, allowEmpty: true }), 'Invalid social URL').optional(),
        })
        .optional(),
      shipping: z
        .object({
          dhakaMetroCharge: z.number().min(0),
          dhakaSuburbCharge: z.number().min(0),
          outsideDhakaCharge: z.number().min(0),
          freeShippingThreshold: z.number().min(0),
          expressSurcharge: z.number().min(0),
        })
        .optional(),
      policies: z
        .object({
          returnPolicy: z.string(),
          shippingPolicy: z.string(),
          privacyPolicy: z.string(),
          termsAndConditions: z.string(),
          aboutUs: z.string(),
        })
        .optional(),
      seoDefaults: z
        .object({
          titleSuffix: z.string(),
          defaultDescription: z.string(),
        })
        .optional(),
      adsense: z
        .object({
          enabled: z.boolean(),
          publisherId: z.string().optional(),
          adSlotId: z.string().optional(),
        })
        .optional(),
    });

    const parsed = schema.parse(req.body);
    const { settings } = await ensureDefaultCmsDocuments();
    Object.assign(settings, parsed);
    await settings.save();

    await recordAuditLog({
      actorId: req.user!._id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'UPDATE_STORE_SETTINGS',
      resourceType: 'StoreSettings',
      resourceId: String(settings._id),
      ipAddress: req.ip,
    });

    res.json({ settings });
  })
);

export default router;
