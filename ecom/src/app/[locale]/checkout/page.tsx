"use client";

/**
 * Checkout Page
 *
 * Page for completing an order with promo code and points redemption
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, MessageCircle, Lock, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PriceDisplay, CurrencyDisplay } from "@/components/ui/currency-display";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Mock order items - in real app, these would come from cart
const ORDER_ITEMS = [
  {
    id: '1',
    name: 'Elden Ring',
    nameAr: 'إلدن رينج',
    category: 'Steam',
    categoryAr: 'ستيم',
    price: 59.99,
    quantity: 1,
    deliveryType: 'auto_key',
  },
  {
    id: '2',
    name: 'Netflix Premium 1 Month',
    nameAr: 'نتفليكس بريميوم شهر',
    category: 'Netflix',
    categoryAr: 'نتفليكس',
    price: 15.99,
    quantity: 2,
    deliveryType: 'auto_account',
  },
];

interface CouponData {
  couponId: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: string;
  discountAmount: string;
}

export default function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const router = useRouter();
  const [locale, setLocale] = useState("en");

  useEffect(() => {
    params.then(p => setLocale(p.locale));
  }, [params]);

  const isRTL = locale === 'ar';

  // Order totals state
  const [subtotal, setSubtotal] = useState(ORDER_ITEMS.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const [tax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [pointsRedemption, setPointsRedemption] = useState(0);
  const [total, setTotal] = useState(subtotal + tax);

  // Points state
  const [userPoints, setUserPoints] = useState(250);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [pointsValue, setPointsValue] = useState(0); // in dollars, 100 points = $1

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponData | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  // Points exchange rate (from settings)
  const POINTS_PER_DOLLAR = 100;

  // Recalculate totals when values change
  useEffect(() => {
    const newTotal = subtotal + tax - discount - pointsRedemption;
    setTotal(Math.max(0, newTotal));
  }, [subtotal, tax, discount, pointsRedemption]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }

    setCouponLoading(true);
    setCouponError("");

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim(),
          subtotal: subtotal,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const couponDiscount = parseFloat(data.data.discountAmount);
        setDiscount(couponDiscount);
        setAppliedCoupon(data.data);
        setCouponError("");
        setCouponCode("");
      } else {
        setCouponError(data.error || "Invalid coupon code");
      }
    } catch (err) {
      setCouponError("Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setDiscount(0);
    setAppliedCoupon(null);
  };

  const handleRedeemPointsChange = (points: number) => {
    const maxPoints = Math.min(points, userPoints);
    setPointsToRedeem(maxPoints);

    // Calculate dollar value (100 points = $1)
    const dollarValue = maxPoints / POINTS_PER_DOLLAR;
    setPointsValue(dollarValue);

    // Cap at current total
    const cappedValue = Math.min(dollarValue, total + discount);
    setPointsRedemption(cappedValue);
  };

  const handleTogglePoints = () => {
    if (pointsToRedeem > 0) {
      handleRedeemPointsChange(0);
    } else {
      // Redeem maximum possible points (up to order total)
      const maxPointsForOrder = Math.floor((total - discount) * POINTS_PER_DOLLAR);
      const pointsToUse = Math.min(userPoints, maxPointsForOrder);
      handleRedeemPointsChange(pointsToUse);
    }
  };

  const pointsEarned = Math.floor(total); // 1 point per $1 spent

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {locale === 'ar' ? 'إتمام الشراء' : 'Checkout'}
          </h1>
          <p className="text-text-muted">
            {locale === 'ar'
              ? 'أكمل طلبك في بضع خطوات بسيطة'
              : 'Complete your order in a few simple steps'}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                1
              </div>
              <span className="font-medium hidden sm:inline">
                {locale === 'ar' ? 'المعلومات' : 'Information'}
              </span>
            </div>
            <div className="w-16 h-0.5 bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                2
              </div>
              <span className="font-medium hidden sm:inline">
                {locale === 'ar' ? 'الدفع' : 'Payment'}
              </span>
            </div>
            <div className="w-16 h-0.5 bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center text-text-muted">
                3
              </div>
              <span className="text-text-muted hidden sm:inline">
                {locale === 'ar' ? 'التأكيد' : 'Confirmation'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {locale === 'ar' ? 'معلومات الاتصال' : 'Contact Information'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {locale === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                  </label>
                  <Input
                    type="email"
                    placeholder={locale === 'ar' ? 'بريدك@example.com' : 'your@email.com'}
                    required
                  />
                </div>
                <p className="text-sm text-text-muted">
                  {locale === 'ar'
                    ? 'سيتم إرسال تأكيد الطلب وعناصر التسليم إلى هذا البريد'
                    : 'Order confirmation and delivery items will be sent to this email'}
                </p>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {locale === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Card Payment */}
                <label className="flex items-start gap-4 p-4 border-2 border-primary rounded-lg cursor-pointer bg-primary/5">
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    defaultChecked
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="w-5 h-5 text-primary" />
                      <span className="font-semibold">
                        {locale === 'ar' ? 'الدفع بالبطاقة' : 'Card Payment'}
                      </span>
                    </div>
                    <p className="text-sm text-text-muted">
                      {locale === 'ar'
                        ? 'ادفع بأمان باستخدام بطاقتك الائتمانية أو البنكية'
                        : 'Pay securely using your credit or debit card'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-10 h-6 bg-white rounded flex items-center justify-center text-[10px] text-black font-bold">
                      VISA
                    </div>
                    <div className="w-10 h-6 bg-white rounded flex items-center justify-center text-[10px] text-black font-bold">
                      MC
                    </div>
                  </div>
                </label>

                {/* Manual Contact */}
                <label className="flex items-start gap-4 p-4 border-2 border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                  <input type="radio" name="payment" value="contact" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageCircle className="w-5 h-5" />
                      <span className="font-semibold">
                        {locale === 'ar' ? 'الدفع عبر التواصل' : 'Contact Payment'}
                      </span>
                    </div>
                    <p className="text-sm text-text-muted">
                      {locale === 'ar'
                        ? 'تواصل معنا لترتيب الدفع يدوياً'
                        : 'Contact us to arrange manual payment'}
                    </p>
                  </div>
                </label>

                {/* Card Details */}
                <div className="pt-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {locale === 'ar' ? 'رقم البطاقة' : 'Card Number'}
                    </label>
                    <Input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      className="w-full"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        {locale === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}
                      </label>
                      <Input type="text" placeholder="MM/YY" className="w-full" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        {locale === 'ar' ? 'CVV' : 'CVV'}
                      </label>
                      <Input type="text" placeholder="123" className="w-full" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {locale === 'ar' ? 'الاسم على البطاقة' : 'Name on Card'}
                    </label>
                    <Input
                      type="text"
                      placeholder={locale === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                      className="w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Points Redemption */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-accent-amber">⚡</span>
                  {locale === 'ar' ? 'استخدم نقاطك' : 'Use Your Points'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-text-muted">
                  {locale === 'ar'
                    ? `لديك ${userPoints} نقطة متاحة. كل ${POINTS_PER_DOLLAR} نقطة = $1 خصم`
                    : `You have ${userPoints} points available. ${POINTS_PER_DOLLAR} points = $1 discount`
                  }
                </p>

                {/* Redeem Points Checkbox */}
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="redeemPoints"
                      checked={pointsToRedeem > 0}
                      onChange={handleTogglePoints}
                      className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <label htmlFor="redeemPoints" className="text-sm text-white cursor-pointer">
                      {locale === 'ar' ? 'استبدال النقاط' : 'Redeem Points'}
                    </label>
                  </div>
                  <div className="text-right">
                    {pointsToRedeem > 0 && (
                      <span className="text-accent-amber font-semibold">
                        -${pointsRedemption.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Points Input (conditional) */}
                {pointsToRedeem > 0 && (
                  <div className="p-3 bg-accent-amber/10 border border-accent-amber/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-text-muted">
                        {locale === 'ar' ? 'النقاط المستخدمة' : 'Points to use'}
                      </span>
                      <span className="text-sm text-white font-medium">{pointsToRedeem} ⚡</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max={Math.min(userPoints, Math.floor((total - discount) * POINTS_PER_DOLLAR))}
                        value={pointsToRedeem}
                        onChange={(e) => handleRedeemPointsChange(parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        min="0"
                        max={userPoints}
                        value={pointsToRedeem}
                        onChange={(e) => handleRedeemPointsChange(parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                    </div>
                    <div className="text-xs text-text-muted mt-1">
                      {locale === 'ar' ? 'قيمة الخصم' : 'Discount value'}: ${pointsRedemption.toFixed(2)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>
                  {locale === 'ar' ? 'ملخص الطلب' : 'Order Summary'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Order Items */}
                <div className="space-y-3">
                  {ORDER_ITEMS.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-14 h-14 bg-background-lighter rounded flex items-center justify-center text-2xl flex-shrink-0">
                        🎮
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium line-clamp-2">
                          {isRTL ? item.nameAr : item.name}
                        </h4>
                        <p className="text-xs text-text-muted">
                          {isRTL ? item.categoryAr : item.category}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm text-text-muted">×{item.quantity}</span>
                          <CurrencyDisplay amount={item.price * item.quantity} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Coupon Code */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {locale === 'ar' ? 'كود الخصم' : 'Promo Code'}
                  </label>
                  {appliedCoupon ? (
                    <div className="flex items-center gap-2 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                      <span className="text-green-400">✓</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{appliedCoupon.code}</p>
                        <p className="text-xs text-green-400">
                          {locale === 'ar' ? 'خصم' : 'Discount'}: -${discount.toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        className="p-1 hover:bg-green-500/20 rounded text-green-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder={locale === 'ar' ? 'كود الخصم' : 'Promo code'}
                        onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading}
                      >
                        {couponLoading ? (
                          "..."
                        ) : locale === 'ar' ? 'تطبيق' : 'Apply'}
                      </Button>
                    </div>
                  )}
                  {couponError && (
                    <p className="text-xs text-red-400">{couponError}</p>
                  )}
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">
                      {locale === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}
                    </span>
                    <CurrencyDisplay amount={subtotal} />
                  </div>
                  {discount > 0 && (
                    <div className="flex items-center justify-between text-sm text-green-400">
                      <span>
                        {locale === 'ar' ? 'الخصم' : 'Discount'}
                      </span>
                      <span>-${discount.toFixed(2)}</span>
                    </div>
                  )}
                  {pointsRedemption > 0 && (
                    <div className="flex items-center justify-between text-sm text-accent-amber">
                      <span>
                        {locale === 'ar' ? 'النقاط' : 'Points'}
                      </span>
                      <span>-${pointsRedemption.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">
                      {locale === 'ar' ? 'الضريبة' : 'Tax'}
                    </span>
                    <CurrencyDisplay amount={tax} />
                  </div>
                  {pointsEarned > 0 && (
                    <div className="flex items-center justify-between text-sm text-accent-amber">
                      <span>
                        {locale === 'ar' ? 'النقاط التي ستكسبها' : 'Points Earned'}
                      </span>
                      <span>+{pointsEarned} ⚡</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex items-center justify-between text-lg font-semibold">
                    <span>{locale === 'ar' ? 'المجموع' : 'Total'}</span>
                    <CurrencyDisplay amount={total} />
                  </div>
                </div>

                {/* Submit Order */}
                <Button size="lg" variant="primary" className="w-full btn-electric">
                  <Lock className="w-4 h-4 mr-2" />
                  {locale === 'ar' ? 'تأكيد الطلب' : 'Place Order'}
                  <ArrowRight className={cn('w-5 h-5 ml-2', isRTL && 'rotate-180')} />
                </Button>

                {/* Terms */}
                <p className="text-xs text-text-muted text-center">
                  {locale === 'ar'
                    ? 'بإتمام الطلب أنت توافق على '
                    : 'By placing your order you agree to our '}
                  <Link href={`/${locale}/terms`} className="text-primary hover:underline">
                    {locale === 'ar' ? 'شروط الخدمة' : 'Terms of Service'}
                  </Link>
                  {' '}&{' '}
                  <Link href={`/${locale}/privacy`} className="text-primary hover:underline">
                    {locale === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
                  </Link>
                </p>

                {/* Trust Badge */}
                <div className="pt-4 border-t border-border/50">
                  <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
                    <Lock className="w-4 h-4" />
                    <span>{locale === 'ar' ? 'دفع آمن ومشفر' : 'Secure & Encrypted'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
