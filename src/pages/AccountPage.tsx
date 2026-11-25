import { useEffect, useState } from 'react';
import {
  Heart,
  KeyRound,
  MapPin,
  Package,
  Pencil,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BANGLADESH_LOCATIONS } from '../../shared/bangladeshLocations.ts';
import { canCustomerCancelOrder } from '../../shared/orderStateMachine.ts';
import { useAppDispatch, useAppSelector } from '../app/hooks.ts';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { ProductCard } from '../components/ui/ProductCard.tsx';
import { SeoHead } from '../components/ui/SeoHead.tsx';
import { openAuthModal, updateUserState } from '../features/auth/authSlice.ts';
import { pushToast } from '../features/toast/toastSlice.ts';
import { apiRequest, formatBdt } from '../lib/api.ts';
import type { OrderRecord, Product, ReviewItem, SavedAddress } from '../types/domain.ts';

type AccountTab = 'profile' | 'orders' | 'addresses' | 'wishlist' | 'reviews';

interface AddressFormState {
  label: string;
  recipientName: string;
  phone: string;
  divisionCode: string;
  districtCode: string;
  upazilaCode: string;
  areaCode: string;
  houseAddress: string;
  roadStreet: string;
  landmark: string;
  deliveryInstructions: string;
  isDefault: boolean;
}

const emptyAddressForm = (name = '', phone = ''): AddressFormState => {
  const div = BANGLADESH_LOCATIONS[0];
  const dist = div.districts[0];
  const upz = dist.upazilas[0];
  const area = upz.areas[0];
  return {
    label: 'Home',
    recipientName: name,
    phone,
    divisionCode: div.code,
    districtCode: dist.code,
    upazilaCode: upz.code,
    areaCode: area.code,
    houseAddress: '',
    roadStreet: '',
    landmark: '',
    deliveryInstructions: '',
    isDefault: true,
  };
};

export function AccountPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, initialized } = useAppSelector((s) => s.auth);

  const pathTab = (): AccountTab => {
    if (location.pathname.includes('/orders')) return 'orders';
    if (location.pathname.includes('/addresses')) return 'addresses';
    if (location.pathname.includes('/wishlist')) return 'wishlist';
    if (location.pathname.includes('/reviews')) return 'reviews';
    return 'profile';
  };

  const activeTab = pathTab();

  // Profile & password state
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [notifPrefs, setNotifPrefs] = useState({
    orderUpdates: true,
    promotions: true,
    backInStock: true,
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);
  const [cancelTargetOrder, setCancelTargetOrder] = useState<string | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState(false);

  // Addresses state
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<AddressFormState>(emptyAddressForm());
  const [savingAddress, setSavingAddress] = useState(false);
  const [deleteAddressId, setDeleteAddressId] = useState<string | null>(null);
  const [deletingAddress, setDeletingAddress] = useState(false);

  // Wishlist & Reviews state
  const [wishlistItems, setWishlistItems] = useState<Product[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [myReviews, setMyReviews] = useState<ReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileName(user.name);
      setProfilePhone(user.phone || '');
      setNotifPrefs(user.notificationPreferences);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (activeTab === 'orders') {
      setOrdersLoading(true);
      apiRequest<{ orders: OrderRecord[]; totalPages: number }>(
        `/api/orders/my?page=${ordersPage}&limit=8`
      )
        .then((res) => {
          setOrders(res.orders);
          setOrdersTotalPages(Math.max(1, res.totalPages));
        })
        .catch(() => {})
        .finally(() => setOrdersLoading(false));
    } else if (activeTab === 'wishlist') {
      setWishlistLoading(true);
      apiRequest<{ items: Product[] }>('/api/users/wishlist')
        .then((res) => setWishlistItems(res.items))
        .catch(() => {})
        .finally(() => setWishlistLoading(false));
    } else if (activeTab === 'reviews') {
      setReviewsLoading(true);
      apiRequest<{ reviews: ReviewItem[] }>('/api/reviews/my')
        .then((res) => setMyReviews(res.reviews))
        .catch(() => {})
        .finally(() => setReviewsLoading(false));
    }
  }, [user, activeTab, ordersPage]);

  if (initialized && !user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <SeoHead title="My Account" />
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <UserIcon className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Sign in to Your Account</h1>
          <p className="text-sm text-slate-600 mb-6">
            Access your orders, Bangladesh saved delivery addresses, wishlist, and verified reviews.
          </p>
          <button
            type="button"
            onClick={() => dispatch(openAuthModal({ mode: 'login', returnTo: location.pathname }))}
            className="px-6 py-2.5 rounded-xl bg-[#16A34A] hover:bg-emerald-700 text-white font-semibold text-sm transition-colors"
          >
            Sign In or Register
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="h-48 rounded-2xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  const selectedDivision =
    BANGLADESH_LOCATIONS.find((d) => d.code === addressForm.divisionCode) || BANGLADESH_LOCATIONS[0];
  const selectedDistrict =
    selectedDivision.districts.find((d) => d.code === addressForm.districtCode) ||
    selectedDivision.districts[0];
  const selectedUpazila =
    selectedDistrict.upazilas.find((u) => u.code === addressForm.upazilaCode) ||
    selectedDistrict.upazilas[0];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await apiRequest<{ user: typeof user }>('/api/users/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: profileName,
          phone: profilePhone,
          notificationPreferences: notifPrefs,
        }),
      });
      dispatch(updateUserState({ ...user, ...res.user }));
      dispatch(pushToast({ variant: 'success', message: 'Profile and preferences updated.' }));
    } catch (err) {
      dispatch(
        pushToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Unable to update profile.',
        })
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPassword(true);
    try {
      await apiRequest('/api/users/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      dispatch(pushToast({ variant: 'success', message: 'Password updated successfully.' }));
    } catch (err) {
      dispatch(
        pushToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Password update failed.',
        })
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const openAddAddress = () => {
    setEditingAddressId(null);
    setAddressForm(emptyAddressForm(user.name, user.phone));
    setAddressModalOpen(true);
  };

  const openEditAddress = (addr: SavedAddress) => {
    setEditingAddressId(addr._id);
    setAddressForm({
      label: addr.label,
      recipientName: addr.recipientName,
      phone: addr.phone,
      divisionCode: addr.divisionCode,
      districtCode: addr.districtCode,
      upazilaCode: addr.upazilaCode,
      areaCode: addr.areaCode,
      houseAddress: addr.houseAddress,
      roadStreet: addr.roadStreet || '',
      landmark: addr.landmark || '',
      deliveryInstructions: addr.deliveryInstructions || '',
      isDefault: addr.isDefault,
    });
    setAddressModalOpen(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAddress(true);
    try {
      const endpoint = editingAddressId
        ? `/api/users/addresses/${editingAddressId}`
        : '/api/users/addresses';
      const method = editingAddressId ? 'PATCH' : 'POST';
      const res = await apiRequest<{ addresses: SavedAddress[] }>(endpoint, {
        method,
        body: JSON.stringify(addressForm),
      });
      dispatch(updateUserState({ ...user, savedAddresses: res.addresses }));
      setAddressModalOpen(false);
      dispatch(
        pushToast({
          variant: 'success',
          message: editingAddressId ? 'Address updated.' : 'New delivery address saved.',
        })
      );
    } catch (err) {
      dispatch(
        pushToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Failed to save address.',
        })
      );
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async () => {
    if (!deleteAddressId) return;
    setDeletingAddress(true);
    try {
      const res = await apiRequest<{ addresses: SavedAddress[] }>(
        `/api/users/addresses/${deleteAddressId}`,
        { method: 'DELETE' }
      );
      dispatch(updateUserState({ ...user, savedAddresses: res.addresses }));
      setDeleteAddressId(null);
      dispatch(pushToast({ variant: 'info', message: 'Address removed.' }));
    } catch (err) {
      dispatch(
        pushToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Unable to delete address.',
        })
      );
    } finally {
      setDeletingAddress(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelTargetOrder) return;
    setCancellingOrder(true);
    try {
      const res = await apiRequest<{ order: OrderRecord }>(
        `/api/orders/my/${cancelTargetOrder}/cancel`,
        {
          method: 'POST',
          body: JSON.stringify({ reason: 'Cancelled by customer from My Orders' }),
        }
      );
      setOrders((prev) =>
        prev.map((o) => (o.orderNumber === cancelTargetOrder ? res.order : o))
      );
      setCancelTargetOrder(null);
      dispatch(pushToast({ variant: 'success', message: `Order ${cancelTargetOrder} cancelled.` }));
    } catch (err) {
      dispatch(
        pushToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Unable to cancel order.',
        })
      );
    } finally {
      setCancellingOrder(false);
    }
  };

  const tabs: Array<{ id: AccountTab; label: string; to: string; icon: typeof UserIcon }> = [
    { id: 'profile', label: 'Account Settings', to: '/account/settings', icon: UserIcon },
    { id: 'orders', label: 'My Orders', to: '/account/orders', icon: Package },
    { id: 'addresses', label: 'Saved Addresses', to: '/account/addresses', icon: MapPin },
    { id: 'wishlist', label: 'Wishlist', to: '/account/wishlist', icon: Heart },
    { id: 'reviews', label: 'My Reviews', to: '/account/reviews', icon: Star },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <SeoHead title="My Account" />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Navigation */}
        <aside className="lg:w-64 shrink-0">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-base">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-900 truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            </div>

            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => navigate(tab.to)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? 'bg-emerald-50 text-emerald-800 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Right Panel */}
        <div className="flex-1 min-w-0">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <form
                onSubmit={handleSaveProfile}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5"
              >
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900">Profile & Preferences</h1>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Keep your contact details and email notification settings up to date.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mobile Number (Bangladesh)
                    </label>
                    <input
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="+880 1XXXXXXXXX"
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-2.5">
                  <p className="text-sm font-bold text-slate-800">Email Notification Preferences</p>
                  <label className="flex items-center gap-2.5 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={notifPrefs.orderUpdates}
                      onChange={(e) =>
                        setNotifPrefs((p) => ({ ...p, orderUpdates: e.target.checked }))
                      }
                      className="rounded border-slate-300 text-emerald-600"
                    />
                    <span>Order confirmations, shipment & payment status updates</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={notifPrefs.backInStock}
                      onChange={(e) =>
                        setNotifPrefs((p) => ({ ...p, backInStock: e.target.checked }))
                      }
                      className="rounded border-slate-300 text-emerald-600"
                    />
                    <span>Back-in-stock alerts for subscribed items</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={notifPrefs.promotions}
                      onChange={(e) =>
                        setNotifPrefs((p) => ({ ...p, promotions: e.target.checked }))
                      }
                      className="rounded border-slate-300 text-emerald-600"
                    />
                    <span>Flash sales, seasonal offers & verified coupon drops</span>
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-5 py-2.5 rounded-xl bg-[#16A34A] hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                  >
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>

              <form
                onSubmit={handleChangePassword}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4"
              >
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-lg font-bold text-slate-900">Password & Security</h2>
                </div>
                {user.authProvider !== 'local' ? (
                  <p className="text-sm text-slate-600">
                    You signed in via <strong className="capitalize">{user.authProvider}</strong> OAuth.
                    Manage your password through your connected provider.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Current Password
                        </label>
                        <input
                          type="password"
                          required
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-emerald-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          New Password (min 8 chars)
                        </label>
                        <input
                          type="password"
                          required
                          minLength={8}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-emerald-600 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={changingPassword}
                        className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                      >
                        {changingPassword ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </>
                )}
              </form>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900">My Orders</h1>
                  <p className="text-sm text-slate-500">
                    Track shipments, inspect invoices, cancel pending orders, or request a 7-day return.
                  </p>
                </div>
              </div>

              {ordersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-24 rounded-xl bg-slate-100 animate-pulse" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
                  <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No orders placed yet</p>
                  <Link
                    to="/shop"
                    className="inline-block mt-3 px-4 py-2 rounded-lg bg-[#16A34A] text-white text-xs font-semibold"
                  >
                    Start Shopping
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div
                      key={order._id}
                      className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-emerald-200 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/account/orders/${order.orderNumber}`}
                            className="font-mono text-sm font-bold text-slate-900 hover:text-emerald-700"
                          >
                            {order.orderNumber}
                          </Link>
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase">
                            {order.orderStatus.replace(/_/g, ' ')}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold uppercase">
                            Payment: {order.paymentStatus}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {new Date(order.createdAt).toLocaleString()} · {order.items.length} item(s) ·{' '}
                          {order.shippingAddress.districtName}, {order.shippingAddress.divisionName}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-mono font-bold text-slate-900">
                            {formatBdt(order.totalAmount)}
                          </p>
                          <p className="text-[11px] text-slate-500 uppercase">{order.paymentMethod}</p>
                        </div>

                        {canCustomerCancelOrder(order.orderStatus) && (
                          <button
                            type="button"
                            onClick={() => setCancelTargetOrder(order.orderNumber)}
                            className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold"
                          >
                            Cancel
                          </button>
                        )}
                        <Link
                          to={`/account/orders/${order.orderNumber}`}
                          className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {ordersTotalPages > 1 && (
                <div className="flex justify-center gap-2 pt-3">
                  <button
                    type="button"
                    disabled={ordersPage <= 1}
                    onClick={() => setOrdersPage((p) => p - 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-xs text-slate-600">
                    Page {ordersPage} of {ordersTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={ordersPage >= ordersTotalPages}
                    onClick={() => setOrdersPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'addresses' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900">Saved Bangladesh Addresses</h1>
                  <p className="text-sm text-slate-500">
                    Manage Division, District, Upazila & Union/Area delivery destinations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openAddAddress}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#16A34A] hover:bg-emerald-700 text-white text-sm font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  Add Address
                </button>
              </div>

              {user.savedAddresses.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
                  <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No saved addresses yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Save an address for faster checkout across Bangladesh.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {user.savedAddresses.map((addr) => (
                    <div
                      key={addr._id}
                      className={`border rounded-xl p-4 space-y-2 ${
                        addr.isDefault ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{addr.label}</span>
                          {addr.isDefault && (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditAddress(addr)}
                            aria-label={`Edit ${addr.label}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteAddressId(addr._id)}
                            aria-label={`Delete ${addr.label}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-slate-800">
                        {addr.recipientName} · {addr.phone}
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {addr.houseAddress}
                        {addr.roadStreet ? `, ${addr.roadStreet}` : ''}
                        <br />
                        {addr.areaName}, {addr.upazilaName}, {addr.districtName}, {addr.divisionName}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'wishlist' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h1 className="text-xl font-extrabold text-slate-900">Saved Wishlist</h1>
              {wishlistLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-72 rounded-xl bg-slate-100 animate-pulse" />
                  ))}
                </div>
              ) : wishlistItems.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
                  <Heart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">Your wishlist is empty</p>
                  <Link
                    to="/shop"
                    className="inline-block mt-3 px-4 py-2 rounded-lg bg-[#16A34A] text-white text-xs font-semibold"
                  >
                    Browse Products
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {wishlistItems.map((p) => (
                    <ProductCard key={p._id} product={p} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h1 className="text-xl font-extrabold text-slate-900">My Product Reviews</h1>
              {reviewsLoading ? (
                <div className="h-32 rounded-xl bg-slate-100 animate-pulse" />
              ) : myReviews.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
                  <Star className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No reviews submitted yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Verified reviews can be submitted after your order is delivered.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myReviews.map((r) => {
                    const prod = typeof r.productId === 'object' ? r.productId : null;
                    return (
                      <div key={r._id} className="border border-slate-200 rounded-xl p-4 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          {prod ? (
                            <Link
                              to={`/product/${prod.slug}`}
                              className="text-sm font-bold text-slate-900 hover:text-emerald-700"
                            >
                              {prod.name}
                            </Link>
                          ) : (
                            <span className="text-sm font-bold text-slate-900">Product Review</span>
                          )}
                          <div className="flex items-center gap-2">
                            {r.verifiedPurchase && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                <ShieldCheck className="w-3.5 h-3.5" /> Verified Purchase
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-bold uppercase">
                              {r.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                              }`}
                            />
                          ))}
                        </div>
                        {r.title && <p className="text-sm font-semibold text-slate-800">{r.title}</p>}
                        <p className="text-xs text-slate-600 leading-relaxed">{r.comment}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Address Modal */}
      <Modal
        open={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        title={editingAddressId ? 'Edit Delivery Address' : 'Add Bangladesh Delivery Address'}
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={handleSaveAddress} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Label</label>
              <input
                type="text"
                required
                value={addressForm.label}
                onChange={(e) => setAddressForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Home / Office"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Recipient Name
              </label>
              <input
                type="text"
                required
                value={addressForm.recipientName}
                onChange={(e) => setAddressForm((f) => ({ ...f, recipientName: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="tel"
                required
                value={addressForm.phone}
                onChange={(e) => setAddressForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+880 1XXXXXXXXX"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Division</label>
              <select
                value={addressForm.divisionCode}
                onChange={(e) => {
                  const div =
                    BANGLADESH_LOCATIONS.find((d) => d.code === e.target.value) ||
                    BANGLADESH_LOCATIONS[0];
                  const dist = div.districts[0];
                  const upz = dist.upazilas[0];
                  const area = upz.areas[0];
                  setAddressForm((f) => ({
                    ...f,
                    divisionCode: div.code,
                    districtCode: dist.code,
                    upazilaCode: upz.code,
                    areaCode: area.code,
                  }));
                }}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white"
              >
                {BANGLADESH_LOCATIONS.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">District</label>
              <select
                value={addressForm.districtCode}
                onChange={(e) => {
                  const dist =
                    selectedDivision.districts.find((d) => d.code === e.target.value) ||
                    selectedDivision.districts[0];
                  const upz = dist.upazilas[0];
                  const area = upz.areas[0];
                  setAddressForm((f) => ({
                    ...f,
                    districtCode: dist.code,
                    upazilaCode: upz.code,
                    areaCode: area.code,
                  }));
                }}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white"
              >
                {selectedDivision.districts.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Upazila / Thana
              </label>
              <select
                value={addressForm.upazilaCode}
                onChange={(e) => {
                  const upz =
                    selectedDistrict.upazilas.find((u) => u.code === e.target.value) ||
                    selectedDistrict.upazilas[0];
                  const area = upz.areas[0];
                  setAddressForm((f) => ({
                    ...f,
                    upazilaCode: upz.code,
                    areaCode: area.code,
                  }));
                }}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white"
              >
                {selectedDistrict.upazilas.map((u) => (
                  <option key={u.code} value={u.code}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Union / Area / Ward
              </label>
              <select
                value={addressForm.areaCode}
                onChange={(e) => setAddressForm((f) => ({ ...f, areaCode: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white"
              >
                {selectedUpazila.areas.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              House / Holding / Flat Address
            </label>
            <input
              type="text"
              required
              value={addressForm.houseAddress}
              onChange={(e) => setAddressForm((f) => ({ ...f, houseAddress: e.target.value }))}
              placeholder="House 14, Flat 4B"
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Road / Street (Optional)
              </label>
              <input
                type="text"
                value={addressForm.roadStreet}
                onChange={(e) => setAddressForm((f) => ({ ...f, roadStreet: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Landmark (Optional)
              </label>
              <input
                type="text"
                value={addressForm.landmark}
                onChange={(e) => setAddressForm((f) => ({ ...f, landmark: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={addressForm.isDefault}
              onChange={(e) => setAddressForm((f) => ({ ...f, isDefault: e.target.checked }))}
              className="rounded border-slate-300 text-emerald-600"
            />
            <span>Set as default delivery address</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAddressModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingAddress}
              className="px-5 py-2 rounded-lg bg-[#16A34A] hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60"
            >
              {savingAddress ? 'Saving...' : 'Save Address'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteAddressId)}
        onClose={() => setDeleteAddressId(null)}
        onConfirm={handleDeleteAddress}
        title="Delete Saved Address"
        message="Remove this delivery address from your account? Existing orders will retain their snapshot."
        confirmLabel="Delete Address"
        danger
        loading={deletingAddress}
      />

      <ConfirmDialog
        open={Boolean(cancelTargetOrder)}
        onClose={() => setCancelTargetOrder(null)}
        onConfirm={handleCancelOrder}
        title="Cancel Order"
        message={`Cancel order ${cancelTargetOrder}? Reserved stock will be released immediately.`}
        confirmLabel="Cancel Order"
        danger
        loading={cancellingOrder}
      />
    </div>
  );
}
