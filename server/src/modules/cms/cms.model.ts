import mongoose, { Schema, type Document } from 'mongoose';

export interface IHomepageSectionConfig {
  id: string;
  label: string;
  enabled: boolean;
  order: number;
}

export interface IHomepageConfig extends Document {
  key: 'primary';
  announcementItems: Array<{ icon: string; text: string }>;
  announcementPhone: string;
  heroSlides: Array<{
    badge: string;
    headlinePrefix: string;
    headlineHighlight: string;
    headlineSuffix: string;
    subtitle: string;
    ctaText: string;
    ctaLink: string;
    imageUrl: string;
    imagePublicId?: string;
    isActive: boolean;
  }>;
  trustPoints: Array<{ title: string; subtitle: string; icon: string }>;
  dualBanners: Array<{
    eyebrow: string;
    title: string;
    ctaText: string;
    ctaLink: string;
    imageUrl: string;
    imagePublicId?: string;
    theme: 'ice' | 'blush';
  }>;
  sections: IHomepageSectionConfig[];
  status: 'draft' | 'published';
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const HomepageConfigSchema = new Schema<IHomepageConfig>(
  {
    key: { type: String, default: 'primary', unique: true },
    announcementItems: [
      {
        icon: { type: String, required: true },
        text: { type: String, required: true },
      },
    ],
    announcementPhone: { type: String, default: '' },
    heroSlides: [
      {
        badge: { type: String, default: '' },
        headlinePrefix: { type: String, required: true },
        headlineHighlight: { type: String, default: '' },
        headlineSuffix: { type: String, default: '' },
        subtitle: { type: String, default: '' },
        ctaText: { type: String, default: 'Shop Now' },
        ctaLink: { type: String, default: '/shop' },
        imageUrl: { type: String, required: true },
        imagePublicId: { type: String },
        isActive: { type: Boolean, default: true },
      },
    ],
    trustPoints: [
      {
        title: { type: String, required: true },
        subtitle: { type: String, required: true },
        icon: { type: String, required: true },
      },
    ],
    dualBanners: [
      {
        eyebrow: { type: String, default: '' },
        title: { type: String, required: true },
        ctaText: { type: String, default: 'Shop Now' },
        ctaLink: { type: String, default: '/shop' },
        imageUrl: { type: String, required: true },
        imagePublicId: { type: String },
        theme: { type: String, enum: ['ice', 'blush'], default: 'ice' },
      },
    ],
    sections: [
      {
        id: { type: String, required: true },
        label: { type: String, required: true },
        enabled: { type: Boolean, default: true },
        order: { type: Number, required: true },
      },
    ],
    status: { type: String, enum: ['draft', 'published'], default: 'published' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const HomepageConfigModel =
  mongoose.models.HomepageConfig ||
  mongoose.model<IHomepageConfig>('HomepageConfig', HomepageConfigSchema);

export interface IPromotionalPlacement extends Document {
  title: string;
  subtitle?: string;
  ctaText?: string;
  destinationUrl: string;
  altText: string;
  imageUrl: string;
  imagePublicId?: string;
  placementSlot: 'homepage_mid_banner' | 'homepage_sidebar' | 'top_strip';
  layoutStyle: 'dark_emerald_banner' | 'clean_card';
  isEnabled: boolean;
  status: 'draft' | 'published';
  startsAt?: Date | null;
  endsAt?: Date | null;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PromotionalPlacementSchema = new Schema<IPromotionalPlacement>(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    subtitle: { type: String, trim: true, maxlength: 220 },
    ctaText: { type: String, trim: true, maxlength: 40 },
    destinationUrl: { type: String, required: true, trim: true },
    altText: { type: String, required: true, trim: true, maxlength: 180 },
    imageUrl: { type: String, required: true },
    imagePublicId: { type: String },
    placementSlot: {
      type: String,
      enum: ['homepage_mid_banner', 'homepage_sidebar', 'top_strip'],
      default: 'homepage_mid_banner',
    },
    layoutStyle: {
      type: String,
      enum: ['dark_emerald_banner', 'clean_card'],
      default: 'dark_emerald_banner',
    },
    isEnabled: { type: Boolean, default: false, index: true },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const PromotionalPlacementModel =
  mongoose.models.PromotionalPlacement ||
  mongoose.model<IPromotionalPlacement>('PromotionalPlacement', PromotionalPlacementSchema);

export interface IStoreSettings extends Document {
  key: 'primary';
  storeName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  businessAddress: string;
  socialLinks: {
    whatsapp?: string;
    messenger?: string;
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };
  shipping: {
    dhakaMetroCharge: number;
    dhakaSuburbCharge: number;
    outsideDhakaCharge: number;
    freeShippingThreshold: number;
    expressSurcharge: number;
  };
  policies: {
    returnPolicy: string;
    shippingPolicy: string;
    privacyPolicy: string;
    termsAndConditions: string;
    aboutUs: string;
  };
  seoDefaults: {
    titleSuffix: string;
    defaultDescription: string;
  };
  adsense: {
    enabled: boolean;
    publisherId?: string;
    adSlotId?: string;
  };
  updatedAt: Date;
}

const StoreSettingsSchema = new Schema<IStoreSettings>(
  {
    key: { type: String, default: 'primary', unique: true },
    storeName: { type: String, default: 'NOVARA COMMERCE' },
    tagline: { type: String, default: 'Shop Smart, Live Better' },
    supportEmail: { type: String, default: '' },
    supportPhone: { type: String, default: '' },
    businessAddress: { type: String, default: 'Dhaka, Bangladesh' },
    socialLinks: {
      whatsapp: { type: String, default: '' },
      messenger: { type: String, default: '' },
      facebook: { type: String, default: '' },
      instagram: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      youtube: { type: String, default: '' },
    },
    shipping: {
      dhakaMetroCharge: { type: Number, default: 60 },
      dhakaSuburbCharge: { type: Number, default: 90 },
      outsideDhakaCharge: { type: Number, default: 130 },
      freeShippingThreshold: { type: Number, default: 999 },
      expressSurcharge: { type: Number, default: 80 },
    },
    policies: {
      returnPolicy: {
        type: String,
        default: 'Customers in Bangladesh may request a return or replacement within 7 days of delivery for eligible unused items in original packaging.',
      },
      shippingPolicy: {
        type: String,
        default: 'Standard delivery across Dhaka takes 1-2 business days and 2-5 business days nationwide. Free standard shipping applies on eligible orders over ৳999.',
      },
      privacyPolicy: {
        type: String,
        default: 'NOVARA COMMERCE collects only the personal and delivery details required to fulfill orders and provide requested customer support.',
      },
      termsAndConditions: {
        type: String,
        default: 'All prices are displayed in BDT (৳). Orders are subject to stock verification and server-side pricing confirmation.',
      },
      aboutUs: {
        type: String,
        default: 'NOVARA COMMERCE is a single-vendor retail storefront serving customers across Bangladesh with curated electronics, fashion, books, beauty, and home essentials.',
      },
    },
    seoDefaults: {
      titleSuffix: { type: String, default: 'NOVARA COMMERCE' },
      defaultDescription: {
        type: String,
        default: 'Shop electronics, fashion, books, beauty, and home essentials across Bangladesh at NOVARA COMMERCE.',
      },
    },
    adsense: {
      enabled: { type: Boolean, default: false },
      publisherId: { type: String, default: '' },
      adSlotId: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

export const StoreSettingsModel =
  mongoose.models.StoreSettings || mongoose.model<IStoreSettings>('StoreSettings', StoreSettingsSchema);
