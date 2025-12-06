import { AppLayout } from '@/components/layout/AppLayout';
import { ShipmentDetail as ShipmentDetailComponent } from '@/components/shipments/ShipmentDetail';

export default function ShipmentDetailPage() {
  return (
    <AppLayout>
      <ShipmentDetailComponent />
    </AppLayout>
  );
}