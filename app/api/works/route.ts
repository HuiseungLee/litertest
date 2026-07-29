import { NextResponse } from "next/server";
import { configured, requireRole, rest } from "../_lib/supabase";

export const runtime = "nodejs";
export async function GET(request: Request) {
  if (!configured()) return NextResponse.json({ error: "Supabase 서버 연결이 아직 설정되지 않았습니다." }, { status: 503 });
  const { searchParams } = new URL(request.url); const keyword = searchParams.get("q")?.trim();
  const filter = keyword ? `&or=(title.ilike.*${encodeURIComponent(keyword)}*,author.ilike.*${encodeURIComponent(keyword)}*)` : "";
  const response = await rest(`literary_works?published_at=not.is.null&select=id,title,author,genre,theme,summary,published_at${filter}&order=published_at.desc`);
  return NextResponse.json(await response.json(), { status: response.status });
}
export async function POST(request: Request) {
  try {
    if (!configured()) throw new Error("Supabase 서버 연결이 아직 설정되지 않았습니다.");
    const teacher = await requireRole(request, "teacher"); const body = await request.json();
    const row = { teacher_id: teacher.id, title: body.title, author: body.author || null, genre: body.genre || null, source_text: body.sourceText || null, theme: body.theme || null, expression_features: body.expressionFeatures || null, summary: body.summary || null, commentary: body.commentary, generated_result: body.generatedResult, published_at: new Date().toISOString() };
    const response = await rest("literary_works", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "출판하지 못했습니다." }, { status: 403 }); }
}
