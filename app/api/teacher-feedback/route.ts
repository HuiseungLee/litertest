import { NextResponse } from "next/server";
import { configured, requireRole, rest, userRest } from "../_lib/supabase";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    if (!configured()) throw new Error("Supabase 서버 연결이 아직 설정되지 않았습니다.");
    const teacher = await requireRole(request, "teacher");
    const baseQuery = `quiz_attempts?completed_at=not.is.null&select=id,student_id,score,questions,answers,completed_at,literary_works!inner(title,author,teacher_id)&literary_works.teacher_id=eq.${teacher.id}&order=completed_at.desc`;
    const namedQuery = `quiz_attempts?completed_at=not.is.null&select=id,student_id,student_name,student_nickname,score,questions,answers,completed_at,literary_works!inner(title,author,teacher_id)&literary_works.teacher_id=eq.${teacher.id}&order=completed_at.desc`;
    let response = await userRest(namedQuery, teacher.token);
    let rows = await response.json();
    // Older databases do not yet have the optional name columns. Their feedback
    // remains available with the student's management number until migration.
    if (!response.ok && JSON.stringify(rows).includes("student_name")) {
      response = await userRest(baseQuery, teacher.token);
      rows = await response.json();
    }
    // A server service key is optional. When present, it also makes feedback work
    // before an older project's teacher RLS policy has been upgraded.
    if (!response.ok) {
      try { response = await rest(baseQuery); rows = await response.json(); } catch { /* Keep the original permission error below. */ }
    }
    if (!response.ok) throw new Error(rows?.message || "학생 피드백을 불러오지 못했습니다.");
    return NextResponse.json(rows);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "학생 피드백을 불러오지 못했습니다." }, { status: 403 }); }
}
