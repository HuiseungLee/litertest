import { NextResponse } from "next/server";

export const runtime = "nodejs";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const baseHeaders = () => ({ apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`, "Content-Type": "application/json" });
function configError() { return !supabaseUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY; }

export async function GET() {
  if (configError()) return NextResponse.json({ error: "Supabase 환경 변수가 설정되지 않았습니다." }, { status: 503 });
  const response = await fetch(`${supabaseUrl}/rest/v1/literature_results?select=id,student_id,grade,subject,work_title,work_author,created_at&order=created_at.desc`, { headers: baseHeaders(), cache: "no-store" });
  const data = await response.json();
  return NextResponse.json(data, { status: response.ok ? 200 : response.status });
}

export async function POST(request: Request) {
  if (configError()) return NextResponse.json({ error: "Supabase 환경 변수가 설정되지 않았습니다." }, { status: 503 });
  const body = await request.json();
  const row = { student_id: body.studentId, grade: body.grade, subject: body.subject, work_title: body.title, work_author: body.author || null, generated_result: body.result, model_name: body.model, created_at: body.createdAt || new Date().toISOString() };
  const response = await fetch(`${supabaseUrl}/rest/v1/literature_results`, { method: "POST", headers: { ...baseHeaders(), Prefer: "return=representation" }, body: JSON.stringify(row) });
  const data = await response.json();
  return NextResponse.json(data, { status: response.ok ? 201 : response.status });
}
