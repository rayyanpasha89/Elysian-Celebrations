import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";

async function loadMoodBoardItem(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  id: string
) {
  const { data, error } = await supabase
    .from("mood_board_items")
    .select("id, board:mood_boards(client_profile:client_profiles(user_id))")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function ownsMoodBoardItem(
  item: {
    board?:
      | {
          client_profile?:
            | { user_id?: string }
            | { user_id?: string }[]
            | null;
        }
      | {
          client_profile?:
            | { user_id?: string }
            | { user_id?: string }[]
            | null;
        }[]
      | null;
  } | null,
  userId: string,
  role: string
) {
  const board = Array.isArray(item?.board) ? item.board[0] : item?.board;
  const clientProfile = Array.isArray(board?.client_profile)
    ? board.client_profile[0]
    : board?.client_profile;

  return role === "admin" || clientProfile?.user_id === userId;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;

  const roleCheck = requireRole(session, "client", "admin");
  if (roleCheck) return roleCheck;

  try {
    const { id } = await params;
    const supabase = createAdminSupabaseClient();
    const item = await loadMoodBoardItem(supabase, id);

    if (!item) {
      return apiError("Mood board item not found", 404);
    }

    if (!ownsMoodBoardItem(item, session.userId, session.role)) {
      return apiError("Forbidden", 403);
    }

    const { error } = await supabase
      .from("mood_board_items")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("mood_board_items delete:", error);
      return apiError("Failed to delete mood board item", 500);
    }

    return apiSuccess({ deleted: true, id });
  } catch (error) {
    console.error("DELETE /api/mood-boards/items/[id]", error);
    return apiError("Internal server error", 500);
  }
}
