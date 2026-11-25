import { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, Lock, MapPin, Plus, ShieldCheck, Truck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { BANGLADESH_LOCATIONS } from '../../shared/bangladeshLocations.ts';
import { useAppDispatch, useAppSelector } from '../app/hooks.ts';
import { openAuthModal, updateUserState } from '../features/auth/authSlice.ts';
import { clearCartAfterOrder, syncServerCart } from '../features/cart/cartSlice.ts';
import { pushToast } from '../features/toast/toastSlice.ts';
import { apiRequest, formatBdt } from '../lib/api.ts';
import type { OrderRecord, SavedAddress } from '../types/domain.ts';
import { SeoHead } from '../components/ui/SeoHead.tsx';

export function CheckoutPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const { items, appliedCouponCode } = useAppSelector((s) => s.cart);

  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');
  const [saveNewAddress, setSaveNewAddress] = useState(true);
  const [addressLabel, setAddressLabel] = useState('Home');
  const [recipientName, setRecipientName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [divisionCode, setDivisionCode] = useState('DHA');
  const [districtCode, setDistrictCode] = useState('DHA-DHK');
  const [upazilaCode, setUpazilaCode] = useState('DHK-DMD');
  const [areaCode, setAreaCode] = useState('DMD-W15');
  const [houseAddress, setHouseAddress] = useState('');
  const [roadStreet, setRoadStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  const [deliveryMethod, setDeliveryMethod] = useState<'standard' | 'express'>('standard');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'sslcommerz'>('cod');
  const [gatewayConfigured, setGatewayConfigured] = useState(false);
  const [couponCode, setCouponCode] = useState(appliedCouponCode || '');
  const [customerNote, setCustomerNote] = useState('');

  const [quote, setQuote] = useState<{
    subtotal: number;
    discountAmount: number;
    shippingCharge: number;
    taxAmount: number;
    totalAmount: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey] = useState(() => `chk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  // Auto-select default saved address when authenticated
  useEffect(() => {
    if (!user) return;
    setRecipientName((prev) => prev || user.name);
    setPhone((prev) => prev || user.phone || '');

    if (user.savedAddresses?.length > 0) {
      const def = user.savedAddresses.find((a) => a.isDefault) || user.savedAddresses[0];
      setSelectedAddressId(def._id);
    } else {
      setSelectedAddressId('new');
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void dispatch(syncServerCart());
    apiRequest<{ gatewayConfigured: boolean }>('/api/payments/status')
      .then((res) => setGatewayConfigured(res.gatewayConfigured))
      .catch(() => {});
  }, [user, dispatch]);

  const activeSavedAddress: SavedAddress | undefined = user?.savedAddresses?.find(
    (a) => a._id === selectedAddressId
  );

  const effectiveAddressCodes = activeSavedAddress
    ? {
        divisionCode: activeSavedAddress.divisionCode,
        districtCode: activeSavedAddress.districtCode,
        upazilaCode: activeSavedAddress.upazilaCode,
        areaCode: activeSavedAddress.areaCode,
      }
    : { divisionCode, districtCode, upazilaCode, areaCode };

  useEffect(() => {
    if (!user || items.length === 0) return;
    apiRequest<{
      subtotal: number;
      discountAmount: number;
      shippingCharge: number;
      taxAmount: number;
      totalAmount: number;
    }>('/api/orders/quote', {
      method: 'POST',
      body: JSON.stringify({
        ...effectiveAddressCodes,
        deliveryMethod,
        couponCode: couponCode || null,
      }),
    })
      .then(setQuote)
      .catch(() => {});
  }, [
    user,
    items.length,
    effectiveAddressCodes.divisionCode,
    effectiveAddressCodes.districtCode,
    effectiveAddressCodes.upazilaCode,
    effectiveAddressCodes.areaCode,
    deliveryMethod,
    couponCode,
  ]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <SeoHead title="Checkout – Sign In Required" noindex />
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Sign In Required to Place Your Order</h1>
        <p className="text-sm text-slate-600">
          Your shopping cart items are safely preserved. Please sign in or create an account to confirm delivery details and complete checkout.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => dispatch(openAuthModal({ mode: 'login', returnTo: '/checkout' }))}
            className="px-6 py-2.5 rounded-xl bg-[#16A34A] text-white text-sm font-bold"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => dispatch(openAuthModal({ mode: 'register', returnTo: '/checkout' }))}
            className="px-6 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm font-bold"
          >
            Create Account
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <SeoHead title="Checkout – NOVARA COMMERCE" noindex />
        <h1 className="text-2xl font-extrabold text-slate-900">Your cart is empty</h1>
        <Link to="/shop" className="inline-flex px-5 py-2.5 rounded-lg bg-[#16A34A] text-white text-sm font-semibold">
          Browse Products
        </Link>
      </div>
    );
  }

  const currentDivision =
    BANGLADESH_LOCATIONS.find((d) => d.code === divisionCode) || BANGLADESH_LOCATIONS[0];
  const currentDistrict =
    currentDivision.districts.find((d) => d.code === districtCode) || currentDivision.districts[0];
  const currentUpazila =
    currentDistrict.upazilas.find((u) => u.code === upazilaCode) || currentDistrict.upazilas[0];

  const handleDivisionChange = (nextDivCode: string) => {
    const div = BANGLADESH_LOCATIONS.find((d) => d.code === nextDivCode);
    setDivisionCode(nextDivCode);
    const nextDist = div?.districts[0];
    setDistrictCode(nextDist?.code || '');
    const nextUpa = nextDist?.upazilas[0];
    setUpazilaCode(nextUpa?.code || '');
    setAreaCode(nextUpa?.areas[0]?.code || '');
  };

  const handleDistrictChange = (nextDistCode: string) => {
    const dist = currentDivision.districts.find((d) => d.code === nextDistCode);
    setDistrictCode(nextDistCode);
    const nextUpa = dist?.upazilas[0];
    setUpazilaCode(nextUpa?.code || '');
    setAreaCode(nextUpa?.areas[0]?.code || '');
  };

  const handleUpazilaChange = (nextUpaCode: string) => {
    const upa = currentDistrict.upazilas.find((u) => u.code === nextUpaCode);
    setUpazilaCode(nextUpaCode);
    setAreaCode(upa?.areas[0]?.code || '');
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const shippingAddress = activeSavedAddress
        ? {
            recipientName: activeSavedAddress.recipientName,
            phone: activeSavedAddress.phone,
            divisionCode: activeSavedAddress.divisionCode,
            districtCode: activeSavedAddress.districtCode,
            upazilaCode: activeSavedAddress.upazilaCode,
            areaCode: activeSavedAddress.areaCode,
            houseAddress: activeSavedAddress.houseAddress,
            roadStreet: activeSavedAddress.roadStreet,
            landmark: activeSavedAddress.landmark,
            deliveryInstructions: activeSavedAddress.deliveryInstructions,
          }
        : {
            recipientName,
            phone,
            divisionCode,
            districtCode,
            upazilaCode,
            areaCode,
            houseAddress,
            roadStreet: roadStreet || undefined,
            landmark: landmark || undefined,
            deliveryInstructions: deliveryInstructions || undefined,
          };

      // Optionally persist new address first
      if (!activeSavedAddress && saveNewAddress) {
        const addrRes = await apiRequest<{ addresses: SavedAddress[] }>('/api/users/addresses', {
          method: 'POST',
          body: JSON.stringify({
            label: addressLabel,
            ...shippingAddress,
            isDefault: user.savedAddresses.length === 0,
          }),
        });
        dispatch(updateUserState({ ...user, savedAddresses: addrRes.addresses }));
      }

      const res = await apiRequest<{
        order: OrderRecord;
        payment?: { gatewayUrl?: string };
      }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          idempotencyKey,
          shippingAddress,
          deliveryMethod,
          paymentMethod,
          couponCode: couponCode || null,
          customerNote: customerNote || undefined,
        }),
      });

      dispatch(clearCartAfterOrder());
      dispatch(
        pushToast({
          variant: 'success',
          title: 'Order Confirmed',
          message: `Order ${res.order.orderNumber} placed successfully.`,
        })
      );

      if (res.payment?.gatewayUrl) {
        window.location.href = res.payment.gatewayUrl;
      } else {
        navigate(`/account/orders/${res.order.orderNumber}`);
      }
    } catch (err) {
      dispatch(
        pushToast({
          variant: 'error',
          title: 'Checkout Failed',
          message: err instanceof Error ? err.message : 'Unable to place order.',
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <SeoHead title="Secure Checkout – NOVARA COMMERCE" noindex />
      <h1 className="text-2xl font-extrabold text-slate-900 mb-6">Checkout</h1>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">
          {/* Delivery Address */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Delivery Address (Bangladesh)</span>
            </h2>

            {user.savedAddresses?.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {user.savedAddresses.map((addr) => (
                  <button
                    key={addr._id}
                    type="button"
                    onClick={() => setSelectedAddressId(addr._id)}
                    className={`p-3.5 rounded-xl border text-left transition-colors ${
                      selectedAddressId === addr._id
                        ? 'border-emerald-600 bg-emerald-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{addr.label}</span>
                      {addr.isDefault && (
                        <span className="text-[11px] font-semibold text-emerald-700">Default</span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-700 mt-1">
                      {addr.recipientName} · {addr.phone}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                      {addr.houseAddress}, {addr.areaName}, {addr.upazilaName}, {addr.districtName}
                    </p>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedAddressId('new')}
                  className={`p-3.5 rounded-xl border border-dashed flex items-center justify-center gap-2 text-xs font-semibold ${
                    selectedAddressId === 'new'
                      ? 'border-emerald-600 bg-emerald-50/50 text-emerald-800'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Deliver to New Address</span>
                </button>
              </div>
            )}

            {selectedAddressId === 'new' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label htmlFor="chk-recipient" className="block text-xs font-semibold text-slate-700 mb-1">
                    Recipient Full Name
                  </label>
                  <input
                    id="chk-recipient"
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="chk-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                    Bangladesh Mobile Number
                  </label>
                  <input
                    id="chk-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="chk-division" className="block text-xs font-semibold text-slate-700 mb-1">
                    Division
                  </label>
                  <select
                    id="chk-division"
                    value={divisionCode}
                    onChange={(e) => handleDivisionChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                  >
                    {BANGLADESH_LOCATIONS.map((d) => (
                      <option key={d.code} value={d.code}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="chk-district" className="block text-xs font-semibold text-slate-700 mb-1">
                    District
                  </label>
                  <select
                    id="chk-district"
                    value={districtCode}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                  >
                    {currentDivision.districts.map((d) => (
                      <option key={d.code} value={d.code}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="chk-upazila" className="block text-xs font-semibold text-slate-700 mb-1">
                    Upazila / Thana
                  </label>
                  <select
                    id="chk-upazila"
                    value={upazilaCode}
                    onChange={(e) => handleUpazilaChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                  >
                    {currentDistrict.upazilas.map((u) => (
                      <option key={u.code} value={u.code}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="chk-area" className="block text-xs font-semibold text-slate-700 mb-1">
                    Union / Ward / Local Area
                  </label>
                  <select
                    id="chk-area"
                    value={areaCode}
                    onChange={(e) => setAreaCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                  >
                    {currentUpazila.areas.map((a) => (
                      <option key={a.code} value={a.code}>{a.name}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="chk-house" className="block text-xs font-semibold text-slate-700 mb-1">
                    House / Flat / Holding Address
                  </label>
                  <input
                    id="chk-house"
                    type="text"
                    required
                    value={houseAddress}
                    onChange={(e) => setHouseAddress(e.target.value)}
                    placeholder="House 14, Apt 4B"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="chk-road" className="block text-xs font-semibold text-slate-700 mb-1">
                    Road / Street (optional)
                  </label>
                  <input
                    id="chk-road"
                    type="text"
                    value={roadStreet}
                    onChange={(e) => setRoadStreet(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="chk-landmark" className="block text-xs font-semibold text-slate-700 mb-1">
                    Landmark (optional)
                  </label>
                  <input
                    id="chk-landmark"
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </div>

                <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveNewAddress}
                      onChange={(e) => setSaveNewAddress(e.target.checked)}
                      className="rounded accent-emerald-600"
                    />
                    <span>Save this address to my account</span>
                  </label>
                  {saveNewAddress && (
                    <input
                      type="text"
                      value={addressLabel}
                      onChange={(e) => setAddressLabel(e.target.value)}
                      placeholder="Label (Home / Office)"
                      aria-label="Address label"
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs w-36"
                    />
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Delivery Method */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>Delivery Speed</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeliveryMethod('standard')}
                className={`p-3.5 rounded-xl border text-left ${
                  deliveryMethod === 'standard' ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-200'
                }`}
              >
                <p className="text-xs font-bold text-slate-900">Standard Delivery</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Free on orders over ৳999 · 1–5 days</p>
              </button>
              <button
                type="button"
                onClick={() => setDeliveryMethod('express')}
                className={`p-3.5 rounded-xl border text-left ${
                  deliveryMethod === 'express' ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-200'
                }`}
              >
                <p className="text-xs font-bold text-slate-900">Express Priority</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Priority dispatch (+৳80 surcharge)</p>
              </button>
            </div>
          </section>

          {/* Payment Method */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Payment Method</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('cod')}
                className={`p-4 rounded-xl border text-left ${
                  paymentMethod === 'cod' ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-200'
                }`}
              >
                <p className="text-sm font-bold text-slate-900">Cash on Delivery (COD)</p>
                <p className="text-xs text-slate-500 mt-0.5">Pay in cash upon parcel inspection.</p>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('sslcommerz')}
                className={`p-4 rounded-xl border text-left ${
                  paymentMethod === 'sslcommerz' ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-200'
                }`}
              >
                <p className="text-sm font-bold text-slate-900">
                  Cards / bKash / Nagad (SSLCommerz)
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {gatewayConfigured
                    ? 'Server-verified online payment gateway.'
                    : 'Gateway credentials required in server configuration.'}
                </p>
              </button>
            </div>
          </section>
        </div>

        {/* Right Summary */}
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 space-y-5 sticky top-28">
          <h2 className="text-base font-bold text-slate-900">Order Summary</h2>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={`${item.productId}-${item.variantId || 'base'}`} className="flex justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                  <p className="text-slate-500">
                    Qty: {item.quantity} {item.variantTitle ? `· ${item.variantTitle}` : ''}
                  </p>
                </div>
                <span className="font-bold text-slate-900 tabular-nums shrink-0">
                  {formatBdt(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-semibold tabular-nums">{formatBdt(quote?.subtotal ?? 0)}</span>
            </div>
            {(quote?.discountAmount ?? 0) > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Coupon ({couponCode})</span>
                <span className="font-semibold tabular-nums">-{formatBdt(quote!.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-600">Shipping</span>
              <span className="font-semibold tabular-nums">
                {quote?.shippingCharge === 0 ? 'Free' : formatBdt(quote?.shippingCharge ?? 0)}
              </span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-100">
              <span>Final Total</span>
              <span className="text-emerald-600 tabular-nums">{formatBdt(quote?.totalAmount ?? 0)}</span>
            </div>
          </div>

          <textarea
            rows={2}
            value={customerNote}
            onChange={(e) => setCustomerNote(e.target.value)}
            placeholder="Delivery note for courier (optional)"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 rounded-xl bg-[#16A34A] hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? 'Confirming Order...' : 'Confirm & Place Order'}</span>
          </button>

          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Server-verified pricing & atomic stock reservation</span>
          </p>
        </aside>
      </form>
    </div>
  );
}
