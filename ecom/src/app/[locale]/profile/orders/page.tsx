import { Metadata } from 'next';
import Link from 'next/link';
import { Package, Eye, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Locale } from '@/lib/i18n';

interface OrdersPageProps {
  params: Promise<{ locale: string }>;
}

// Mock orders data
const ORDERS = [
  {
    id: 'ORD-2024-001',
    status: 'delivered',
    date: '2024-03-10',
    items: [
      {
        id: '1',
        name: 'Elden Ring',
        nameAr: 'إلدن رينج',
        platform: 'Steam',
        platformAr: 'ستيم',
        image: '/elden-ring.jpg',
        deliveryType: 'auto_key',
        price: 59.99,
      },
    ],
    total: 59.99,
    currency: 'USD',
  },
  {
    id: 'ORD-2024-002',
    status: 'processing',
    date: '2024-03-12',
    items: [
      {
        id: '4',
        name: 'Netflix Premium 1 Month',
        nameAr: 'نتفليكس بريميوم شهر',
        platform: 'Netflix',
        platformAr: 'نتفليكس',
        image: '/netflix.jpg',
        deliveryType: 'auto_account',
        price: 15.99,
      },
      {
        id: '5',
        name: 'Spotify Premium 3 Months',
        nameAr: 'سبوتيفاي بريميوم 3 أشهر',
        platform: 'Spotify',
        platformAr: 'سبوتيفاي',
        image: '/spotify.jpg',
        deliveryType: 'auto_account',
        price: 29.99,
      },
    ],
    total: 45.98,
    currency: 'USD',
  },
  {
    id: 'ORD-2024-003',
    status: 'pending',
    date: '2024-03-14',
    items: [
      {
        id: '7',
        name: 'ChatGPT Plus Subscription',
        nameAr: 'اشتراك شات جي بي تي بلس',
        platform: 'AI',
        platformAr: 'ذكاء اصطناعي',
        image: '/chatgpt.jpg',
        deliveryType: 'contact',
        price: 20,
      },
    ],
    total: 20,
    currency: 'USD',
  },
];

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    labelAr: 'قيد الانتظار',
    variant: 'warning' as const,
    icon: '⏳',
  },
  processing: {
    label: 'Processing',
    labelAr: 'قيد المعالجة',
    variant: 'info' as const,
    icon: '⚙️',
  },
  delivered: {
    label: 'Delivered',
    labelAr: 'تم التسليم',
    variant: 'success' as const,
    icon: '✓',
  },
  cancelled: {
    label: 'Cancelled',
    labelAr: 'ملغي',
    variant: 'error' as const,
    icon: '✕',
  },
};

export async function generateMetadata({ params }: OrdersPageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'ar' ? 'طلباتي' : 'My Orders',
  };
};

export default async function OrdersPage({ params }: OrdersPageProps) {
  const { locale } = await params;
  const isRTL = locale === 'ar';

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {locale === 'ar' ? 'طلباتي' : 'My Orders'}
          </h1>
          <p className="text-text-muted">
            {locale === 'ar'
              ? 'عرض وتتبع جميع طلباتك'
              : 'View and track all your orders'}
          </p>
        </div>

        {ORDERS.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-text-muted" />
            <h2 className="text-xl font-semibold mb-2">
              {locale === 'ar' ? 'لا توجد طلبات بعد' : 'No orders yet'}
            </h2>
            <p className="text-text-muted mb-6">
              {locale === 'ar'
                ? 'ابدأ التسوق وستظهر طلباتك هنا'
                : 'Start shopping and your orders will appear here'}
            </p>
            <Link href={`/${locale}/products`}>
              <Button variant="primary">
                {locale === 'ar' ? 'تصفح المنتجات' : 'Browse Products'}
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-6">
            {ORDERS.map((order) => {
              const status = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG];

              return (
                <Card key={order.id}>
                  <CardContent className="p-6">
                    {/* Order Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-lg">{order.id}</h3>
                          <Badge variant={status.variant}>
                            {status.icon} {isRTL ? status.labelAr : status.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-text-muted">
                          {new Date(order.date).toLocaleDateString(
                            locale === 'ar' ? 'ar-SA' : 'en-US',
                            { year: 'numeric', month: 'long', day: 'numeric' }
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {order.currency} {order.total.toFixed(2)}
                        </p>
                        <Link href={`/${locale}/profile/orders/${order.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            {locale === 'ar' ? 'التفاصيل' : 'Details'}
                          </Button>
                        </Link>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Order Items */}
                    <div className="space-y-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-background-lighter rounded-lg flex items-center justify-center text-3xl flex-shrink-0">
                            🎮
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium line-clamp-1">
                              {isRTL ? item.nameAr : item.name}
                            </h4>
                            <p className="text-sm text-text-muted">
                              {isRTL ? item.platformAr : item.platform}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {order.currency} {item.price.toFixed(2)}
                            </p>
                            {order.status === 'delivered' && (
                              <Button variant="outline" size="sm" className="mt-1">
                                <Download className="w-3 h-3 mr-1" />
                                {locale === 'ar' ? 'تحميل' : 'Download'}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order Actions */}
                    {order.status === 'pending' && (
                      <div className="mt-4 pt-4 border-t border-border/50 flex justify-end gap-2">
                        <Button variant="outline" size="sm">
                          {locale === 'ar' ? 'إلغاء الطلب' : 'Cancel Order'}
                        </Button>
                        <Button variant="primary" size="sm">
                          {locale === 'ar' ? 'الدفع الآن' : 'Pay Now'}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
