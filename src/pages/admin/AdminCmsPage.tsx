import { useEffect, useState } from 'react';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAppDispatch } from '../../app/hooks.ts';
import { CloudinaryUploadField } from '../../components/ui/CloudinaryUploadField.tsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx';
import { Modal } from '../../components/ui/Modal.tsx';
import { SafeImage } from '../../components/ui/SafeImage.tsx';
import { pushToast } from '../../features/toast/toastSlice.ts';
import { apiRequest } from '../../lib/api.ts';
import type { HomepageConfig, PromotionalPlacement } from '../../types/domain.ts';

export function AdminCmsPage() {
  const dispatch = useAppDispatch();
  const [homepage, setHomepage] = useState<HomepageConfig | null>(null);
  const [promotions, setPromotions] = useState<PromotionalPlacement[]>([]);
  const [savingCms, setSavingCms] = useState(false);

  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromotionalPlacement | null>(null);
  const [promoForm, setPromoForm] = useState({
    title: '',
    subtitle: '',
    ctaText: 'Shop Now',
    destinationUrl: '/shop',
    altText: '',
    imageUrl: '/src/assets/images/promo_tech_laptops_1795621230990.jpg',
    imagePublicId: '',
    placementSlot: 'homepage_mid_banner' as PromotionalPlacement['placementSlot'],
    layoutStyle: 'dark_emerald_banner' as PromotionalPlacement['layoutStyle'],
    isEnabled: true,
    status: 'published' as 'draft' | 'published',
    startsAt: '',
    endsAt: '',
  });
  const [savingPromo, setSavingPromo] = useState(false);
  const [deletePromoId, setDeletePromoId] = useState<string | null>(null);

  const loadData = () => {
    Promise.all([
      apiRequest<{ homepage: HomepageConfig }>('/api/cms/admin/homepage'),
      apiRequest<{ promotions: PromotionalPlacement[] }>('/api/cms/admin/promotions'),
    ])
      .then(([cmsRes, promoRes]) => {
        setHomepage(cmsRes.homepage);
        setPromotions(promoRes.promotions);
      })
      .catch((err) => {
        dispatch(
          pushToast({
            variant: 'error',
            message: err instanceof Error ? err.message : 'Unable to load CMS data.',
          })
        );
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveHomepage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homepage) return;
    setSavingCms(true);
    try {
      const res = await apiRequest<{ homepage: HomepageConfig }>('/api/cms/admin/homepage', {
        method: 'PUT',
        body: JSON.stringify(homepage),
      });
      setHomepage(res.homepage);
      dispatch(pushToast({ variant: 'success', message: 'Homepage CMS configuration saved.' }));
    } catch (err) {
      dispatch(
        pushToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Failed to save homepage CMS.',
        })
      );
    } finally {
      setSavingCms(false);
    }
  };

  const openPromoModal = (promo?: PromotionalPlacement) => {
    if (promo) {
      setEditingPromo(promo);
      setPromoForm({
        title: promo.title,
        subtitle: promo.subtitle || '',
        ctaText: promo.ctaText || 'Shop Now',
        destinationUrl: promo.destinationUrl,
        altText: promo.altText,
        imageUrl: promo.imageUrl,
        imagePublicId: '',
        placementSlot: promo.placementSlot,
        layoutStyle: promo.layoutStyle,
        isEnabled: promo.isEnabled,
        status: promo.status,
        startsAt: promo.startsAt ? promo.startsAt.slice(0, 16) : '',
        endsAt: promo.endsAt ? promo.endsAt.slice(0, 16) : '',
      });
    } else {
      setEditingPromo(null);
      setPromoForm({
        title: '',
        subtitle: '',
        ctaText: 'Shop Now',
        destinationUrl: '/shop',
        altText: 'Promotional campaign banner',
        imageUrl: '/src/assets/images/promo_tech_laptops_1795621230990.jpg',
        imagePublicId: '',
        placementSlot: 'homepage_mid_banner',
        layoutStyle: 'dark_emerald_banner',
        isEnabled: true,
        status: 'published',
        startsAt: '',
        endsAt: '',
      });
    }
    setPromoModalOpen(true);
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPromo(true);
    try {
      const payload = {
        ...promoForm,
        imagePublicId: promoForm.imagePublicId || undefined,
        startsAt: promoForm.startsAt ? new Date(promoForm.startsAt).toISOString() : null,
        endsAt: promoForm.endsAt ? new Date(promoForm.endsAt).toISOString() : null,
      };
      const url = editingPromo
        ? `/api/cms/admin/promotions/${editingPromo._id}`
        : '/api/cms/admin/promotions';
      await apiRequest(url, {
        method: editingPromo ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
      setPromoModalOpen(false);
      dispatch(
        pushToast({
          variant: 'success',
          message: editingPromo ? 'Promotional placement updated.' : 'Promotional placement created.',
        })
      );
      loadData();
    } catch (err) {
      dispatch(
        pushToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Unable to save promotional placement.',
        })
      );
    } finally {
      setSavingPromo(false);
    }
  };

  const handleDeletePromo = async () => {
    if (!deletePromoId) return;
    try {
      await apiRequest(`/api/cms/admin/promotions/${deletePromoId}`, { method: 'DELETE' });
      setDeletePromoId(null);
      dispatch(pushToast({ variant: 'info', message: 'Promotional placement removed.' }));
      loadData();
    } catch (err) {
      dispatch(
        pushToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Failed to delete placement.',
        })
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Promotional Ad Placements */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Promotional Ad Placements & Banners
            </h2>
            <p className="text-xs text-slate-500">
              If disabled or unconfigured, the storefront omits the slot cleanly with zero broken placeholders.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openPromoModal()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#16A34A] hover:bg-emerald-700 text-white text-xs font-semibold"
          >
            <Plus className="w-4 h-4" /> Create Placement
          </button>
        </div>

        {promotions.length === 0 ? (
          <p className="text-xs text-slate-500 py-4">
            No promotional ad placements configured yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {promotions.map((p) => (
              <div
                key={p._id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <SafeImage
                    src={p.imageUrl}
                    alt={p.altText}
                    className="w-20 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-900">{p.title}</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {p.placementSlot} · {p.destinationUrl}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      p.isEnabled && p.status === 'published'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {p.isEnabled ? p.status : 'Disabled'}
                  </span>
                  <button
                    type="button"
                    onClick={() => openPromoModal(p)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                    aria-label={`Edit ${p.title}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletePromoId(p._id)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-red-50 text-red-600"
                    aria-label={`Delete ${p.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Homepage Section Visibility & Hero Slide Editor */}
      {homepage && (
        <form
          onSubmit={handleSaveHomepage}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Homepage CMS Sections & Hero</h2>
              <p className="text-xs text-slate-500">
                Toggle homepage sections and edit primary campaign slides.
              </p>
            </div>
            <button
              type="submit"
              disabled={savingCms}
              className="px-5 py-2 rounded-xl bg-[#16A34A] hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-60"
            >
              {savingCms ? 'Saving...' : 'Save Homepage CMS'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {homepage.sections.map((sec, idx) => (
              <label
                key={sec.id}
                className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
              >
                <span>{sec.label}</span>
                <input
                  type="checkbox"
                  checked={sec.enabled}
                  onChange={(e) =>
                    setHomepage((prev) =>
                      prev
                        ? {
                            ...prev,
                            sections: prev.sections.map((s, i) =>
                              i === idx ? { ...s, enabled: e.target.checked } : s
                            ),
                          }
                        : prev
                    )
                  }
                />
              </label>
            ))}
          </div>

          {homepage.heroSlides[0] && (
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <p className="text-xs font-bold uppercase text-slate-700">Primary Hero Slide</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={homepage.heroSlides[0].badge}
                  onChange={(e) =>
                    setHomepage((prev) =>
                      prev
                        ? {
                            ...prev,
                            heroSlides: prev.heroSlides.map((s, i) =>
                              i === 0 ? { ...s, badge: e.target.value } : s
                            ),
                          }
                        : prev
                    )
                  }
                  placeholder="Badge"
                  className="h-10 px-3 rounded-lg border border-slate-200 text-sm"
                />
                <input
                  type="text"
                  value={homepage.heroSlides[0].headlinePrefix}
                  onChange={(e) =>
                    setHomepage((prev) =>
                      prev
                        ? {
                            ...prev,
                            heroSlides: prev.heroSlides.map((s, i) =>
                              i === 0 ? { ...s, headlinePrefix: e.target.value } : s
                            ),
                          }
                        : prev
                    )
                  }
                  placeholder="Headline Prefix"
                  className="h-10 px-3 rounded-lg border border-slate-200 text-sm"
                />
                <input
                  type="text"
                  value={homepage.heroSlides[0].headlineHighlight}
                  onChange={(e) =>
                    setHomepage((prev) =>
                      prev
                        ? {
                            ...prev,
                            heroSlides: prev.heroSlides.map((s, i) =>
                              i === 0 ? { ...s, headlineHighlight: e.target.value } : s
                            ),
                          }
                        : prev
                    )
                  }
                  placeholder="Highlight Word"
                  className="h-10 px-3 rounded-lg border border-slate-200 text-sm"
                />
              </div>
              <input
                type="text"
                value={homepage.heroSlides[0].subtitle}
                onChange={(e) =>
                  setHomepage((prev) =>
                    prev
                      ? {
                          ...prev,
                          heroSlides: prev.heroSlides.map((s, i) =>
                            i === 0 ? { ...s, subtitle: e.target.value } : s
                          ),
                        }
                      : prev
                  )
                }
                placeholder="Subtitle"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm"
              />
            </div>
          )}
        </form>
      )}

      {/* Promotional Placement Modal */}
      <Modal
        open={promoModalOpen}
        onClose={() => setPromoModalOpen(false)}
        title={editingPromo ? 'Edit Promotional Placement' : 'Create Promotional Placement'}
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleSavePromo} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
              <input
                type="text"
                required
                value={promoForm.title}
                onChange={(e) => setPromoForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Upgrade Your Life with the Best Tech"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Destination URL
              </label>
              <input
                type="text"
                required
                value={promoForm.destinationUrl}
                onChange={(e) => setPromoForm((f) => ({ ...f, destinationUrl: e.target.value }))}
                placeholder="/category/electronics"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subtitle</label>
              <input
                type="text"
                value={promoForm.subtitle}
                onChange={(e) => setPromoForm((f) => ({ ...f, subtitle: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Button Text
              </label>
              <input
                type="text"
                value={promoForm.ctaText}
                onChange={(e) => setPromoForm((f) => ({ ...f, ctaText: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alt Text (Accessibility)
              </label>
              <input
                type="text"
                required
                value={promoForm.altText}
                onChange={(e) => setPromoForm((f) => ({ ...f, altText: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={promoForm.status}
                onChange={(e) =>
                  setPromoForm((f) => ({ ...f, status: e.target.value as 'draft' | 'published' }))
                }
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <CloudinaryUploadField
              folder="promotions"
              label="Upload Banner Image"
              onUploaded={(asset) =>
                setPromoForm((f) => ({
                  ...f,
                  imageUrl: asset.url,
                  imagePublicId: asset.publicId,
                }))
              }
            />
            <div className="rounded-xl overflow-hidden bg-[#062E22] p-4 text-white flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] text-lime-300 uppercase font-bold flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Live Placement Preview
                </p>
                <p className="text-base font-extrabold mt-0.5">
                  {promoForm.title || 'Banner Title'}
                </p>
                <p className="text-xs text-emerald-100">{promoForm.subtitle}</p>
              </div>
              <SafeImage
                src={promoForm.imageUrl}
                alt={promoForm.altText}
                className="w-28 h-14 object-cover rounded-lg border border-white/20"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={promoForm.isEnabled}
              onChange={(e) => setPromoForm((f) => ({ ...f, isEnabled: e.target.checked }))}
            />
            <span>Enable placement on storefront</span>
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPromoModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingPromo}
              className="px-5 py-2 rounded-lg bg-[#16A34A] text-white text-sm font-semibold disabled:opacity-60"
            >
              {savingPromo ? 'Saving...' : 'Save Placement'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deletePromoId)}
        onClose={() => setDeletePromoId(null)}
        onConfirm={handleDeletePromo}
        title="Delete Promotional Placement"
        message="Remove this promotional placement? If no other placements remain active, the homepage slot will collapse cleanly."
        confirmLabel="Delete Placement"
        danger
      />
    </div>
  );
}
