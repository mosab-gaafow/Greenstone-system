import { StatusBadge, type StatusTone } from '@/components/data-display/status-badge';
import { deliveryStatusLabel, type DeliveryStatus } from '../types/delivery.types';

const TONE: Record<DeliveryStatus, StatusTone> = {
  PLANNED: 'info',
  DISPATCHED: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'danger',
};

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  return <StatusBadge tone={TONE[status]} label={deliveryStatusLabel(status)} />;
}
