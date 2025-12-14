import { useCallback } from 'react';
import { usePermissions, AppPermission } from '@/hooks/usePermissions';

// Map document types to required permissions
const DOCUMENT_TYPE_PERMISSIONS: Record<string, AppPermission[]> = {
  'supplier_invoice': ['view_supplier_invoices'],
  'invoice': ['view_supplier_invoices'],
  'packing_list': ['view_packing_lists'],
  'packing list': ['view_packing_lists'],
  'shipping': ['view_shipping_documents'],
  'bol': ['view_shipping_documents'],
  'bill of lading': ['view_shipping_documents'],
  'transport': ['view_transport_invoices'],
  'transport_invoice': ['view_transport_invoices'],
  'clearing': ['view_clearing_invoices'],
  'clearing_invoice': ['view_clearing_invoices'],
};

// Staff roles and their allowed document types
export const STAFF_DOCUMENT_ACCESS = {
  abdul: {
    name: 'Abdul',
    role: 'Accountant',
    allowedTypes: ['supplier_invoice', 'invoice', 'packing_list', 'packing list'],
    description: 'Access to supplier invoices for creating client invoices, access to packing lists',
  },
  marissa: {
    name: 'Marissa',
    role: 'Shipping Coordinator',
    allowedTypes: ['shipping', 'bol', 'bill of lading'],
    description: 'Access to shipping documents',
  },
  shamima: {
    name: 'Shamima',
    role: 'File Costings',
    allowedTypes: ['transport', 'transport_invoice', 'clearing', 'clearing_invoice'],
    description: 'Access for file costings (transport invoices, clearing agent invoices)',
  },
  mo: {
    name: 'MI (Mo)',
    role: 'Admin',
    allowedTypes: ['all'],
    description: 'Full admin access to everything',
  },
};

export function useDocumentAccess() {
  const { permissions, isAdmin, hasPermission, hasAnyPermission } = usePermissions();

  // Check if user can view a specific document type
  const canViewDocumentType = useCallback((documentType: string | null): boolean => {
    // Admins can view everything
    if (isAdmin) return true;
    
    // Check general document view permission
    if (!hasPermission('view_documents')) return false;
    
    // If no document type, allow if they have view_documents
    if (!documentType) return true;
    
    const normalizedType = documentType.toLowerCase();
    
    // Find matching permission requirements
    for (const [typeKey, requiredPermissions] of Object.entries(DOCUMENT_TYPE_PERMISSIONS)) {
      if (normalizedType.includes(typeKey)) {
        return hasAnyPermission(requiredPermissions);
      }
    }
    
    // Default: allow viewing if they have general view_documents permission
    return true;
  }, [isAdmin, hasPermission, hasAnyPermission]);

  // Check if user can download (admin or has download_documents permission)
  const canDownloadWithoutApproval = useCallback((): boolean => {
    if (isAdmin) return true;
    return hasPermission('download_documents');
  }, [isAdmin, hasPermission]);

  // Get the permission reason for a document type
  const getAccessRestrictionReason = useCallback((documentType: string | null): string | null => {
    if (isAdmin) return null;
    if (!documentType) return null;
    
    const normalizedType = documentType.toLowerCase();
    
    for (const [typeKey, requiredPermissions] of Object.entries(DOCUMENT_TYPE_PERMISSIONS)) {
      if (normalizedType.includes(typeKey)) {
        if (!hasAnyPermission(requiredPermissions)) {
          return `You don't have permission to access ${documentType} documents. Please request access from admin.`;
        }
      }
    }
    
    return null;
  }, [isAdmin, hasAnyPermission]);

  return {
    canViewDocumentType,
    canDownloadWithoutApproval,
    getAccessRestrictionReason,
    isAdmin,
  };
}
