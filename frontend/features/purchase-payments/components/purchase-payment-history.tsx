'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge, type StatusTone } from '@/components/data-display/status-badge';
import { usePurchasePayments } from '../hooks/use-purchase-payments';
import { purchasePaymentStatusLabel, type PurchasePaymentStatus } from '../types/purchase-payment.types';

const STATUS_TONE: Record<PurchasePaymentStatus, StatusTone> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REVERSED: 'neutral',
};

/**
 * A purchase's own payment history — every payment with at least one
 * allocation to it (business-blueprint section 2.17: "purchase-payment
 * history"). Embedded on the Purchase detail page rather than reusing the
 * full `PurchasePaymentList` (which owns its own URL-based filters and would
 * conflict if mounted twice on the same page).
 */
export function PurchasePaymentHistory({ purchaseId }: { purchaseId: string }) {
  const query = usePurchasePayments({ page: 1, pageSize: 25, purchaseId });

  if (query.isPending) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (query.isError || query.data.payments.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Payment history</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-4 font-medium">Payment</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 text-right font-medium">Payment amount</th>
              </tr>
            </thead>
            <tbody>
              {query.data.payments.map((payment) => (
                <tr key={payment.id} className="border-b last:border-0">
                  <td className="p-4">
                    <Link
                      href={`/purchase-payments/${payment.id}`}
                      className="text-primary hover:underline"
                    >
                      {payment.paymentNumber}
                    </Link>
                  </td>
                  <td className="p-4">
                    <StatusBadge
                      tone={STATUS_TONE[payment.status]}
                      label={purchasePaymentStatusLabel(payment.status)}
                    />
                  </td>
                  <td className="p-4 text-right tabular-nums">KES {payment.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
