import { NextResponse } from "next/server";
import { configured, requireRole, userRest } from "../_lib/supabase";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    if (!configured()) throw new Error("Supabase 서버 연결이 아직 설정되지 않았습니다.");
    const teacher = await requireRole(request, "teacher");
    const response = await userRest(`quiz_attempts?completed_at=not.is.null&select=id,student_id,student_name,student_nickname,score,questions,answers,completed_at,literary_works!inner(title,author,teacher_id)&literary_works.teacher_id=eq.${teacher.id}&order=completed_at.desc`, teacher.token);
    const rows = await response.json();
    if (!response.ok) throw new Error(rows?.message || "학생 피드백을 불러오지 못했습니다.");
    return NextResponse.json(rows);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "학생 피드백을 불러오지 못했습니다." }, { status: 403 }); }
}
