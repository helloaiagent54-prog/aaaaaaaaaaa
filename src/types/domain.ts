import type { StaffRole } from '../../shared/rbac.ts';
import type { OrderLifecycleStatus, PaymentState, FulfillmentState } from '../../shared/orderStateMachine.ts';

export interface MediaAsset {
  publicId: string;
  url: string;
  width?: number;
  height?: number;
  format?: string;
  alt?: string;
}

export interface SavedAddress {
  _id: string;
  label: string;
  recipientName: string;
  phone: string;
  divisionCode: string;
  divisionName: string;
  districtCode: string;
  districtName: string;
  upazilaCode: string;
  upazilaName: string;
  areaCode: string;
  areaName: string;
  zone: 'dhaka_metro' | 'dhaka_suburb' | 'outside_dhaka';
  houseAddress: string;
  roadStreet?: string;
  landmark?: string;
  deliveryInstructions?: string;
  isDefault: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  emailVerified: boolean;
  authProvider: 'local' | 'google' | 'facebook';
  avatarUrl: string;
  savedAddresses: SavedAddress[];
  wishlist: string[];
  notificationPreferences: {
    orderUpdates: boolean;
    promotions: boolean;
    backInStock: boolean;
  };
}

export interface Category {
  _id: string;
  name: string;
  nameBn?: string;
  slug: string;
  description?: string;
  parentId?: string | null;
  image?: MediaAsset;
  displayOrder: number;
  isActive: boolean;
}

export interface Brand {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: MediaAsset;
  isActive: boolean;
}

export interface ProductVariant {
  _id: string;
  sku: string;
  title: string;
  options: Record<string, string>;
  price?: number | null;
  stockOnHand: number;
  reservedStock: number;
  lowStockThreshold: number;
  image?: MediaAsset;
  isActive: boolean;
}

export interface Product {
  _id: string;
  name: string;
  nameBn?: string;
  slug: string;
  sku: string;
  brandId?: Brand | null;
  categoryId: Category;
  subcategoryId?: Category | null;
  categoryDomain: 'electronics' | 'beauty' | 'books' | 'home_lifestyle' | 'fashion' | 'general';
  shortDescription?: string;
  description: string;
  features: string[];
  attributes: Record<string, string>;
  bilingualKeywords: string[];
  basePrice: number;
  salePrice?: number | null;
  flashSalePrice?: number | null;
  flashSaleStart?: string | null;
  flashSaleEnd?: string | null;
  effectivePrice: number;
  originalPrice: number | null;
  discountPercent: number;
  isFlashSaleActive: boolean;
  stockOnHand: number;
  reservedStock: number;
  availableStock: number;
  lowStockThreshold: number;
  variants: ProductVariant[];
  images: MediaAsset[];
  status: 'draft' | 'published' | 'archived';
  isFeatured: boolean;
  warrantyInfo?: string;
  returnPolicyInfo?: string;
  codEligible: boolean;
  ratingAverage: number;
  ratingCount: number;
  salesCount: number;
  seoTitle?: string;
  seoDescription?: string;
}

export interface CartItem {
  productId: string;
  variantId: string | null;
  slug: string;
  sku: string;
  name: string;
  variantTitle: string | null;
  selectedOptions: Record<string, string>;
  imageUrl: string;
  quantity: number;
  unitPrice: number;
  originalPrice: number | null;
  availableStock: number;
  categoryId?: string;
  codEligible?: boolean;
  staleWarning?: string;
}

export interface HomepageConfig {
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
    isActive: boolean;
  }>;
  trustPoints: Array<{ title: string; subtitle: string; icon: string }>;
  dualBanners: Array<{
    eyebrow: string;
    title: string;
    ctaText: string;
    ctaLink: string;
    imageUrl: string;
    theme: 'ice' | 'blush';
  }>;
  sections: Array<{ id: string; label: string; enabled: boolean; order: number }>;
  status: 'draft' | 'published';
}

export interface PromotionalPlacement {
  _id: string;
  title: string;
  subtitle?: string;
  ctaText?: string;
  destinationUrl: string;
  altText: string;
  imageUrl: string;
  placementSlot: 'homepage_mid_banner' | 'homepage_sidebar' | 'top_strip';
  layoutStyle: 'dark_emerald_banner' | 'clean_card';
  isEnabled: boolean;
  status: 'draft' | 'published';
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface StoreSettings {
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
}

export interface OrderRecord {
  _id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: Array<{
    productId: string;
    variantId?: string | null;
    sku: string;
    productName: string;
    variantTitle?: string;
    selectedOptions?: Record<string, string>;
    imageUrl?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  shippingAddress: SavedAddress;
  deliveryMethod: 'standard' | 'express';
  paymentMethod: 'cod' | 'sslcommerz';
  orderStatus: OrderLifecycleStatus;
  paymentStatus: PaymentState;
  fulfillmentStatus: FulfillmentState;
  subtotal: number;
  discountAmount: number;
  couponCode?: string | null;
  shippingCharge: number;
  taxAmount: number;
  totalAmount: number;
  trackingNumber?: string;
  courierName?: string;
  customerNote?: string;
  staffNotes?: Array<{ note: string; actorName: string; createdAt: string }>;
  statusHistory: Array<{
    status: OrderLifecycleStatus;
    paymentStatus?: PaymentState;
    fulfillmentStatus?: FulfillmentState;
    note?: string;
    createdAt: string;
  }>;
  createdAt: string;
}

export interface ReviewItem {
  _id: string;
  productId: string | { _id: string; name: string; slug: string; sku?: string };
  userId: string;
  userName: string;
  rating: number;
  title?: string;
  comment: string;
  verifiedPurchase: boolean;
  status: 'pending' | 'approved' | 'rejected';
  moderationReason?: string;
  helpfulVoterIds: string[];
  reports?: Array<{ reason: string; createdAt: string }>;
  createdAt: string;
}
