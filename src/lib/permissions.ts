// Role-based field filtering for shipments and other entities
// This ensures users only see data relevant to their role

export type AppRole = 'admin' | 'moderator' | 'user' | 'staff' | 'accountant' | 'shipping' | 'file_costing' | 'operations';

// Fields that each role can see for shipments
const SHIPMENT_FIELD_ACCESS: Record<AppRole, string[]> = {
  admin: ['*'], // All fields
  moderator: ['*'],
  user: ['*'],
  staff: [
    'id', 'lot_number', 'status', 'eta', 'delivery_date', 'commodity',
    'supplier_id', 'client_id', 'notes', 'document_submitted', 'telex_released',
    'created_at', 'updated_at'
  ],
  accountant: [
    'id', 'lot_number', 'status', 'eta', 'delivery_date', 'commodity',
    'supplier_id', 'client_id', 'notes', 'document_submitted', 'telex_released',
    'created_at', 'updated_at',
    // Financial fields accountant can see
    'costs' // Will include client_invoice_zar but not supplier costs
  ],
  shipping: [
    'id', 'lot_number', 'status', 'eta', 'delivery_date', 'commodity',
    'supplier_id', 'client_id', 'notes', 'document_submitted', 'telex_released',
    'created_at', 'updated_at'
    // No financial data
  ],
  file_costing: [
    'id', 'lot_number', 'status', 'eta', 'delivery_date', 'commodity',
    'supplier_id', 'client_id', 'notes', 'document_submitted', 'telex_released',
    'created_at', 'updated_at',
    // Costing fields
    'costs' // Will include clearing_cost, transport_cost but not supplier costs or FX
  ],
  operations: [
    // Minimal tracking-only fields
    'id', 'lot_number', 'status', 'eta', 'delivery_date', 'notes',
    'document_submitted', 'telex_released'
  ]
};

// Cost fields each role can see
const COST_FIELD_ACCESS: Record<AppRole, string[]> = {
  admin: ['*'],
  moderator: ['*'],
  user: ['*'],
  staff: [],
  accountant: [
    'id', 'shipment_id', 'client_invoice_zar', 
    'gross_profit_zar', 'net_profit_zar', 'profit_margin'
    // No supplier costs, FX rates, or spread data
  ],
  shipping: [], // No cost access
  file_costing: [
    'id', 'shipment_id', 'clearing_cost', 'transport_cost', 'freight_cost'
    // No supplier costs, FX rates, or client invoice
  ],
  operations: [] // No cost access
};

// Document folder access patterns by role
export const FOLDER_ACCESS_PATTERNS: Record<AppRole, string[]> = {
  admin: ['*'], // All folders
  moderator: ['*'],
  user: ['*'],
  staff: ['/shipments/', '/documents/'],
  accountant: [
    '/statements/',
    '/invoices/',
    '/shipments/',
    '/packing_lists/'
  ],
  shipping: [
    '/shipments/',
    '/shipping_documents/',
    '/new_shipping_documents/',
    '/packing_lists/'
  ],
  file_costing: [
    '/staff_folders/shamima/',
    '/clearing_agent/',
    '/transport/'
  ],
  operations: [] // No document access
};

// Upload folder access by role
export const UPLOAD_FOLDER_ACCESS: Record<AppRole, string[]> = {
  admin: ['*'],
  moderator: ['*'],
  user: [],
  staff: [],
  accountant: [
    '/invoices/client/',
    '/statements/pending/'
  ],
  shipping: [
    '/shipments/',
    '/shipping_documents/',
    '/new_shipping_documents/'
  ],
  file_costing: [
    '/staff_folders/shamima/',
    '/clearing_agent/'
  ],
  operations: []
};

// Filter shipment data based on user role
export function filterShipmentByRole<T extends Record<string, unknown>>(
  shipment: T,
  role: AppRole
): Partial<T> {
  const allowedFields = SHIPMENT_FIELD_ACCESS[role];
  
  // Admin and full-access roles see everything
  if (allowedFields.includes('*')) {
    return shipment;
  }
  
  const filtered: Partial<T> = {};
  
  for (const field of allowedFields) {
    if (field in shipment) {
      filtered[field as keyof T] = shipment[field as keyof T];
    }
  }
  
  return filtered;
}

// Filter cost data based on user role
export function filterCostsByRole<T extends Record<string, unknown>>(
  costs: T | null | undefined,
  role: AppRole
): Partial<T> | null {
  if (!costs) return null;
  
  const allowedFields = COST_FIELD_ACCESS[role];
  
  // No access
  if (allowedFields.length === 0) {
    return null;
  }
  
  // Full access
  if (allowedFields.includes('*')) {
    return costs;
  }
  
  const filtered: Partial<T> = {};
  
  for (const field of allowedFields) {
    if (field in costs) {
      filtered[field as keyof T] = costs[field as keyof T];
    }
  }
  
  return filtered;
}

// Check if user can access a specific folder
export function canAccessFolder(folderPath: string, role: AppRole): boolean {
  const patterns = FOLDER_ACCESS_PATTERNS[role];
  
  if (patterns.includes('*')) return true;
  if (patterns.length === 0) return false;
  
  return patterns.some(pattern => 
    folderPath.toLowerCase().includes(pattern.toLowerCase())
  );
}

// Check if user can upload to a specific folder
export function canUploadToFolder(folderPath: string, role: AppRole): boolean {
  const patterns = UPLOAD_FOLDER_ACCESS[role];
  
  if (patterns.includes('*')) return true;
  if (patterns.length === 0) return false;
  
  return patterns.some(pattern => 
    folderPath.toLowerCase().startsWith(pattern.toLowerCase())
  );
}

// Check if a role can see financial data
export function canSeeFinancials(role: AppRole): boolean {
  return ['admin', 'moderator', 'user', 'accountant'].includes(role);
}

// Check if a role can see supplier costs
export function canSeeSupplierCosts(role: AppRole): boolean {
  return ['admin', 'moderator'].includes(role);
}

// Check if a role can see FX rates
export function canSeeFXRates(role: AppRole): boolean {
  return ['admin', 'moderator'].includes(role);
}

// Check if a role can manage users
export function canManageUsers(role: AppRole): boolean {
  return role === 'admin';
}

// Check if a role can approve download requests
export function canApproveDownloads(role: AppRole): boolean {
  return role === 'admin';
}

// Check if a role can delete documents
export function canDeleteDocuments(role: AppRole): boolean {
  return role === 'admin';
}

// Check if a role has read-only access
export function isReadOnlyRole(role: AppRole): boolean {
  return role === 'operations';
}

// Get role display name
export function getRoleDisplayName(role: AppRole): string {
  const names: Record<AppRole, string> = {
    admin: 'Administrator',
    moderator: 'Moderator',
    user: 'User',
    staff: 'Staff',
    accountant: 'Accountant',
    shipping: 'Shipping Coordinator',
    file_costing: 'File Costing',
    operations: 'Operations (Read-Only)'
  };
  return names[role] || role;
}

// Get role description
export function getRoleDescription(role: AppRole): string {
  const descriptions: Record<AppRole, string> = {
    admin: 'Full access to all features and data',
    moderator: 'Can manage most content and users',
    user: 'Standard user access',
    staff: 'Basic staff access',
    accountant: 'Financial documents, client invoices, packing lists',
    shipping: 'Shipping documents, tracking, packing lists',
    file_costing: 'Clearing and transport cost documents',
    operations: 'Read-only tracking information'
  };
  return descriptions[role] || '';
}
