import { useState, useEffect } from 'react';

export interface CompanySettings {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyVatNumber: string;
  companyRegNumber: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankBranchCode: string;
  bankSwiftCode: string;
  logoUrl: string | null;
  signatureUrl: string | null;
  paymentTerms: string;
  invoiceFooter: string;
}

const DEFAULT_SETTINGS: CompanySettings = {
  companyName: 'Favorite Logistics (Pty) Ltd',
  companyAddress: '123 Industrial Road\nCape Town, 8001\nSouth Africa',
  companyPhone: '+27 21 555 0123',
  companyEmail: 'accounts@favoritelogistics.co.za',
  companyVatNumber: '4123456789',
  companyRegNumber: '2020/123456/07',
  bankName: 'First National Bank',
  bankAccountName: 'Favorite Logistics (Pty) Ltd',
  bankAccountNumber: '62123456789',
  bankBranchCode: '250655',
  bankSwiftCode: 'FIRNZAJJ',
  logoUrl: null,
  signatureUrl: null,
  paymentTerms: 'Payment due within 30 days of invoice date.',
  invoiceFooter: 'Thank you for your business!',
};

const STORAGE_KEY = 'company-settings';

export function useCompanySettings() {
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      } catch {
        setSettings(DEFAULT_SETTINGS);
      }
    }
    setIsLoading(false);
  }, []);

  const updateSettings = (updates: Partial<CompanySettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    settings,
    updateSettings,
    resetSettings,
    isLoading,
  };
}
