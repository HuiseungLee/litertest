import { NextResponse } from "next/server";
import { currentUser, publicRest, userRest } from "../../../_lib/supabase";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const response = await publicRest(`work_comments?work_id=eq.${id}&select=id,parent_id,user_id,author_role,author_name,body,created_at&order=created_at.asc`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.message || "Q&A를 불러오지 못했습니다.");
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Q&A를 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentUser(request);
    if (!user || !user.role) throw new Error("로그인이 필요합니다.");
    const { id } = await context.params;
    const input = await request.json() as { body?: string; parentId?: string | null };
    const body = input.body?.trim() || "";
    if (!body || body.length > 2000) throw new Error("댓글은 1자 이상 2,000자 이하로 입력해 주세요.");
    if (input.parentId && user.role !== "teacher") throw new Error("교사만 질문에 답변할 수 있습니다.");
    if (input.parentId) {
      const parentResponse = await userRest(`work_comments?id=eq.${input.parentId}&work_id=eq.${id}&parent_id=is.null&select=id`, user.token);
      const parents = await parentResponse.json();
      if (!parentResponse.ok || !Array.isArray(parents) || !parents[0]?.id) throw new Error("답변할 질문을 찾을 수 없습니다.");
    }
    const authorName = user.role === "teacher" ? "교사" : (user.nickname || user.realName || "학생");
    const response = await userRest("work_comments", user.token, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ work_id: id, user_id: user.id, parent_id: input.parentId || null, author_role: user.role, author_name: authorName, body }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.message || "댓글을 등록하지 못했습니다.");
    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "댓글을 등록하지 못했습니다." }, { status: 403 });
  }
}
