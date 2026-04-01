import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  BUDGET_CATEGORY_BLUEPRINTS,
  budgetColorForCategory,
  recommendedAllocation,
} from "@/lib/budget-blueprint";

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
  hydrateBudget: (budget: {
    budgetName: string;
    totalBudget: number;
    categories: BudgetCategory[];
  }) => void;
  rebalanceAllocations: () => void;

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
  moveItem: (
    fromCategoryId: string,
    toCategoryId: string,
    itemId: string,
    targetIndex?: number
  ) => void;
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

function createDefaultCategories(totalBudget: number): BudgetCategory[] {
  return BUDGET_CATEGORY_BLUEPRINTS.map((category, index) => ({
    id: genId(),
    name: category.name,
    allocated: recommendedAllocation(category.name, totalBudget),
    items: [],
    sortOrder: index,
    color: category.color,
  }));
}

// ─── Default categories ──────────────────────────────────────

const DEFAULT_TOTAL_BUDGET = 2500000;
const DEFAULT_CATEGORIES: BudgetCategory[] = createDefaultCategories(
  DEFAULT_TOTAL_BUDGET
);

// ─── Store ────────────────────────────────────────────────────

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set) => ({
      // Initial state
      budgetName: "Wedding Investment Plan",
      totalBudget: DEFAULT_TOTAL_BUDGET,
      categories: DEFAULT_CATEGORIES,
      activeCategoryId: null,
      isDragging: false,

      // Budget level
      setBudgetName: (name) => set({ budgetName: name }),
      setTotalBudget: (amount) => set({ totalBudget: amount }),
      hydrateBudget: (budget) =>
        set({
          budgetName: budget.budgetName,
          totalBudget: budget.totalBudget,
          categories: budget.categories.map((category, index) => ({
            ...category,
            sortOrder: index,
            color: category.color || budgetColorForCategory(category.name),
            items: category.items
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item, itemIndex) => ({
                ...item,
                sortOrder: itemIndex,
              })),
          })),
          activeCategoryId: budget.categories[0]?.id ?? null,
        }),
      rebalanceAllocations: () =>
        set((state) => ({
          categories: state.categories.map((category) => ({
            ...category,
            allocated: recommendedAllocation(category.name, state.totalBudget),
          })),
        })),

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
              color: color || budgetColorForCategory(name),
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

      moveItem: (fromCategoryId, toCategoryId, itemId, targetIndex) =>
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
                const insertAt = Math.max(
                  0,
                  Math.min(
                    typeof targetIndex === "number" ? targetIndex : c.items.length,
                    c.items.length
                  )
                );
                const nextItems = [...c.items];
                nextItems.splice(insertAt, 0, { ...item, sortOrder: insertAt });
                return {
                  ...c,
                  items: nextItems.map((entry, idx) => ({
                    ...entry,
                    sortOrder: idx,
                  })),
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
          budgetName: "Wedding Investment Plan",
          totalBudget: DEFAULT_TOTAL_BUDGET,
          categories: createDefaultCategories(DEFAULT_TOTAL_BUDGET),
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
