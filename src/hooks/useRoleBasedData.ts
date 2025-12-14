import { useMemo } from 'react';
import { usePermissions, AppRole } from '@/hooks/usePermissions';
import { 
  filterShipmentByRole, 
  filterCostsByRole, 
  canSeeFinancials, 
  canSeeSupplierCosts, 
  canSeeFXRates,
  canAccessFolder,
  canUploadToFolder,
  canManageUsers,
  canApproveDownloads,
  canDeleteDocuments,
  isReadOnlyRole
} from '@/lib/permissions';

export interface ShipmentWithCosts {
  id: string;
  lot_number: string;
  status: string;
  eta?: string | null;
  delivery_date?: string | null;
  commodity?: string | null;
  supplier_id?: string | null;
  client_id?: string | null;
  notes?: string | null;
  document_submitted?: boolean;
  telex_released?: boolean;
  created_at?: string;
  updated_at?: string;
  supplier?: { name: string } | null;
  client?: { name: string } | null;
  costs?: Record<string, unknown> | null;
}

export function useRoleBasedData() {
  const { role, isAdmin, loading } = usePermissions();
  
  const userRole = (role || 'user') as AppRole;

  // Memoized permission checks
  const permissions = useMemo(() => ({
    canSeeFinancials: canSeeFinancials(userRole),
    canSeeSupplierCosts: canSeeSupplierCosts(userRole),
    canSeeFXRates: canSeeFXRates(userRole),
    canManageUsers: canManageUsers(userRole),
    canApproveDownloads: canApproveDownloads(userRole),
    canDeleteDocuments: canDeleteDocuments(userRole),
    isReadOnly: isReadOnlyRole(userRole),
    isAdmin
  }), [userRole, isAdmin]);

  // Filter shipment data based on role
  const filterShipment = <T extends Record<string, unknown>>(shipment: T): Partial<T> => {
    return filterShipmentByRole(shipment, userRole);
  };

  // Filter array of shipments
  const filterShipments = <T extends Record<string, unknown>>(shipments: T[]): Partial<T>[] => {
    return shipments.map(s => filterShipmentByRole(s, userRole));
  };

  // Filter costs data
  const filterCosts = <T extends Record<string, unknown>>(costs: T | null | undefined): Partial<T> | null => {
    return filterCostsByRole(costs, userRole);
  };

  // Check folder access
  const checkFolderAccess = (folderPath: string): boolean => {
    return canAccessFolder(folderPath, userRole);
  };

  // Check upload access
  const checkUploadAccess = (folderPath: string): boolean => {
    return canUploadToFolder(folderPath, userRole);
  };

  // Get visible shipment fields for the current role
  const getVisibleShipmentFields = (): string[] => {
    if (isAdmin) return ['*'];
    
    switch (userRole) {
      case 'operations':
        return ['lot_number', 'status', 'eta', 'delivery_date', 'notes', 'document_submitted', 'telex_released'];
      case 'accountant':
        return ['lot_number', 'status', 'eta', 'delivery_date', 'commodity', 'supplier', 'client', 'notes', 'document_submitted', 'telex_released', 'client_invoice_zar'];
      case 'shipping':
        return ['lot_number', 'status', 'eta', 'delivery_date', 'commodity', 'supplier', 'client', 'notes', 'document_submitted', 'telex_released'];
      case 'file_costing':
        return ['lot_number', 'status', 'eta', 'delivery_date', 'commodity', 'supplier', 'client', 'notes', 'clearing_cost', 'transport_cost', 'freight_cost'];
      default:
        return ['*'];
    }
  };

  // Check if a specific field should be visible
  const isFieldVisible = (fieldName: string): boolean => {
    const visibleFields = getVisibleShipmentFields();
    if (visibleFields.includes('*')) return true;
    return visibleFields.includes(fieldName);
  };

  return {
    role: userRole,
    loading,
    permissions,
    filterShipment,
    filterShipments,
    filterCosts,
    checkFolderAccess,
    checkUploadAccess,
    getVisibleShipmentFields,
    isFieldVisible
  };
}
