import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────

export interface BudgetItem {
  id: string;
  name: string;
  estimatedCost: number;
  actualCost: number | null;
  quantity: number;
  isPaid: boolean;
  notes: string;
  sortOrder: number;
}

export interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
  items: BudgetItem[];
  sortOrder: number;
  color: string;
}

interface BudgetState {
  // Data
  budgetName: string;
  totalBudget: number;
  categories: BudgetCategory[];

  // UI state
  activeCategoryId: string | null;
  isDragging: boolean;

  // Actions — Budget level
  setBudgetName: (name: string) => void;
  setTotalBudget: (amount: number) => void;

  // Actions — Category level
  addCategory: (name: string, color?: string) => void;
  removeCategory: (categoryId: string) => void;
  renameCategory: (categoryId: string, name: string) => void;
  setCategoryAllocation: (categoryId: string, amount: number) => void;
  reorderCategories: (fromIndex: number, toIndex: number) => void;

  // Actions — Item level
  addItem: (categoryId: string, item: Omit<BudgetItem, "id" | "sortOrder">) => void;
  removeItem: (categoryId: string, itemId: string) => void;
  updateItem: (categoryId: string, itemId: string, updates: Partial<BudgetItem>) => void;
  moveItem: (fromCategoryId: string, toCategoryId: string, itemId: string) => void;
  reorderItems: (categoryId: string, fromIndex: number, toIndex: number) => void;

  // Actions — UI
  setActiveCategoryId: (id: string | null) => void;
  setIsDragging: (dragging: boolean) => void;

  // Actions — Bulk
  loadTemplate: (template: Pick<BudgetState, "totalBudget" | "categories">) => void;
  reset: () => void;

  // Computed (as getters aren't reactive in zustand, use selectors externally)
}

// ─── Helpers ──────────────────────────────────────────────────

let _id = 0;
function genId() {
  return `budget_${Date.now()}_${++_id}`;
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy.map((el, i) => ({ ...el, sortOrder: i }));
}

// ─── Default categories ──────────────────────────────────────

const DEFAULT_CATEGORIES: BudgetCategory[] = [
  { id: genId(), name: "Venue & Hospitality", allocated: 0, items: [], sortOrder: 0, color: "#C9A96E" },
  { id: genId(), name: "Decor & Design", allocated: 0, items: [], sortOrder: 1, color: "#D4A0A0" },
  { id: genId(), name: "Catering", allocated: 0, items: [], sortOrder: 2, color: "#9CAF88" },
  { id: genId(), name: "Photography & Video", allocated: 0, items: [], sortOrder: 3, color: "#7BA7C9" },
  { id: genId(), name: "Makeup & Styling", allocated: 0, items: [], sortOrder: 4, color: "#C4956A" },
  { id: genId(), name: "Entertainment", allocated: 0, items: [], sortOrder: 5, color: "#D4A843" },
  { id: genId(), name: "Travel & Logistics", allocated: 0, items: [], sortOrder: 6, color: "#8B7EC8" },
  { id: genId(), name: "Miscellaneous", allocated: 0, items: [], sortOrder: 7, color: "#6B7280" },
];

// ─── Store ────────────────────────────────────────────────────

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set) => ({
      // Initial state
      budgetName: "My Wedding Budget",
      totalBudget: 2500000,
      categories: DEFAULT_CATEGORIES,
      activeCategoryId: null,
      isDragging: false,

      // Budget level
      setBudgetName: (name) => set({ budgetName: name }),
      setTotalBudget: (amount) => set({ totalBudget: amount }),

      // Category level
      addCategory: (name, color = "#6B7280") =>
        set((state) => ({
          categories: [
            ...state.categories,
            {
              id: genId(),
              name,
              allocated: 0,
              items: [],
              sortOrder: state.categories.length,
              color,
            },
          ],
        })),

      removeCategory: (categoryId) =>
        set((state) => ({
          categories: state.categories
            .filter((c) => c.id !== categoryId)
            .map((c, i) => ({ ...c, sortOrder: i })),
        })),

      renameCategory: (categoryId, name) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === categoryId ? { ...c, name } : c
          ),
        })),

      setCategoryAllocation: (categoryId, amount) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === categoryId ? { ...c, allocated: amount } : c
          ),
        })),

      reorderCategories: (fromIndex, toIndex) =>
        set((state) => ({
          categories: arrayMove(state.categories, fromIndex, toIndex),
        })),

      // Item level
      addItem: (categoryId, item) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === categoryId
              ? {
                  ...c,
                  items: [
                    ...c.items,
                    { ...item, id: genId(), sortOrder: c.items.length },
                  ],
                }
              : c
          ),
        })),

      removeItem: (categoryId, itemId) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === categoryId
              ? {
                  ...c,
                  items: c.items
                    .filter((item) => item.id !== itemId)
                    .map((item, i) => ({ ...item, sortOrder: i })),
                }
              : c
          ),
        })),

      updateItem: (categoryId, itemId, updates) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === categoryId
              ? {
                  ...c,
                  items: c.items.map((item) =>
                    item.id === itemId ? { ...item, ...updates } : item
                  ),
                }
              : c
          ),
        })),

      moveItem: (fromCategoryId, toCategoryId, itemId) =>
        set((state) => {
          const fromCat = state.categories.find((c) => c.id === fromCategoryId);
          if (!fromCat) return state;

          const item = fromCat.items.find((i) => i.id === itemId);
          if (!item) return state;

          return {
            categories: state.categories.map((c) => {
              if (c.id === fromCategoryId) {
                return {
                  ...c,
                  items: c.items
                    .filter((i) => i.id !== itemId)
                    .map((i, idx) => ({ ...i, sortOrder: idx })),
                };
              }
              if (c.id === toCategoryId) {
                return {
                  ...c,
                  items: [
                    ...c.items,
                    { ...item, sortOrder: c.items.length },
                  ],
                };
              }
              return c;
            }),
          };
        }),

      reorderItems: (categoryId, fromIndex, toIndex) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === categoryId
              ? { ...c, items: arrayMove(c.items, fromIndex, toIndex) }
              : c
          ),
        })),

      // UI
      setActiveCategoryId: (id) => set({ activeCategoryId: id }),
      setIsDragging: (dragging) => set({ isDragging: dragging }),

      // Bulk
      loadTemplate: (template) =>
        set({
          totalBudget: template.totalBudget,
          categories: template.categories,
          activeCategoryId: null,
        }),

      reset: () =>
        set({
          budgetName: "My Wedding Budget",
          totalBudget: 2500000,
          categories: DEFAULT_CATEGORIES,
          activeCategoryId: null,
          isDragging: false,
        }),
    }),
    {
      name: "elysian-budget",
      partialize: (state) => ({
        budgetName: state.budgetName,
        totalBudget: state.totalBudget,
        categories: state.categories,
      }),
      skipHydration: true,
    }
  )
);

// ─── Selectors ────────────────────────────────────────────────

export const selectTotalSpent = (state: BudgetState) =>
  state.categories.reduce(
    (total, cat) =>
      total +
      cat.items.reduce(
        (catTotal, item) => catTotal + item.estimatedCost * item.quantity,
        0
      ),
    0
  );

export const selectTotalActual = (state: BudgetState) =>
  state.categories.reduce(
    (total, cat) =>
      total +
      cat.items.reduce(
        (catTotal, item) => catTotal + (item.actualCost ?? 0) * item.quantity,
        0
      ),
    0
  );

export const selectCategoryTotals = (state: BudgetState) =>
  state.categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    color: cat.color,
    estimated: cat.items.reduce(
      (total, item) => total + item.estimatedCost * item.quantity,
      0
    ),
    actual: cat.items.reduce(
      (total, item) => total + (item.actualCost ?? 0) * item.quantity,
      0
    ),
    itemCount: cat.items.length,
  }));

export const selectBudgetRemaining = (state: BudgetState) =>
  state.totalBudget - selectTotalSpent(state);

export const selectBudgetUsedPercent = (state: BudgetState) =>
  state.totalBudget > 0
    ? Math.round((selectTotalSpent(state) / state.totalBudget) * 100)
    : 0;

export const selectIsOverBudget = (state: BudgetState) =>
  selectTotalSpent(state) > state.totalBudget;
