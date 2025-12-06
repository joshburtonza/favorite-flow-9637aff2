import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload } from 'lucide-react';

export default function ImportData() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Import Data</h1>
          <p className="text-muted-foreground">Import shipments and data from CSV/Excel files</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>CSV Import</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Import Data</h3>
              <p className="text-sm text-muted-foreground mb-4">
                CSV import functionality coming soon. This will allow you to import shipments, 
                supplier statements, and payment schedules from your existing Excel files.
              </p>
              <p className="text-xs text-muted-foreground">
                Supported formats: .csv, .xlsx
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}