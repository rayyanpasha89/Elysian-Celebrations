import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";
import {
  BUDGET_CATEGORY_BLUEPRINTS,
  budgetColorForCategory,
  recommendedAllocation,
} from "@/lib/budget-blueprint";

type BudgetPayload = {
  budgetName: string;
  totalBudget: number;
  categories: {
    id: string;
    name: string;
    allocated: number;
    sortOrder: number;
    color: string;
    items: {
      id: string;
      name: string;
      estimatedCost: number;
      actualCost: number | null;
      quantity: number;
      isPaid: boolean;
      notes: string;
      sortOrder: number;
    }[];
  }[];
};

async function getClientProfileId(userId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: profile, error } = await supabase
    .from("client_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return profile?.id ?? null;
}

async function getOrCreateBudget(profileId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: existing, error } = await supabase
    .from("budgets")
    .select("id, name, total_budget")
    .eq("client_profile_id", profileId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (existing) {
    return existing;
  }

  const { data: created, error: insertErr } = await supabase
    .from("budgets")
    .insert({
      client_profile_id: profileId,
      name: "Wedding Investment Plan",
      total_budget: 2500000,
    })
    .select("id, name, total_budget")
    .single();

  if (insertErr || !created) {
    throw insertErr ?? new Error("Could not create budget");
  }

  return created;
}

async function ensureDefaultCategories(budgetId: string, totalBudget: number) {
  const supabase = createAdminSupabaseClient();
  const { data: existing, error } = await supabase
    .from("budget_categories")
    .select("id")
    .eq("budget_id", budgetId)
    .limit(1);

  if (error) {
    throw error;
  }

  if ((existing ?? []).length > 0) {
    return;
  }

  const { error: insertErr } = await supabase.from("budget_categories").insert(
    BUDGET_CATEGORY_BLUEPRINTS.map((category, index) => ({
      budget_id: budgetId,
      name: category.name,
      allocated: recommendedAllocation(category.name, totalBudget),
      sort_order: index,
    }))
  );

  if (insertErr) {
    throw insertErr;
  }
}

async function loadBudgetPayload(profileId: string): Promise<BudgetPayload> {
  const supabase = createAdminSupabaseClient();
  const budget = await getOrCreateBudget(profileId);
  await ensureDefaultCategories(budget.id, budget.total_budget);

  const { data: categories, error: categoryErr } = await supabase
    .from("budget_categories")
    .select("id, name, allocated, sort_order")
    .eq("budget_id", budget.id)
    .order("sort_order", { ascending: true });

  if (categoryErr) {
    throw categoryErr;
  }

  const categoryIds = (categories ?? []).map((category) => category.id);

  let items:
    | {
        id: string;
        budget_category_id: string;
        name: string;
        estimated_cost: number;
        actual_cost: number | null;
        quantity: number;
        is_paid: boolean;
        notes: string | null;
        sort_order: number;
      }[]
    | null = null;

  if (categoryIds.length > 0) {
    const { data: itemRows, error: itemErr } = await supabase
      .from("budget_items")
      .select(
        "id, budget_category_id, name, estimated_cost, actual_cost, quantity, is_paid, notes, sort_order"
      )
      .in("budget_category_id", categoryIds)
      .order("sort_order", { ascending: true });

    if (itemErr) {
      throw itemErr;
    }

    items = itemRows ?? [];
  }

  return {
    budgetName: budget.name,
    totalBudget: budget.total_budget,
    categories: (categories ?? []).map((category, index) => ({
      id: category.id,
      name: category.name,
      allocated: category.allocated ?? 0,
      sortOrder: category.sort_order ?? index,
      color: budgetColorForCategory(category.name),
      items: (items ?? [])
        .filter((item) => item.budget_category_id === category.id)
        .map((item, itemIndex) => ({
          id: item.id,
          name: item.name,
          estimatedCost: item.estimated_cost ?? 0,
          actualCost: item.actual_cost ?? null,
          quantity: item.quantity ?? 1,
          isPaid: item.is_paid ?? false,
          notes: item.notes ?? "",
          sortOrder: item.sort_order ?? itemIndex,
        })),
    })),
  };
}

export async function GET() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const profileId = await getClientProfileId(session.userId);
    if (!profileId) {
      return apiSuccess({ needsOnboarding: true, budget: null });
    }

    const budget = await loadBudgetPayload(profileId);
    return apiSuccess({ needsOnboarding: false, budget });
  } catch (error) {
    console.error("GET /api/budget", error);
    return apiError("Failed to load budget", 500);
  }
}

export async function PUT(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const profileId = await getClientProfileId(session.userId);
    if (!profileId) {
      return apiError("Complete onboarding before saving your budget", 409);
    }

    const body = (await request.json()) as Partial<BudgetPayload>;
    const budgetName =
      typeof body.budgetName === "string" && body.budgetName.trim()
        ? body.budgetName.trim()
        : "Wedding Investment Plan";
    const totalBudget =
      typeof body.totalBudget === "number" && Number.isFinite(body.totalBudget)
        ? Math.max(0, Math.floor(body.totalBudget))
        : 0;
    const categories = Array.isArray(body.categories) ? body.categories : [];

    const supabase = createAdminSupabaseClient();
    const budget = await getOrCreateBudget(profileId);

    const { error: budgetErr } = await supabase
      .from("budgets")
      .update({
        name: budgetName,
        total_budget: totalBudget,
      })
      .eq("id", budget.id);

    if (budgetErr) {
      throw budgetErr;
    }

    const { error: deleteErr } = await supabase
      .from("budget_categories")
      .delete()
      .eq("budget_id", budget.id);

    if (deleteErr) {
      throw deleteErr;
    }

    for (const [categoryIndex, category] of categories.entries()) {
      const categoryName =
        typeof category?.name === "string" && category.name.trim()
          ? category.name.trim()
          : `Category ${categoryIndex + 1}`;
      const allocated =
        typeof category?.allocated === "number" && Number.isFinite(category.allocated)
          ? Math.max(0, Math.floor(category.allocated))
          : 0;

      const { data: insertedCategory, error: categoryInsertErr } = await supabase
        .from("budget_categories")
        .insert({
          budget_id: budget.id,
          name: categoryName,
          allocated,
          sort_order: categoryIndex,
        })
        .select("id")
        .single();

      if (categoryInsertErr || !insertedCategory) {
        throw categoryInsertErr ?? new Error("Could not insert category");
      }

      const items = Array.isArray(category?.items) ? category.items : [];
      if (items.length === 0) {
        continue;
      }

      const payload = items
        .filter((item) => typeof item?.name === "string" && item.name.trim())
        .map((item, itemIndex) => ({
          budget_category_id: insertedCategory.id,
          name: item.name.trim(),
          estimated_cost:
            typeof item.estimatedCost === "number" && Number.isFinite(item.estimatedCost)
              ? Math.max(0, Math.floor(item.estimatedCost))
              : 0,
          actual_cost:
            typeof item.actualCost === "number" && Number.isFinite(item.actualCost)
              ? Math.max(0, Math.floor(item.actualCost))
              : null,
          quantity:
            typeof item.quantity === "number" && Number.isFinite(item.quantity)
              ? Math.max(1, Math.floor(item.quantity))
              : 1,
          is_paid: Boolean(item.isPaid),
          notes: typeof item.notes === "string" ? item.notes : null,
          sort_order: itemIndex,
        }));

      if (payload.length === 0) {
        continue;
      }

      const { error: itemInsertErr } = await supabase
        .from("budget_items")
        .insert(payload);

      if (itemInsertErr) {
        throw itemInsertErr;
      }
    }

    const refreshed = await loadBudgetPayload(profileId);
    return apiSuccess({ budget: refreshed });
  } catch (error) {
    console.error("PUT /api/budget", error);
    return apiError("Failed to save budget", 500);
  }
}
