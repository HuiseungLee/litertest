import { NextResponse } from "next/server";
import { sendReplyNotification } from "../../../_lib/email";
import { currentUser, getAuthUserById, publicRest, rest, userRest } from "../../../_lib/supabase";

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
    let parent: { id: string; user_id: string; author_role: "teacher" | "student"; author_name: string; body: string } | undefined;
    if (input.parentId) {
      const parentResponse = await userRest(`work_comments?id=eq.${input.parentId}&work_id=eq.${id}&parent_id=is.null&select=id,user_id,author_role,author_name,body`, user.token);
      const parents = await parentResponse.json() as Array<typeof parent>;
      if (!parentResponse.ok || !Array.isArray(parents) || !parents[0]?.id) throw new Error("답변할 질문을 찾을 수 없습니다.");
      parent = parents[0];
    }
    const authorName = user.role === "teacher" ? "교사" : (user.nickname || user.realName || "학생");
    const response = await userRest("work_comments", user.token, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ work_id: id, user_id: user.id, parent_id: input.parentId || null, author_role: user.role, author_name: authorName, body }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.message || "댓글을 등록하지 못했습니다.");
    let notification: "not_needed" | "sent" | "not_configured" | "recipient_missing" | "failed" = "not_needed";
    if (parent?.author_role === "student") {
      try {
        const [student, workResponse] = await Promise.all([
          getAuthUserById(parent.user_id),
          rest(`literary_works?id=eq.${id}&select=title&limit=1`),
        ]);
        const works = await workResponse.json().catch(() => []) as Array<{ title?: string }>;
        if (!workResponse.ok) throw new Error("작품 정보를 확인하지 못했습니다.");
        if (!student?.email) notification = "recipient_missing";
        else {
          const result = await sendReplyNotification({ to: student.email, studentName: parent.author_name, workId: id, workTitle: works[0]?.title || "문학 작품", question: parent.body, reply: body });
          notification = result.sent ? "sent" : "not_configured";
        }
      } catch (error) {
        notification = "failed";
        console.error("Failed to send Q&A reply notification", error);
      }
    }
    return NextResponse.json({ ...data[0], notification }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "댓글을 등록하지 못했습니다." }, { status: 403 });
  }
}
