import { useState } from 'react';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, CreditCard, Image, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';

interface CompanySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompanySettingsDialog({ open, onOpenChange }: CompanySettingsDialogProps) {
  const { settings, updateSettings, resetSettings } = useCompanySettings();
  const [formData, setFormData] = useState(settings);

  const handleSave = () => {
    updateSettings(formData);
    toast.success('Company settings saved');
    onOpenChange(false);
  };

  const handleReset = () => {
    resetSettings();
    setFormData(settings);
    toast.success('Settings reset to defaults');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, signatureUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Company Settings</DialogTitle>
          <DialogDescription>
            Configure your company details for invoices
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="company" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="company" className="gap-2">
              <Building2 className="h-4 w-4" />
              Company
            </TabsTrigger>
            <TabsTrigger value="banking" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Banking
            </TabsTrigger>
            <TabsTrigger value="branding" className="gap-2">
              <Image className="h-4 w-4" />
              Branding
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Company Name</Label>
                <Input
                  value={formData.companyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Company Address</Label>
                <Textarea
                  value={formData.companyAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyAddress: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Phone</Label>
                  <Input
                    value={formData.companyPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyPhone: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.companyEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyEmail: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>VAT Number</Label>
                  <Input
                    value={formData.companyVatNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyVatNumber: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Registration Number</Label>
                  <Input
                    value={formData.companyRegNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyRegNumber: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="banking" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bank Details</CardTitle>
                <CardDescription>These will appear on your invoices</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Bank Name</Label>
                  <Input
                    value={formData.bankName}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Account Name</Label>
                  <Input
                    value={formData.bankAccountName}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankAccountName: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Account Number</Label>
                    <Input
                      value={formData.bankAccountNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, bankAccountNumber: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Branch Code</Label>
                    <Input
                      value={formData.bankBranchCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, bankBranchCode: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>SWIFT Code</Label>
                  <Input
                    value={formData.bankSwiftCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankSwiftCode: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-2">
              <Label>Payment Terms</Label>
              <Textarea
                value={formData.paymentTerms}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                rows={2}
              />
            </div>
          </TabsContent>

          <TabsContent value="branding" className="space-y-4 mt-4">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Company Logo</CardTitle>
                  <CardDescription>Appears at the top of your invoices</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    {formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt="Company Logo"
                        className="h-16 w-auto object-contain border rounded"
                      />
                    ) : (
                      <div className="h-16 w-32 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground">
                        No logo
                      </div>
                    )}
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="max-w-xs"
                      />
                      {formData.logoUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData(prev => ({ ...prev, logoUrl: null }))}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Authorized Signature</CardTitle>
                  <CardDescription>Appears at the bottom of your invoices</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    {formData.signatureUrl ? (
                      <img
                        src={formData.signatureUrl}
                        alt="Signature"
                        className="h-12 w-auto object-contain border rounded"
                      />
                    ) : (
                      <div className="h-12 w-32 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground text-sm">
                        No signature
                      </div>
                    )}
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleSignatureUpload}
                        className="max-w-xs"
                      />
                      {formData.signatureUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData(prev => ({ ...prev, signatureUrl: null }))}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-2">
                <Label>Invoice Footer Message</Label>
                <Textarea
                  value={formData.invoiceFooter}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoiceFooter: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
