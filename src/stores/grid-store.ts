import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ViewConfig {
  id: string;
  name: string;
  type: 'grid' | 'kanban' | 'calendar' | 'gallery';
  filters: FilterRule[];
  sorts: SortRule[];
  grouping?: GroupConfig;
  hiddenColumns: string[];
  columnWidths: Record<string, number>;
  columnOrder: string[];
  isPersonal: boolean;
}

export interface FilterRule {
  id: string;
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'between' | 'isEmpty' | 'isNotEmpty';
  value: any;
  logic?: 'and' | 'or';
}

export interface SortRule {
  field: string;
  direction: 'asc' | 'desc';
}

export interface GroupConfig {
  field: string;
  aggregations: { field: string; type: 'sum' | 'count' | 'avg' | 'min' | 'max' }[];
}

export interface CellChange {
  rowId: string;
  columnId: string;
  previousValue: any;
  newValue: any;
  timestamp: number;
}

interface GridState {
  // View state
  currentView: string;
  views: ViewConfig[];
  
  // Grid state
  sorting: SortRule[];
  columnFilters: FilterRule[];
  columnVisibility: Record<string, boolean>;
  columnWidths: Record<string, number>;
  rowSelection: Record<string, boolean>;
  
  // Undo/Redo
  undoStack: CellChange[];
  redoStack: CellChange[];
  
  // Zoom
  zoom: number;
  
  // Actions
  setCurrentView: (viewId: string) => void;
  saveView: (view: ViewConfig) => void;
  deleteView: (viewId: string) => void;
  setSorting: (sorting: SortRule[]) => void;
  setColumnFilters: (filters: FilterRule[]) => void;
  setColumnVisibility: (visibility: Record<string, boolean>) => void;
  setColumnWidth: (columnId: string, width: number) => void;
  setRowSelection: (selection: Record<string, boolean>) => void;
  toggleRowSelection: (rowId: string) => void;
  selectAllRows: (rowIds: string[]) => void;
  clearSelection: () => void;
  resetFilters: () => void;
  
  // Undo/Redo
  pushChange: (change: CellChange) => void;
  undo: () => CellChange | undefined;
  redo: () => CellChange | undefined;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Zoom
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
}

const ZOOM_LEVELS = [50, 75, 100, 125, 150, 175, 200];

export const useGridStore = create<GridState>()(
  persist(
    (set, get) => ({
      currentView: 'default',
      views: [],
      sorting: [],
      columnFilters: [],
      columnVisibility: {},
      columnWidths: {},
      rowSelection: {},
      undoStack: [],
      redoStack: [],
      zoom: 100,
      
      setCurrentView: (viewId) => set({ currentView: viewId }),
      
      saveView: (view) => set((state) => ({ 
        views: [...state.views.filter(v => v.id !== view.id), view] 
      })),
      
      deleteView: (viewId) => set((state) => ({
        views: state.views.filter(v => v.id !== viewId)
      })),
      
      setSorting: (sorting) => set({ sorting }),
      
      setColumnFilters: (columnFilters) => set({ columnFilters }),
      
      setColumnVisibility: (columnVisibility) => set({ columnVisibility }),
      
      setColumnWidth: (columnId, width) => set((state) => ({
        columnWidths: { ...state.columnWidths, [columnId]: width }
      })),
      
      setRowSelection: (rowSelection) => set({ rowSelection }),
      
      toggleRowSelection: (rowId) => set((state) => ({
        rowSelection: {
          ...state.rowSelection,
          [rowId]: !state.rowSelection[rowId]
        }
      })),
      
      selectAllRows: (rowIds) => set({
        rowSelection: Object.fromEntries(rowIds.map(id => [id, true]))
      }),
      
      clearSelection: () => set({ rowSelection: {} }),
      
      resetFilters: () => set({ 
        sorting: [], 
        columnFilters: [], 
        rowSelection: {} 
      }),
      
      pushChange: (change) => set((state) => ({
        undoStack: [...state.undoStack.slice(-50), change], // Keep last 50 changes
        redoStack: [] // Clear redo on new change
      })),
      
      undo: () => {
        const state = get();
        const change = state.undoStack[state.undoStack.length - 1];
        if (change) {
          set({
            undoStack: state.undoStack.slice(0, -1),
            redoStack: [...state.redoStack, change]
          });
        }
        return change;
      },
      
      redo: () => {
        const state = get();
        const change = state.redoStack[state.redoStack.length - 1];
        if (change) {
          set({
            redoStack: state.redoStack.slice(0, -1),
            undoStack: [...state.undoStack, change]
          });
        }
        return change;
      },
      
      canUndo: () => get().undoStack.length > 0,
      canRedo: () => get().redoStack.length > 0,
      
      setZoom: (zoom) => set({ zoom }),
      
      zoomIn: () => {
        const currentIndex = ZOOM_LEVELS.indexOf(get().zoom);
        if (currentIndex < ZOOM_LEVELS.length - 1) {
          set({ zoom: ZOOM_LEVELS[currentIndex + 1] });
        }
      },
      
      zoomOut: () => {
        const currentIndex = ZOOM_LEVELS.indexOf(get().zoom);
        if (currentIndex > 0) {
          set({ zoom: ZOOM_LEVELS[currentIndex - 1] });
        }
      },
      
      resetZoom: () => set({ zoom: 100 }),
    }),
    { 
      name: 'grid-storage',
      partialize: (state) => ({
        currentView: state.currentView,
        views: state.views,
        columnVisibility: state.columnVisibility,
        columnWidths: state.columnWidths,
        zoom: state.zoom,
      })
    }
  )
);
