import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  resolveEffectiveUnitPrice,
  calculateCouponDiscount,
  calculateShippingCharge,
} from './pricing';
import {
  canTransitionOrderStatus,
  canCustomerCancelOrder,
  canCustomerRequestReturn,
} from './orderStateMachine';
import { expandCrossLingualTokens } from './crossLingualSearch';
import { validateBangladeshHierarchy } from './bangladeshLocations';
import { hasPermission } from './rbac';
import {
  escapeHtml,
  escapeRegex,
  escapeXml,
  isSafeDestinationUrl,
  normalizePhoneDigits,
  parseCsvLine,
  sanitizeCsvCell,
  sanitizeHref,
  shouldReleaseInventoryOnCancel,
} from './security';
import { verifySslCommerzIpnSignature } from '../server/src/services/payment.service.ts';

test('pricing ignores expired flash sales and falls back to sale/base price', () => {
  const expired = resolveEffectiveUnitPrice(
    {
      basePrice: 10000,
      salePrice: 8500,
      flashSalePrice: 6000,
      flashSaleStart: new Date('2025-01-01T00:00:00Z'),
      flashSaleEnd: new Date('2025-01-02T00:00:00Z'),
    },
    new Date('2026-01-01T00:00:00Z')
  );
  assert.equal(expired.unitPrice, 8500);
  assert.equal(expired.isFlashSaleActive, false);

  const active = resolveEffectiveUnitPrice(
    {
      basePrice: 10000,
      salePrice: 8500,
      flashSalePrice: 6000,
      flashSaleStart: new Date('2026-01-01T00:00:00Z'),
      flashSaleEnd: new Date('2026-01-05T00:00:00Z'),
    },
    new Date('2026-01-03T00:00:00Z')
  );
  assert.equal(active.unitPrice, 6000);
  assert.equal(active.isFlashSaleActive, true);
  assert.equal(active.discountPercent, 40);
});

test('coupon calculation respects max cap, min order, and never produces negative totals', () => {
  const result = calculateCouponDiscount(
    {
      code: 'NOVARA20',
      type: 'percentage',
      value: 20,
      maxDiscountCap: 500,
      minOrderAmount: 1000,
      isActive: true,
      usedCount: 1,
      usageLimit: 100,
    },
    [{ productId: 'p1', categoryId: 'c1', unitPrice: 4000, quantity: 1 }]
  );
  assert.equal(result.valid, true);
  assert.equal(result.discountAmount, 500);

  const belowMin = calculateCouponDiscount(
    {
      code: 'NOVARA20',
      type: 'fixed',
      value: 2000,
      minOrderAmount: 1500,
      isActive: true,
      usedCount: 0,
    },
    [{ productId: 'p1', categoryId: 'c1', unitPrice: 900, quantity: 1 }]
  );
  assert.equal(belowMin.valid, false);
  assert.equal(belowMin.discountAmount, 0);
});

test('shipping rules grant free standard shipping over ৳999 and apply zone rates otherwise', () => {
  assert.equal(calculateShippingCharge(1200, 'dhaka_metro', 'standard'), 0);
  assert.equal(calculateShippingCharge(800, 'dhaka_metro', 'standard'), 60);
  assert.equal(calculateShippingCharge(800, 'outside_dhaka', 'standard'), 130);
  assert.equal(calculateShippingCharge(1500, 'dhaka_metro', 'express'), 140);
});

test('order state machine blocks invalid jumps and enforces 7-day return window', () => {
  assert.equal(canTransitionOrderStatus('pending', 'confirmed'), true);
  assert.equal(canTransitionOrderStatus('pending', 'delivered'), false);
  assert.equal(canTransitionOrderStatus('delivered', 'cancelled'), false);
  assert.equal(canCustomerCancelOrder('confirmed'), true);
  assert.equal(canCustomerCancelOrder('shipped'), false);

  const now = new Date('2026-11-25T12:00:00Z');
  assert.equal(canCustomerRequestReturn('delivered', new Date('2026-11-22T12:00:00Z'), now), true);
  assert.equal(canCustomerRequestReturn('delivered', new Date('2026-11-10T12:00:00Z'), now), false);
});

test('cross-lingual search expands Bangla terms like মোটিভেশনাল বই to motivational books', () => {
  const tokens = expandCrossLingualTokens('মোটিভেশনাল বই');
  assert.equal(tokens.includes('motivational'), true);
  assert.equal(tokens.includes('books'), true);
});

test('Bangladesh location hierarchy rejects mismatched division/district/upazila combinations', () => {
  assert.equal(
    validateBangladeshHierarchy({
      divisionCode: 'DHA',
      districtCode: 'DHA-DHK',
      upazilaCode: 'DHK-DMD',
      areaCode: 'DMD-W15',
    }).valid,
    true
  );
  assert.equal(
    validateBangladeshHierarchy({
      divisionCode: 'CTG',
      districtCode: 'DHA-DHK',
      upazilaCode: 'DHK-DMD',
      areaCode: 'DMD-W15',
    }).valid,
    false
  );
});

test('RBAC restricts inventory manager from staff management and refunds', () => {
  assert.equal(hasPermission('inventory_manager', 'inventory:write'), true);
  assert.equal(hasPermission('inventory_manager', 'staff:manage'), false);
  assert.equal(hasPermission('inventory_manager', 'payments:refund'), false);
  assert.equal(hasPermission('super_admin', 'staff:manage'), true);
});

test('security helpers escape HTML, XML, regex, and block unsafe URL protocols', () => {
  assert.equal(escapeHtml('<script>"alert"</script>'), '&lt;script&gt;&quot;alert&quot;&lt;/script&gt;');
  assert.equal(escapeXml('a&b<c>'), 'a&amp;b&lt;c&gt;');
  assert.equal(escapeRegex('a.*(b)?[c]'), 'a\\.\\*\\(b\\)\\?\\[c\\]');

  assert.equal(isSafeDestinationUrl('/shop?q=1'), true);
  assert.equal(isSafeDestinationUrl('https://novaracommerce.com/shop'), true);
  assert.equal(isSafeDestinationUrl('javascript:alert(1)'), false);
  assert.equal(isSafeDestinationUrl('//evil.example/redirect'), false);
  assert.equal(sanitizeHref('javascript:alert(1)'), undefined);
  assert.equal(sanitizeHref('https://wa.me/8801700000000'), 'https://wa.me/8801700000000');
});

test('CSV helpers neutralize formula prefixes and parse quoted fields with commas', () => {
  assert.equal(sanitizeCsvCell('=cmd|"/c calc"!A0'), `"'=cmd|""/c calc""!A0"`);
  assert.equal(sanitizeCsvCell('+SUM(A1:A2)'), "'+SUM(A1:A2)");
  assert.equal(sanitizeCsvCell('USB-C Hub, 7-in-1'), '"USB-C Hub, 7-in-1"');

  const cols = parseCsvLine('NVR-01,"Phone, Pro Max",phone-pro-max,smartphones,apple,129999,,5,published');
  assert.equal(cols.length, 9);
  assert.equal(cols[1], 'Phone, Pro Max');
  assert.equal(cols[8], 'published');
});

test('phone normalization and cancel inventory release guard prevent double stock release', () => {
  assert.equal(normalizePhoneDigits('+880 1712-345678').endsWith('5678'), true);
  assert.equal(shouldReleaseInventoryOnCancel('pending'), true);
  assert.equal(shouldReleaseInventoryOnCancel('confirmed'), true);
  assert.equal(shouldReleaseInventoryOnCancel('payment_failed'), false);
  assert.equal(shouldReleaseInventoryOnCancel('cancelled'), false);
});

test('SSLCommerz IPN signature verification accepts genuine MD5 signatures and rejects tampered payloads', () => {
  const storePassword = 'test_store_password';
  const passHash = crypto.createHash('md5').update(storePassword).digest('hex');
  const payload = {
    amount: '1500.00',
    store_id: 'novara_test',
    tran_id: 'NVX-001',
    status: 'FAILED',
    verify_key: 'amount,status,store_id,tran_id',
  };
  const canonical = `amount=1500.00&status=FAILED&store_id=novara_test&store_passwd=${passHash}&tran_id=NVX-001`;
  const verifySign = crypto.createHash('md5').update(canonical).digest('hex');

  assert.equal(verifySslCommerzIpnSignature({ ...payload, verify_sign: verifySign }, storePassword), true);
  assert.equal(verifySslCommerzIpnSignature({ ...payload, amount: '1.00', verify_sign: verifySign }, storePassword), false);
  assert.equal(verifySslCommerzIpnSignature(payload, storePassword), false);
});
