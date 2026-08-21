import { NextResponse } from "next/server";
import { currentUser, userRest } from "../../_lib/supabase";

export const runtime = "nodejs";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentUser(request);
    if (!user) throw new Error("로그인이 필요합니다.");
    const { id } = await context.params;
    const response = await userRest(`work_comments?id=eq.${id}`, user.token, { method: "DELETE", headers: { Prefer: "return=representation" } });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.message || "댓글을 삭제하지 못했습니다.");
    if (!Array.isArray(data) || !data.length) throw new Error("삭제 권한이 없거나 댓글을 찾을 수 없습니다.");
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "댓글을 삭제하지 못했습니다." }, { status: 403 });
  }
}
