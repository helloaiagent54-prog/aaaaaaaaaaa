import { useEffect, useState } from 'react';
import { ChevronRight, Filter, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { apiRequest, formatBdt } from '../lib/api.ts';
import type { Brand, Category, Product } from '../types/domain.ts';
import { ProductCard } from '../components/ui/ProductCard.tsx';
import { SeoHead } from '../components/ui/SeoHead.tsx';

export function CatalogPage({ categories }: { categories: Category[] }) {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get('q') || '';
  const brand = searchParams.get('brand') || '';
  const sort = searchParams.get('sort') || 'featured';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const minRating = searchParams.get('minRating') || '';
  const onSale = searchParams.get('onSale') === 'true';
  const inStock = searchParams.get('inStock') === 'true';
  const page = Number(searchParams.get('page') || 1);

  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const activeCategory = categories.find((c) => c.slug === slug);

  useEffect(() => {
    apiRequest<{ brands: Brand[] }>('/api/catalog/brands')
      .then((res) => setBrands(res.brands || []))
      .catch(() => {});
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', sort });
      if (slug) params.set('category', slug);
      if (q) params.set('q', q);
      if (brand) params.set('brand', brand);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      if (minRating) params.set('minRating', minRating);
      if (onSale) params.set('onSale', 'true');
      if (inStock) params.set('inStock', 'true');

      const res = await apiRequest<{ products: Product[]; total: number; totalPages: number }>(
        `/api/catalog/products?${params.toString()}`
      );
      setProducts(res.products || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, [slug, q, brand, sort, minPrice, maxPrice, minRating, onSale, inStock, page]);

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!value) next.delete(key);
    else next.set(key, value);
    next.set('page', '1');
    setSearchParams(next);
  };

  const clearFilters = () => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    setSearchParams(next);
  };

  const pageTitle = q
    ? `Search results for "${q}"`
    : activeCategory
    ? activeCategory.name
    : onSale
    ? 'Deals & Flash Sales'
    : 'All Products';

  const filterSidebarContent = (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Filter className="w-4 h-4 text-emerald-600" />
          <span>Filters</span>
        </h2>
        <button
          type="button"
          onClick={clearFilters}
          className="text-xs text-emerald-700 hover:underline font-medium inline-flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Clear all</span>
        </button>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-700 mb-2">Categories</p>
        <div className="space-y-1.5">
          <Link
            to="/shop"
            className={`block text-xs py-1 ${!slug ? 'font-bold text-emerald-700' : 'text-slate-600 hover:text-slate-900'}`}
          >
            All Categories
          </Link>
          {categories.filter((c) => !c.parentId).map((c) => (
            <Link
              key={c._id}
              to={`/category/${c.slug}`}
              className={`block text-xs py-1 ${slug === c.slug ? 'font-bold text-emerald-700' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold text-slate-700 mb-2">Price Range (BDT)</p>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min={0}
            value={minPrice}
            onChange={(e) => updateParam('minPrice', e.target.value || null)}
            placeholder="Min ৳"
            aria-label="Minimum price"
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs tabular-nums"
          />
          <input
            type="number"
            min={0}
            value={maxPrice}
            onChange={(e) => updateParam('maxPrice', e.target.value || null)}
            placeholder="Max ৳"
            aria-label="Maximum price"
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs tabular-nums"
          />
        </div>
      </div>

      {brands.length > 0 && (
        <div className="border-t border-slate-100 pt-4">
          <label htmlFor="plp-brand-select" className="block text-xs font-semibold text-slate-700 mb-2">
            Brand
          </label>
          <select
            id="plp-brand-select"
            value={brand}
            onChange={(e) => updateParam('brand', e.target.value || null)}
            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-xs bg-white"
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b._id} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="border-t border-slate-100 pt-4">
        <label htmlFor="plp-rating-select" className="block text-xs font-semibold text-slate-700 mb-2">
          Minimum Rating
        </label>
        <select
          id="plp-rating-select"
          value={minRating}
          onChange={(e) => updateParam('minRating', e.target.value || null)}
          className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-xs bg-white"
        >
          <option value="">All Ratings</option>
          <option value="4">4★ & above</option>
          <option value="3">3★ & above</option>
          <option value="2">2★ & above</option>
        </select>
      </div>

      <div className="border-t border-slate-100 pt-4 space-y-2.5">
        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => updateParam('inStock', e.target.checked ? 'true' : null)}
            className="rounded accent-emerald-600"
          />
          <span>In Stock Only</span>
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={onSale}
            onChange={(e) => updateParam('onSale', e.target.checked ? 'true' : null)}
            className="rounded accent-emerald-600"
          />
          <span>On Sale / Discounted</span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <SeoHead
        title={`${pageTitle} – NOVARA COMMERCE`}
        description={activeCategory?.description || `Browse ${pageTitle} at NOVARA COMMERCE Bangladesh.`}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 mb-4">
        <Link to="/" className="hover:text-emerald-700">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/shop" className="hover:text-emerald-700">Shop</Link>
        {activeCategory && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-medium">{activeCategory.name}</span>
          </>
        )}
      </nav>

      {/* Heading + Sort Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{pageTitle}</h1>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            {loading ? 'Loading catalog...' : `${total} product${total === 1 ? '' : 's'} found`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
          </button>

          <select
            aria-label="Sort products"
            value={sort}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700"
          >
            <option value="featured">Sort: Featured</option>
            <option value="newest">Sort: Newest Arrivals</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="best_selling">Best Selling</option>
            <option value="top_rated">Top Rated</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <aside className="hidden lg:block lg:col-span-3 bg-white border border-slate-200 rounded-xl p-5 sticky top-28">
          {filterSidebarContent}
        </aside>

        <div className="lg:col-span-9">
          {error ? (
            <div className="bg-white border border-red-200 rounded-xl p-8 text-center">
              <p className="text-sm font-semibold text-red-700 mb-2">{error}</p>
              <button
                type="button"
                onClick={() => void loadProducts()}
                className="px-4 py-2 rounded-lg bg-[#16A34A] text-white text-xs font-semibold"
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-72 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <p className="text-base font-bold text-slate-900">No matching products found</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Try clearing filters or searching in English or Bangla (e.g. "Smartphone" or "বই").
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 rounded-lg bg-[#16A34A] text-white text-xs font-semibold"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const p = idx + 1;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          const next = new URLSearchParams(searchParams);
                          next.set('page', String(p));
                          setSearchParams(next);
                        }}
                        className={`w-9 h-9 rounded-lg text-xs font-bold tabular-nums ${
                          p === page
                            ? 'bg-[#16A34A] text-white'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFiltersOpen && (
        <div
          className="fixed inset-0 z-[110] bg-slate-950/50 flex justify-start"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setMobileFiltersOpen(false);
          }}
        >
          <div className="w-80 max-w-full bg-white h-full p-5 overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="font-bold text-slate-900">Filter Catalog</span>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
                className="p-1 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {filterSidebarContent}
          </div>
        </div>
      )}
    </div>
  );
}
