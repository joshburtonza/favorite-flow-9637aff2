// Pre-defined test items and interview questions for the testing and interview systems

export interface TestItem {
  key: string;
  name: string;
  description: string;
  category: string;
}

export interface InterviewQuestion {
  key: string;
  question: string;
  type: 'text' | 'rating' | 'multiple_choice' | 'checklist';
  options?: string[];
  required?: boolean;
}

// =====================================================
// TESTING CHECKLIST DEFINITIONS
// =====================================================

export const testCategories = [
  'Authentication',
  'Shipments',
  'Suppliers',
  'Clients',
  'Documents',
  'File Management',
  'Invoices',
  'Tasks',
  'Messages',
  'Calendar',
  'FLAIR AI',
  'Reports & Export',
  'Settings & Admin',
] as const;

export type TestCategory = typeof testCategories[number];

export const testItems: TestItem[] = [
  // Authentication
  { key: 'auth_login', name: 'User Login', description: 'Login with email and password', category: 'Authentication' },
  { key: 'auth_logout', name: 'User Logout', description: 'Sign out and redirect to login', category: 'Authentication' },
  { key: 'auth_password_reset', name: 'Password Reset', description: 'Request and complete password reset', category: 'Authentication' },
  { key: 'auth_session', name: 'Session Persistence', description: 'Session persists after browser refresh', category: 'Authentication' },
  
  // Shipments
  { key: 'shipment_create', name: 'Create Shipment', description: 'Create a new shipment with lot number', category: 'Shipments' },
  { key: 'shipment_view', name: 'View Shipment Details', description: 'Open and view shipment details page', category: 'Shipments' },
  { key: 'shipment_update', name: 'Update Shipment', description: 'Edit shipment information', category: 'Shipments' },
  { key: 'shipment_delete', name: 'Delete Shipment', description: 'Remove a shipment from the system', category: 'Shipments' },
  { key: 'shipment_status', name: 'Change Status', description: 'Update shipment status through workflow', category: 'Shipments' },
  { key: 'shipment_costs', name: 'Manage Costs', description: 'Add and update shipment costs', category: 'Shipments' },
  { key: 'shipment_timeline', name: 'Timeline View', description: 'View shipment status timeline', category: 'Shipments' },
  { key: 'shipment_search', name: 'Search Shipments', description: 'Search and filter shipments list', category: 'Shipments' },
  
  // Suppliers
  { key: 'supplier_create', name: 'Create Supplier', description: 'Add a new supplier', category: 'Suppliers' },
  { key: 'supplier_view', name: 'View Supplier', description: 'Open supplier detail page', category: 'Suppliers' },
  { key: 'supplier_update', name: 'Update Supplier', description: 'Edit supplier information', category: 'Suppliers' },
  { key: 'supplier_ledger', name: 'View Ledger', description: 'View supplier transaction ledger', category: 'Suppliers' },
  { key: 'supplier_balance', name: 'Check Balance', description: 'Verify supplier balance calculation', category: 'Suppliers' },
  
  // Clients
  { key: 'client_create', name: 'Create Client', description: 'Add a new client', category: 'Clients' },
  { key: 'client_view', name: 'View Client', description: 'Open client detail page', category: 'Clients' },
  { key: 'client_update', name: 'Update Client', description: 'Edit client information', category: 'Clients' },
  { key: 'client_invoices', name: 'Client Invoices', description: 'View invoices linked to client', category: 'Clients' },
  
  // Documents
  { key: 'doc_upload', name: 'Upload Document', description: 'Upload a new document', category: 'Documents' },
  { key: 'doc_preview', name: 'Preview Document', description: 'Preview document in modal', category: 'Documents' },
  { key: 'doc_download', name: 'Download Document', description: 'Download document to device', category: 'Documents' },
  { key: 'doc_workflow', name: 'Document Workflow', description: 'Move document through workflow stages', category: 'Documents' },
  { key: 'doc_extraction', name: 'AI Extraction', description: 'AI extracts data from uploaded document', category: 'Documents' },
  
  // File Management
  { key: 'file_upload', name: 'File Upload', description: 'Upload files to file browser', category: 'File Management' },
  { key: 'file_folder_create', name: 'Create Folder', description: 'Create new folder in file browser', category: 'File Management' },
  { key: 'file_move', name: 'Move File/Folder', description: 'Drag and drop to move items', category: 'File Management' },
  { key: 'file_rename', name: 'Rename Item', description: 'Rename file or folder', category: 'File Management' },
  { key: 'file_delete', name: 'Delete to Trash', description: 'Move items to trash', category: 'File Management' },
  { key: 'file_restore', name: 'Restore from Trash', description: 'Restore deleted items', category: 'File Management' },
  { key: 'file_search', name: 'File Search', description: 'Search files by name', category: 'File Management' },
  
  // Invoices
  { key: 'invoice_create', name: 'Create Invoice', description: 'Generate a new client invoice', category: 'Invoices' },
  { key: 'invoice_edit', name: 'Edit Invoice', description: 'Modify invoice details', category: 'Invoices' },
  { key: 'invoice_pdf', name: 'Export PDF', description: 'Export invoice as PDF', category: 'Invoices' },
  { key: 'invoice_status', name: 'Update Status', description: 'Mark invoice as paid/pending', category: 'Invoices' },
  { key: 'file_costing_create', name: 'Create File Costing', description: 'Create file costing record', category: 'Invoices' },
  { key: 'file_costing_finalize', name: 'Finalize Costing', description: 'Finalize and lock file costing', category: 'Invoices' },
  
  // Tasks
  { key: 'task_create', name: 'Create Task', description: 'Create a new task', category: 'Tasks' },
  { key: 'task_assign', name: 'Assign Task', description: 'Assign task to team member', category: 'Tasks' },
  { key: 'task_complete', name: 'Complete Task', description: 'Mark task as completed', category: 'Tasks' },
  { key: 'task_filter', name: 'Filter Tasks', description: 'Filter by status/assignee', category: 'Tasks' },
  
  // Messages
  { key: 'message_send', name: 'Send Message', description: 'Send a new message', category: 'Messages' },
  { key: 'message_mention', name: '@Mention User', description: 'Mention a team member', category: 'Messages' },
  { key: 'message_realtime', name: 'Real-time Updates', description: 'Messages appear without refresh', category: 'Messages' },
  { key: 'message_read', name: 'Read Receipts', description: 'Messages marked as read', category: 'Messages' },
  
  // Calendar
  { key: 'calendar_create', name: 'Create Event', description: 'Create a new calendar event', category: 'Calendar' },
  { key: 'calendar_edit', name: 'Edit Event', description: 'Modify event details', category: 'Calendar' },
  { key: 'calendar_delete', name: 'Delete Event', description: 'Remove calendar event', category: 'Calendar' },
  { key: 'calendar_view', name: 'Calendar Views', description: 'Switch between day/week/month views', category: 'Calendar' },
  
  // FLAIR AI
  { key: 'flair_query', name: 'AI Query', description: 'Ask FLAIR a question', category: 'FLAIR AI' },
  { key: 'flair_shipment', name: 'Shipment Query', description: 'Query shipment information via FLAIR', category: 'FLAIR AI' },
  { key: 'flair_financial', name: 'Financial Query', description: 'Query financial data via FLAIR', category: 'FLAIR AI' },
  { key: 'flair_create', name: 'AI Create Action', description: 'Create records via FLAIR commands', category: 'FLAIR AI' },
  
  // Reports & Export
  { key: 'export_excel', name: 'Export to Excel', description: 'Export data to Excel format', category: 'Reports & Export' },
  { key: 'export_pdf', name: 'Export to PDF', description: 'Generate PDF reports', category: 'Reports & Export' },
  { key: 'financial_reports', name: 'Financial Reports', description: 'View financial summary reports', category: 'Reports & Export' },
  { key: 'import_data', name: 'Bulk Import', description: 'Import data from spreadsheet', category: 'Reports & Export' },
  
  // Settings & Admin
  { key: 'admin_team', name: 'Team Management', description: 'Invite and manage team members', category: 'Settings & Admin' },
  { key: 'admin_roles', name: 'Role Permissions', description: 'View and manage roles', category: 'Settings & Admin' },
  { key: 'admin_security', name: 'Security Center', description: 'Review security requests', category: 'Settings & Admin' },
  { key: 'admin_announcements', name: 'Announcements', description: 'Create team announcements', category: 'Settings & Admin' },
  { key: 'admin_activity', name: 'Activity Log', description: 'View system activity log', category: 'Settings & Admin' },
];

// =====================================================
// STAFF INTERVIEW QUESTIONS
// =====================================================

export const interviewQuestions: InterviewQuestion[] = [
  // Role & Background
  {
    key: 'role_title',
    question: 'What is your current role/job title?',
    type: 'text',
    required: true,
  },
  {
    key: 'role_tenure',
    question: 'How long have you been in this role?',
    type: 'multiple_choice',
    options: ['Less than 6 months', '6-12 months', '1-2 years', '2-5 years', 'More than 5 years'],
    required: true,
  },
  {
    key: 'role_description',
    question: 'Briefly describe your main responsibilities in 2-3 sentences.',
    type: 'text',
    required: true,
  },
  
  // Daily Tasks
  {
    key: 'daily_tasks',
    question: 'Which of these tasks do you perform daily? (Select all that apply)',
    type: 'checklist',
    options: [
      'Creating/updating shipments',
      'Managing supplier communications',
      'Client invoicing',
      'Document processing',
      'Financial tracking',
      'Task management',
      'Team coordination',
      'Report generation',
      'Data entry',
      'Customer support',
    ],
  },
  {
    key: 'task_time_most',
    question: 'What task takes up most of your time each day?',
    type: 'text',
    required: true,
  },
  {
    key: 'task_time_hours',
    question: 'Approximately how many hours per day do you spend on the most time-consuming task?',
    type: 'multiple_choice',
    options: ['Less than 1 hour', '1-2 hours', '2-4 hours', '4-6 hours', 'More than 6 hours'],
  },
  
  // Current Tools
  {
    key: 'current_tools',
    question: 'What tools/software do you currently use for your work? (Select all that apply)',
    type: 'checklist',
    options: [
      'Excel/Google Sheets',
      'Email (Outlook/Gmail)',
      'WhatsApp/Telegram',
      'Physical paper files',
      'Accounting software',
      'Custom internal tools',
      'Other cloud apps',
    ],
  },
  {
    key: 'tool_frustrations',
    question: 'What frustrates you most about your current tools/processes?',
    type: 'text',
    required: true,
  },
  
  // Pain Points
  {
    key: 'biggest_challenge',
    question: 'What is the biggest challenge you face in your daily work?',
    type: 'text',
    required: true,
  },
  {
    key: 'repetitive_tasks',
    question: 'Are there any repetitive tasks you wish could be automated?',
    type: 'text',
  },
  {
    key: 'information_access',
    question: 'How easy is it to find the information you need? (1 = Very Difficult, 5 = Very Easy)',
    type: 'rating',
  },
  {
    key: 'communication_rating',
    question: 'How would you rate team communication currently? (1 = Poor, 5 = Excellent)',
    type: 'rating',
  },
  
  // Feature Wishlist
  {
    key: 'feature_wishlist',
    question: 'If you could add any feature to make your job easier, what would it be?',
    type: 'text',
    required: true,
  },
  {
    key: 'priority_features',
    question: 'Which areas need the most improvement? (Rank your top 3)',
    type: 'checklist',
    options: [
      'Document management',
      'Financial tracking',
      'Communication tools',
      'Reporting/analytics',
      'Automation',
      'Mobile access',
      'Search functionality',
      'User interface/design',
    ],
  },
  
  // Platform Expectations
  {
    key: 'platform_experience',
    question: 'How comfortable are you with learning new software? (1 = Not comfortable, 5 = Very comfortable)',
    type: 'rating',
  },
  {
    key: 'training_preference',
    question: 'How do you prefer to learn new systems?',
    type: 'multiple_choice',
    options: [
      'Written documentation',
      'Video tutorials',
      'One-on-one training',
      'Group training sessions',
      'Learning by doing',
    ],
  },
  {
    key: 'additional_feedback',
    question: 'Any additional thoughts, concerns, or suggestions?',
    type: 'text',
  },
];

// Helper to get test items by category
export const getTestItemsByCategory = (category: string): TestItem[] => {
  return testItems.filter(item => item.category === category);
};

// Helper to get all categories with their item counts
export const getCategoryStats = () => {
  const stats: Record<string, number> = {};
  testCategories.forEach(cat => {
    stats[cat] = testItems.filter(item => item.category === cat).length;
  });
  return stats;
};
