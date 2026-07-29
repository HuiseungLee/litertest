import { NextResponse } from "next/server";
import { configured, requireRole, userRest } from "../_lib/supabase";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    if (!configured()) throw new Error("Supabase 서버 연결이 아직 설정되지 않았습니다.");
    const student = await requireRole(request, "student"); const body = await request.json();
    const row = { work_id: body.workId, student_id: student.id, questions: body.questions, answers: body.answers ?? {}, score: body.score ?? null, completed_at: body.completed ? new Date().toISOString() : null };
    const response = await userRest("quiz_attempts", student.token, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "형성평가를 저장하지 못했습니다." }, { status: 403 }); }
}
