import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Gem,
  Headphones,
  Mail,
  Plus,
  Quote,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { sanitizeHref } from '../../shared/security.ts';
import { useAppDispatch } from '../app/hooks.ts';
import { pushToast } from '../features/toast/toastSlice.ts';
import { apiRequest, ApiError, formatBdt } from '../lib/api.ts';
import type {
  Brand,
  Category,
  HomepageConfig,
  Product,
  PromotionalPlacement,
  ReviewItem,
} from '../types/domain.ts';
import { ProductCard } from '../components/ui/ProductCard.tsx';
import { SafeImage } from '../components/ui/SafeImage.tsx';
import { SeoHead } from '../components/ui/SeoHead.tsx';

interface HomePageProps {
  categories: Category[];
  homepage: HomepageConfig | null;
  activePromotions: PromotionalPlacement[];
  dbUnavailable: boolean;
}

export function HomePage({
  categories,
  homepage,
  activePromotions,
  dbUnavailable,
}: HomePageProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [heroIndex, setHeroIndex] = useState(0);
  const [featuredTab, setFeaturedTab] = useState<
    'all' | 'best_seller' | 'new_arrivals' | 'top_rated' | 'on_sale'
  >('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [featuredReviews, setFeaturedReviews] = useState<ReviewItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Sidebar quick filters
  const [maxPrice, setMaxPrice] = useState<number>(150000);
  const [selectedBrandSlug, setSelectedBrandSlug] = useState<string>('');
  const [minRating, setMinRating] = useState<number | null>(null);
  const [openAccordion, setOpenAccordion] = useState<string>('brand');

  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterConsent, setNewsletterConsent] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  // Review carousel offset
  const [reviewOffset, setReviewOffset] = useState(0);

  const heroSlides = useMemo(() => {
    const slides = homepage?.heroSlides?.filter((s) => s.isActive);
    if (slides && slides.length > 0) return slides;
    return [
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
    ];
  }, [homepage]);

  const activeSlide = heroSlides[heroIndex % heroSlides.length] || heroSlides[0];

  const trustPoints = homepage?.trustPoints?.length
    ? homepage.trustPoints
    : [
        { title: 'Premium Quality', subtitle: 'Best Products', icon: 'gem' },
        { title: 'Secure Payment', subtitle: '100% Secure', icon: 'shield' },
        { title: 'Easy Return', subtitle: '7 Days Return', icon: 'rotate' },
        { title: '24/7 Support', subtitle: 'Always Here', icon: 'headphones' },
      ];

  const dualBanners = homepage?.dualBanners?.length
    ? homepage.dualBanners
    : [
        {
          eyebrow: 'Up to',
          title: '70% OFF on Electronics',
          ctaText: 'Shop Now',
          ctaLink: '/category/smartphones',
          imageUrl: '/src/assets/images/promo_electronics_bundle_1795621230553.jpg',
          theme: 'ice' as const,
        },
        {
          eyebrow: 'Flat',
          title: '50% OFF on Fashion Collection',
          ctaText: 'Shop Now',
          ctaLink: '/category/fashion',
          imageUrl: '/src/assets/images/promo_fashion_bundle_1795621230765.jpg',
          theme: 'blush' as const,
        },
      ];

  const fetchFilteredProducts = async () => {
    setLoadingProducts(true);
    try {
      const params = new URLSearchParams({
        limit: '10',
        tab: featuredTab,
        maxPrice: String(maxPrice),
      });
      if (selectedBrandSlug) params.set('brand', selectedBrandSlug);
      if (minRating) params.set('minRating', String(minRating));

      const res = await apiRequest<{ products: Product[] }>(`/api/catalog/products?${params}`);
      setProducts(res.products || []);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 503)) {
        // Non-blocking error state
      }
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (dbUnavailable) return;
    void fetchFilteredProducts();
  }, [featuredTab, selectedBrandSlug, minRating, dbUnavailable]);

  useEffect(() => {
    if (dbUnavailable) return;
    apiRequest<{ brands: Brand[] }>('/api/catalog/brands')
      .then((r) => setBrands(r.brands || []))
      .catch(() => {});

    apiRequest<{ products: Product[] }>('/api/catalog/products?sort=best_selling&tab=best_seller&limit=5')
      .then((r) => setBestSellers(r.products || []))
      .catch(() => {});

    apiRequest<{ reviews: ReviewItem[] }>('/api/reviews/featured')
      .then((r) => setFeaturedReviews(r.reviews || []))
      .catch(() => {});
  }, [dbUnavailable]);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setSubscribing(true);
    try {
      const res = await apiRequest<{ message: string }>('/api/support/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email: newsletterEmail, consent: newsletterConsent }),
      });
      dispatch(pushToast({ variant: 'success', message: res.message }));
      setNewsletterEmail('');
    } catch (err) {
      dispatch(
        pushToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Unable to subscribe right now.',
        })
      );
    } finally {
      setSubscribing(false);
    }
  };

  const sectionEnabled = (id: string) => {
    const found = homepage?.sections?.find((s) => s.id === id);
    return found ? found.enabled : true;
  };

  const midPromo = activePromotions.find((p) => p.placementSlot === 'homepage_mid_banner');
  const displayCategories = categories.filter((c) => !c.parentId).slice(0, 8);
  const visibleReviews = featuredReviews.slice(reviewOffset, reviewOffset + 3);

  return (
    <div className="bg-slate-50/70">
      <SeoHead
        title="NOVARA COMMERCE – Smart Shopping, Bigger Savings Across Bangladesh"
        description="Shop authentic electronics, fashion, books, beauty, and home essentials across Bangladesh with Cash on Delivery and 7-day easy returns."
      />

      {dbUnavailable && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-950">
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>MongoDB Atlas connection required:</strong> Configure <code className="font-mono">MONGODB_URI</code> to load live catalog products, accounts, and orders.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 1. HERO CAMPAIGN BANNER (Matches Reference Image) */}
      {sectionEnabled('hero') && (
        <section className="relative overflow-hidden bg-gradient-to-br from-[#06381c] via-[#0d622e] to-[#178d40] text-white">
          <div className="max-w-7xl mx-auto px-4 py-8 lg:py-10 relative">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Left Copy Column */}
              <div className="lg:col-span-5 z-10 space-y-4">
                {activeSlide.badge && (
                  <span className="inline-block px-3.5 py-1 rounded-full bg-[#16A34A] text-white text-xs font-semibold shadow-xs">
                    {activeSlide.badge}
                  </span>
                )}
                <h1 className="text-3xl sm:text-4xl lg:text-[2.85rem] font-extrabold leading-[1.12] tracking-tight text-balance">
                  {activeSlide.headlinePrefix}{' '}
                  {activeSlide.headlineHighlight && (
                    <span className="text-[#A3E635]">{activeSlide.headlineHighlight}</span>
                  )}{' '}
                  {activeSlide.headlineSuffix}
                </h1>
                <p className="text-sm sm:text-base text-emerald-50/90 font-medium">
                  {activeSlide.subtitle}
                </p>
                <div className="pt-1">
                  <Link
                    to={activeSlide.ctaLink || '/shop'}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#A3E635] hover:bg-lime-300 text-slate-950 text-sm font-bold transition-colors shadow-md"
                  >
                    <span>{activeSlide.ctaText || 'Shop Now'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Center Hero Subject Image */}
              <div className="lg:col-span-4 flex justify-center">
                <div className="relative w-full max-w-md aspect-[4/3] rounded-3xl overflow-hidden shadow-xl">
                  <SafeImage
                    src={activeSlide.imageUrl}
                    alt={activeSlide.headlinePrefix}
                    loading="eager"
                    className="w-full h-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a5428]/55 via-transparent to-[#0d622e]/45" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#06381c]/50 via-transparent to-transparent" />
                </div>
              </div>

              {/* Right 4 Glassmorphic Trust Cards */}
              <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-1 gap-2.5">
                {trustPoints.slice(0, 4).map((tp, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 sm:gap-3 px-2.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-slate-950/35 backdrop-blur-sm border border-white/10"
                  >
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#A3E635]/15 text-[#A3E635] flex items-center justify-center shrink-0">
                      {tp.icon === 'gem' && <Gem className="w-4 h-4" />}
                      {tp.icon === 'shield' && <ShieldCheck className="w-4 h-4" />}
                      {tp.icon === 'rotate' && <RotateCcw className="w-4 h-4" />}
                      {tp.icon === 'headphones' && <Headphones className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] sm:text-xs font-bold text-white leading-tight">
                        {tp.title}
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-emerald-100/80 leading-tight mt-0.5">
                        {tp.subtitle}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {heroSlides.length > 1 && (
              <div className="mt-5 flex items-center justify-center gap-2">
                {heroSlides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`View slide ${idx + 1}`}
                    onClick={() => setHeroIndex(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === heroIndex ? 'w-7 bg-white' : 'w-2.5 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        {/* 2. SHOP BY CATEGORY */}
        {sectionEnabled('categories') && displayCategories.length > 0 && (
          <section aria-labelledby="shop-by-category-heading">
            <div className="flex items-end justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="shop-by-category-heading" className="text-lg font-bold text-slate-900">
                    Shop by Category
                  </h2>
                  <p className="text-xs text-slate-500">Explore our wide range of categories</p>
                </div>
              </div>
              <Link
                to="/shop"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 whitespace-nowrap"
              >
                <span>View All Categories</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {displayCategories.map((cat) => (
                <Link
                  key={cat._id}
                  to={`/category/${cat.slug}`}
                  className="group bg-white border border-slate-200 hover:border-emerald-400 rounded-xl p-3 flex flex-col items-center text-center transition-all hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <div className="w-full aspect-square rounded-lg bg-slate-50 overflow-hidden mb-2.5">
                    <SafeImage
                      src={cat.image?.url}
                      alt={cat.name}
                      fallbackLabel={cat.name}
                      className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 group-hover:text-emerald-700 line-clamp-1">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 3. DUAL PROMO BANNERS */}
        {sectionEnabled('dual_banners') && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {dualBanners.slice(0, 2).map((banner, idx) => (
              <div
                key={idx}
                className={`rounded-2xl overflow-hidden border p-6 flex items-center justify-between gap-4 ${
                  banner.theme === 'ice'
                    ? 'bg-gradient-to-r from-[#E6EFF8] to-[#F4F8FC] border-slate-200'
                    : 'bg-gradient-to-r from-[#F6EAF2] to-[#FDF6FA] border-rose-100'
                }`}
              >
                <div className="space-y-3 max-w-[55%]">
                  {banner.eyebrow && (
                    <p className="text-sm font-semibold text-slate-700">{banner.eyebrow}</p>
                  )}
                  <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
                    {banner.title}
                  </h3>
                  <Link
                    to={banner.ctaLink}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                  >
                    <span>{banner.ctaText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="w-36 sm:w-44 aspect-[4/3] rounded-xl overflow-hidden shrink-0">
                  <SafeImage
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ))}
          </section>
        )}

        {/* 4. FEATURED PRODUCTS WITH SIDEBAR FILTER */}
        {sectionEnabled('featured_products') && (
          <section aria-labelledby="featured-products-heading">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-lime-100 text-emerald-700 flex items-center justify-center">
                  <Star className="w-5 h-5 fill-emerald-600 text-emerald-600" />
                </div>
                <div>
                  <h2 id="featured-products-heading" className="text-lg font-bold text-slate-900">
                    Featured Products
                  </h2>
                  <p className="text-xs text-slate-500">Handpicked favorites just for you</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {(
                  [
                    ['all', 'All'],
                    ['best_seller', 'Best Seller'],
                    ['new_arrivals', 'New Arrivals'],
                    ['top_rated', 'Top Rated'],
                    ['on_sale', 'On Sale'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFeaturedTab(key)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                      featuredTab === key
                        ? 'bg-[#16A34A] text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Filter Products Panel (Matches Reference Image) */}
              <aside className="lg:col-span-3 xl:col-span-2 bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Filter Products</h3>

                <div className="space-y-2">
                  <label htmlFor="home-price-range" className="block text-xs font-semibold text-slate-700">
                    Price Range
                  </label>
                  <input
                    id="home-price-range"
                    type="range"
                    min={500}
                    max={200000}
                    step={500}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full accent-[#16A34A]"
                  />
                  <div className="flex items-center justify-between text-xs text-slate-600 tabular-nums">
                    <span>৳0</span>
                    <span>{formatBdt(maxPrice)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void fetchFilteredProducts()}
                    className="w-full py-2 px-3 rounded-lg bg-[#16A34A] hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                  >
                    Apply Filter
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setOpenAccordion(openAccordion === 'brand' ? '' : 'brand')}
                    className="w-full flex items-center justify-between text-xs font-semibold text-slate-800 py-1"
                  >
                    <span>Brand</span>
                    <Plus className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  {openAccordion === 'brand' && (
                    <div className="mt-2 space-y-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedBrandSlug('')}
                        className={`block text-xs ${
                          selectedBrandSlug === '' ? 'text-emerald-700 font-semibold' : 'text-slate-600'
                        }`}
                      >
                        All Brands
                      </button>
                      {brands.map((b) => (
                        <button
                          key={b._id}
                          type="button"
                          onClick={() => setSelectedBrandSlug(b.slug)}
                          className={`block text-xs ${
                            selectedBrandSlug === b.slug
                              ? 'text-emerald-700 font-semibold'
                              : 'text-slate-600'
                          }`}
                        >
                          {b.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setOpenAccordion(openAccordion === 'ratings' ? '' : 'ratings')}
                    className="w-full flex items-center justify-between text-xs font-semibold text-slate-800 py-1"
                  >
                    <span>Ratings</span>
                    <Plus className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  {openAccordion === 'ratings' && (
                    <div className="mt-2 space-y-1">
                      {[4, 3].map((stars) => (
                        <button
                          key={stars}
                          type="button"
                          onClick={() => setMinRating(minRating === stars ? null : stars)}
                          className={`block text-xs ${
                            minRating === stars ? 'text-emerald-700 font-semibold' : 'text-slate-600'
                          }`}
                        >
                          {stars}★ & above
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </aside>

              {/* Right Product Grid */}
              <div className="lg:col-span-9 xl:col-span-10">
                {loadingProducts ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-72 rounded-xl bg-white border border-slate-200 animate-pulse" />
                    ))}
                  </div>
                ) : products.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
                    <p className="text-sm font-semibold text-slate-800">
                      {dbUnavailable
                        ? 'Catalog products will appear here once MongoDB Atlas is connected.'
                        : 'No products matched the active filters.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/shop')}
                      className="mt-3 px-4 py-2 rounded-lg bg-[#16A34A] text-white text-xs font-semibold"
                    >
                      Browse Storefront Catalog
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
                    {products.slice(0, 5).map((product) => (
                      <ProductCard key={product._id} product={product} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 5. ADMIN-MANAGED PROMOTIONAL PLACEMENT (Omitted cleanly when unconfigured/disabled!) */}
        {sectionEnabled('promo_placement') && midPromo && (
          <section aria-label="Promotional campaign">
            <a
              href={sanitizeHref(midPromo.destinationUrl) || '/shop'}
              className="block rounded-2xl overflow-hidden bg-gradient-to-r from-[#062313] via-[#0B3B20] to-[#124E2B] text-white shadow-lg"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-6 px-6 sm:px-10 py-6">
                <div className="md:col-span-5 space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                    {midPromo.title}
                  </h2>
                  {midPromo.subtitle && (
                    <p className="text-sm text-emerald-100/90">{midPromo.subtitle}</p>
                  )}
                </div>
                <div className="md:col-span-2 flex md:justify-center">
                  <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#A3E635] text-slate-950 text-xs font-bold">
                    <span>{midPromo.ctaText || 'Shop Now'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="md:col-span-5 h-32 sm:h-36 rounded-xl overflow-hidden">
                  <SafeImage
                    src={midPromo.imageUrl}
                    alt={midPromo.altText}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </a>
          </section>
        )}

        {/* 6. BEST SELLERS (Real sales data only; omitted cleanly if no recorded sales yet) */}
        {sectionEnabled('best_sellers') && bestSellers.length > 0 && (
          <section aria-labelledby="best-sellers-heading">
            <div className="flex items-end justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="best-sellers-heading" className="text-lg font-bold text-slate-900">
                    Best Sellers
                  </h2>
                  <p className="text-xs text-slate-500">Most popular products based on verified orders</p>
                </div>
              </div>
              <Link
                to="/shop?sort=best_selling"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 whitespace-nowrap"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {bestSellers.map((item) => (
                <Link
                  key={item._id}
                  to={`/product/${item.slug}`}
                  className="bg-white border border-slate-200 hover:border-emerald-400 rounded-xl p-3 flex items-center gap-3 transition-colors"
                >
                  <div className="w-16 h-16 rounded-lg bg-slate-50 shrink-0 overflow-hidden">
                    <SafeImage
                      src={item.images?.[0]?.url}
                      alt={item.name}
                      className="w-full h-full object-contain p-1"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 line-clamp-1">{item.name}</p>
                    <p className="text-xs font-bold text-emerald-600 mt-0.5 tabular-nums">
                      {formatBdt(item.effectivePrice)}
                    </p>
                    {item.ratingCount > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="tabular-nums">{item.ratingAverage.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 7. OUR HAPPY CLIENTS (Real approved reviews only; omitted cleanly if none exist) */}
        {sectionEnabled('happy_clients') && visibleReviews.length > 0 && (
          <section aria-labelledby="happy-clients-heading">
            <div className="flex items-end justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Quote className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="happy-clients-heading" className="text-lg font-bold text-slate-900">
                    Our Happy Clients
                  </h2>
                  <p className="text-xs text-slate-500">Real feedback from verified NOVARA customers</p>
                </div>
              </div>
              {featuredReviews.length > 3 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Previous reviews"
                    onClick={() => setReviewOffset((o) => Math.max(0, o - 1))}
                    className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next reviews"
                    onClick={() =>
                      setReviewOffset((o) => Math.min(featuredReviews.length - 3, o + 1))
                    }
                    className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {visibleReviews.map((review) => (
                <div
                  key={review._id}
                  className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
                >
                  <p className="text-sm text-slate-700 leading-relaxed">"{review.comment}"</p>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                      <span>{review.userName}</span>
                      {review.verifiedPurchase && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-label="Verified purchase" />
                      )}
                    </div>
                    <span className="text-xs font-semibold text-amber-500 tabular-nums">
                      {review.rating}.0 ★
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 8. NEWSLETTER SUBSCRIPTION BANNER */}
        {sectionEnabled('newsletter') && (
          <section className="rounded-2xl bg-gradient-to-r from-[#0A4F25] via-[#136F35] to-[#168A41] text-white p-6 sm:p-8 shadow-md">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-lime-400/20 text-lime-300 flex items-center justify-center shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold">Subscribe to Our Newsletter</h2>
                  <p className="text-xs sm:text-sm text-emerald-100 mt-0.5">
                    Get the latest deals, new arrivals & exclusive offers across Bangladesh.
                  </p>
                </div>
              </div>

              <form onSubmit={handleNewsletterSubmit} className="w-full lg:w-auto flex-1 max-w-xl space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Enter your email address"
                    aria-label="Newsletter email address"
                    className="flex-1 h-11 px-4 rounded-lg bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={subscribing}
                    className="h-11 px-6 rounded-lg bg-[#22C55E] hover:bg-lime-400 hover:text-slate-950 text-white text-sm font-bold transition-colors whitespace-nowrap disabled:opacity-60"
                  >
                    {subscribing ? 'Subscribing...' : 'Subscribe'}
                  </button>
                </div>
                <label className="flex items-center gap-2 text-[11px] text-emerald-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newsletterConsent}
                    onChange={(e) => setNewsletterConsent(e.target.checked)}
                    className="rounded accent-lime-400"
                  />
                  <span>I consent to receive marketing updates from NOVARA COMMERCE (unsubscribe anytime).</span>
                </label>
              </form>

              <div className="hidden xl:flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 text-lime-300 shrink-0">
                <Sparkles className="w-7 h-7" />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
