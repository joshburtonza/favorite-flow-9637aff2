import { create } from 'zustand';

export type SortBy = 'name' | 'date' | 'size' | 'type';
export type SortOrder = 'asc' | 'desc';
export type ViewMode = 'grid' | 'list';

interface ClipboardItem {
  id: string;
  type: 'file' | 'folder';
  name: string;
}

interface FileManagerState {
  // Navigation
  currentFolderId: string | null;
  navigationHistory: string[];
  historyIndex: number;
  
  // Selection
  selectedItems: Set<string>;
  lastSelectedItem: string | null;
  
  // View
  viewMode: ViewMode;
  sortBy: SortBy;
  sortOrder: SortOrder;
  expandedFolders: Set<string>;
  
  // Clipboard
  clipboard: {
    items: ClipboardItem[];
    operation: 'cut' | 'copy';
  } | null;
  
  // Search & Filter
  searchQuery: string;
  filterTags: string[];
  filterType: string | null;
  filterDateRange: { start: Date | null; end: Date | null };
  
  // UI State
  isUploading: boolean;
  uploadProgress: Map<string, number>;
  isDraggingOver: boolean;
  previewFileId: string | null;
  contextMenuPosition: { x: number; y: number } | null;
  
  // Actions
  setCurrentFolder: (folderId: string | null) => void;
  navigateBack: () => void;
  navigateForward: () => void;
  
  selectItem: (id: string, ctrlKey?: boolean, shiftKey?: boolean) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  
  setViewMode: (mode: ViewMode) => void;
  setSortBy: (sortBy: SortBy) => void;
  setSortOrder: (order: SortOrder) => void;
  toggleFolderExpanded: (folderId: string) => void;
  
  copyItems: (items: ClipboardItem[]) => void;
  cutItems: (items: ClipboardItem[]) => void;
  clearClipboard: () => void;
  
  setSearchQuery: (query: string) => void;
  setFilterTags: (tags: string[]) => void;
  setFilterType: (type: string | null) => void;
  setFilterDateRange: (start: Date | null, end: Date | null) => void;
  clearFilters: () => void;
  
  setIsUploading: (uploading: boolean) => void;
  setUploadProgress: (fileId: string, progress: number) => void;
  clearUploadProgress: (fileId: string) => void;
  setIsDraggingOver: (dragging: boolean) => void;
  setPreviewFileId: (fileId: string | null) => void;
  setContextMenuPosition: (position: { x: number; y: number } | null) => void;
}

export const useFileManagerStore = create<FileManagerState>((set, get) => ({
  // Initial state
  currentFolderId: null,
  navigationHistory: [],
  historyIndex: -1,
  
  selectedItems: new Set(),
  lastSelectedItem: null,
  
  viewMode: 'grid',
  sortBy: 'name',
  sortOrder: 'asc',
  expandedFolders: new Set(),
  
  clipboard: null,
  
  searchQuery: '',
  filterTags: [],
  filterType: null,
  filterDateRange: { start: null, end: null },
  
  isUploading: false,
  uploadProgress: new Map(),
  isDraggingOver: false,
  previewFileId: null,
  contextMenuPosition: null,
  
  // Navigation actions
  setCurrentFolder: (folderId) => {
    const { navigationHistory, historyIndex } = get();
    const newHistory = [...navigationHistory.slice(0, historyIndex + 1), folderId];
    set({
      currentFolderId: folderId,
      navigationHistory: newHistory,
      historyIndex: newHistory.length - 1,
      selectedItems: new Set(),
      lastSelectedItem: null,
    });
  },
  
  navigateBack: () => {
    const { navigationHistory, historyIndex } = get();
    if (historyIndex > 0) {
      set({
        historyIndex: historyIndex - 1,
        currentFolderId: navigationHistory[historyIndex - 1],
        selectedItems: new Set(),
      });
    }
  },
  
  navigateForward: () => {
    const { navigationHistory, historyIndex } = get();
    if (historyIndex < navigationHistory.length - 1) {
      set({
        historyIndex: historyIndex + 1,
        currentFolderId: navigationHistory[historyIndex + 1],
        selectedItems: new Set(),
      });
    }
  },
  
  // Selection actions
  selectItem: (id, ctrlKey = false, shiftKey = false) => {
    const { selectedItems, lastSelectedItem } = get();
    
    if (ctrlKey) {
      // Toggle selection
      const newSelection = new Set(selectedItems);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      set({ selectedItems: newSelection, lastSelectedItem: id });
    } else if (shiftKey && lastSelectedItem) {
      // Range selection would need document list context
      // For now, just add to selection
      const newSelection = new Set(selectedItems);
      newSelection.add(id);
      set({ selectedItems: newSelection });
    } else {
      // Single selection
      set({ selectedItems: new Set([id]), lastSelectedItem: id });
    }
  },
  
  selectAll: (ids) => {
    set({ selectedItems: new Set(ids) });
  },
  
  clearSelection: () => {
    set({ selectedItems: new Set(), lastSelectedItem: null });
  },
  
  // View actions
  setViewMode: (mode) => set({ viewMode: mode }),
  setSortBy: (newSortBy) => set({ sortBy: newSortBy }),
  setSortOrder: (order) => set({ sortOrder: order }),
  
  toggleFolderExpanded: (folderId) => {
    const { expandedFolders } = get();
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    set({ expandedFolders: newExpanded });
  },
  
  // Clipboard actions
  copyItems: (items) => set({ clipboard: { items, operation: 'copy' } }),
  cutItems: (items) => set({ clipboard: { items, operation: 'cut' } }),
  clearClipboard: () => set({ clipboard: null }),
  
  // Search & Filter actions
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterTags: (tags) => set({ filterTags: tags }),
  setFilterType: (type) => set({ filterType: type }),
  setFilterDateRange: (start, end) => set({ filterDateRange: { start, end } }),
  clearFilters: () => set({
    searchQuery: '',
    filterTags: [],
    filterType: null,
    filterDateRange: { start: null, end: null },
  }),
  
  // UI State actions
  setIsUploading: (uploading) => set({ isUploading: uploading }),
  setUploadProgress: (fileId, progress) => {
    const { uploadProgress } = get();
    const newProgress = new Map(uploadProgress);
    newProgress.set(fileId, progress);
    set({ uploadProgress: newProgress });
  },
  clearUploadProgress: (fileId) => {
    const { uploadProgress } = get();
    const newProgress = new Map(uploadProgress);
    newProgress.delete(fileId);
    set({ uploadProgress: newProgress });
  },
  setIsDraggingOver: (dragging) => set({ isDraggingOver: dragging }),
  setPreviewFileId: (fileId) => set({ previewFileId: fileId }),
  setContextMenuPosition: (position) => set({ contextMenuPosition: position }),
}));
