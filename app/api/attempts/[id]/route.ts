import { NextResponse } from "next/server";
import { configured, requireRole, userRest } from "../../_lib/supabase";

export const runtime = "nodejs";

type Attempt = { id?: string; work_id?: string; questions?: unknown; message?: string };

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!configured()) throw new Error("Supabase 서버 연결이 아직 설정되지 않았습니다.");
    const student = await requireRole(request, "student");
    const { id } = await params;
    const body = await request.json();
    const payload = { answers: body.answers ?? {}, score: body.score ?? null, completed_at: new Date().toISOString() };
    const response = await userRest(`quiz_attempts?id=eq.${id}&student_id=eq.${student.id}`, student.token, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) });
    const updated = await response.json() as Attempt[];
    if (response.ok && updated[0]?.id) return NextResponse.json({ saved: true, attemptId: updated[0].id });

    // Some existing projects have an older RLS update policy. Preserve the student's answer
    // by creating a completed attempt when that legacy row cannot be updated.
    const originalResponse = await userRest(`quiz_attempts?id=eq.${id}&student_id=eq.${student.id}&select=work_id,questions`, student.token);
    const originals = await originalResponse.json() as Attempt[];
    const original = originals[0];
    if (!originalResponse.ok || !original?.work_id || !original.questions) throw new Error(updated[0]?.message || "형성평가 기록을 찾을 수 없습니다.");
    const createResponse = await userRest("quiz_attempts", student.token, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ work_id: original.work_id, student_id: student.id, questions: original.questions, ...payload }) });
    const created = await createResponse.json() as Attempt[];
    if (!createResponse.ok || !created[0]?.id) throw new Error(created[0]?.message || "답안을 저장하지 못했습니다.");
    return NextResponse.json({ saved: true, attemptId: created[0].id, copied: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "결과를 저장하지 못했습니다." }, { status: 403 });
  }
}
