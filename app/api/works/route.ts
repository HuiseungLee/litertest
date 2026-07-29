import { NextResponse } from "next/server";
import { configured, publicRest, requireRole, userRest } from "../_lib/supabase";

export const runtime = "nodejs";
export async function GET(request: Request) {
  if (!configured()) return NextResponse.json({ error: "Supabase 서버 연결이 아직 설정되지 않았습니다." }, { status: 503 });
  const { searchParams } = new URL(request.url); const keyword = searchParams.get("q")?.trim();
  const filter = keyword ? `&or=(title.ilike.*${encodeURIComponent(keyword)}*,author.ilike.*${encodeURIComponent(keyword)}*)` : "";
  const response = await publicRest(`literary_works?published_at=not.is.null&select=id,title,author,genre,theme,summary,published_at${filter}&order=published_at.desc`);
  return NextResponse.json(await response.json(), { status: response.status });
}
export async function POST(request: Request) {
  try {
    if (!configured()) throw new Error("Supabase 서버 연결이 아직 설정되지 않았습니다.");
    const teacher = await requireRole(request, "teacher"); const body = await request.json();
    const annotations = Array.isArray(body.annotations) ? body.annotations.map((item: unknown) => {
      const value = item as { id?: string; phrase?: string; note?: string; tone?: number; start?: number; end?: number };
      const start = Number.isInteger(value.start) && Number(value.start) >= 0 ? Number(value.start) : undefined;
      const end = Number.isInteger(value.end) && Number(value.end) > Number(start ?? -1) ? Number(value.end) : undefined;
      return { id: value.id ?? crypto.randomUUID(), phrase: String(value.phrase ?? "").slice(0, 120), note: String(value.note ?? "").slice(0, 800), tone: Number(value.tone) || 0, ...(start !== undefined && end !== undefined ? { start, end } : {}) };
    }).filter((item: { phrase: string; note: string }) => item.phrase && item.note) : [];
    const row = { teacher_id: teacher.id, title: body.title, author: body.author || null, genre: body.genre || null, source_text: body.sourceText || null, theme: body.theme || null, expression_features: body.expressionFeatures || null, summary: body.summary || null, commentary: body.commentary, generated_result: { ...(body.generatedResult ?? {}), annotations, extraSections: body.extraSections ?? [], authorImageUrl: body.authorImageUrl || null }, published_at: new Date().toISOString() };
    const response = await userRest("literary_works", teacher.token, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "출판하지 못했습니다." }, { status: 403 }); }
}
