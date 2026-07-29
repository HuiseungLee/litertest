import { NextResponse } from "next/server";
import { configured, requireRole, userRest } from "../../_lib/supabase";
export const runtime = "nodejs";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { if (!configured()) throw new Error("Supabase 서버 연결이 아직 설정되지 않았습니다."); const student = await requireRole(request, "student"); const { id } = await params; const body = await request.json(); const response = await userRest(`quiz_attempts?id=eq.${id}&student_id=eq.${student.id}`, student.token, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ answers: body.answers, score: body.score, completed_at: new Date().toISOString() }) }); return NextResponse.json(await response.json(), { status: response.status }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "결과를 저장하지 못했습니다." }, { status: 403 }); }
}
