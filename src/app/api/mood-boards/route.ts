import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";

export async function GET() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();

    const { data: profile, error: pErr } = await supabase
      .from("client_profiles")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();
    if (pErr) {
      console.error("client_profiles:", pErr);
      return apiError("Failed to load profile", 500);
    }
    if (!profile) {
      return apiSuccess({ boards: [] });
    }

    const { data: boards, error: bErr } = await supabase
      .from("mood_boards")
      .select("id, name, created_at, updated_at")
      .eq("client_profile_id", profile.id)
      .order("created_at", { ascending: true });

    if (bErr) {
      console.error("mood_boards:", bErr);
      return apiError("Failed to load mood boards", 500);
    }

    const boardIds = (boards ?? []).map((b) => b.id);
    let items: {
      id: string;
      mood_board_id: string;
      image_url: string;
      caption: string | null;
      source_url: string | null;
      sort_order: number;
    }[] = [];

    if (boardIds.length) {
      const { data: itemRows, error: iErr } = await supabase
        .from("mood_board_items")
        .select("id, mood_board_id, category, image_url, caption, source_url, sort_order, created_at")
        .in("mood_board_id", boardIds)
        .order("sort_order", { ascending: true });
      if (iErr) {
        console.error("mood_board_items:", iErr);
        return apiError("Failed to load items", 500);
      }
      items = itemRows ?? [];
    }

    return apiSuccess({ boards: boards ?? [], items });
  } catch (e) {
    console.error("GET /api/mood-boards", e);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();

    const { data: profile, error: pErr } = await supabase
      .from("client_profiles")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();
    if (pErr) {
      console.error("client_profiles:", pErr);
      return apiError("Failed to load profile", 500);
    }
    if (!profile) {
      return apiError("Client profile not found", 404);
    }

    const body = await request.json();
    const imageUrl =
      typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
    const caption =
      typeof body.caption === "string" ? body.caption.trim().slice(0, 280) : null;
    const sourceUrl =
      typeof body.sourceUrl === "string" ? body.sourceUrl.trim().slice(0, 500) : null;
    const category =
      typeof body.category === "string" && body.category.trim()
        ? body.category.trim().slice(0, 40)
        : "Decor";

    if (!imageUrl) {
      return apiError("Image URL is required");
    }

    const { data: existingBoard, error: boardErr } = await supabase
      .from("mood_boards")
      .select("id")
      .eq("client_profile_id", profile.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (boardErr) {
      console.error("mood_boards:", boardErr);
      return apiError("Failed to create mood board item", 500);
    }

    let boardId = existingBoard?.id ?? null;
    if (!boardId) {
      const { data: insertedBoard, error: insertBoardErr } = await supabase
        .from("mood_boards")
        .insert({
          client_profile_id: profile.id,
          name: "Inspiration",
        })
        .select("id")
        .single();
      if (insertBoardErr || !insertedBoard?.id) {
        console.error("mood_boards insert:", insertBoardErr);
        return apiError("Failed to create mood board", 500);
      }
      boardId = insertedBoard.id;
    }

    const { data: lastItem, error: sortErr } = await supabase
      .from("mood_board_items")
      .select("sort_order")
      .eq("mood_board_id", boardId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sortErr) {
      console.error("mood_board_items sort:", sortErr);
      return apiError("Failed to create mood board item", 500);
    }

    const { data: item, error } = await supabase
      .from("mood_board_items")
      .insert({
        mood_board_id: boardId,
        category,
        image_url: imageUrl,
        caption,
        source_url: sourceUrl,
        sort_order: (lastItem?.sort_order ?? -1) + 1,
      })
      .select("id, mood_board_id, category, image_url, caption, source_url, sort_order, created_at")
      .single();

    if (error) {
      console.error("mood_board_items create:", error);
      return apiError("Failed to create mood board item", 500);
    }

    return apiSuccess(item, 201);
  } catch (e) {
    console.error("POST /api/mood-boards", e);
    return apiError("Internal server error", 500);
  }
}
