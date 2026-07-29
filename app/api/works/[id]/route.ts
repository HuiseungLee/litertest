import { NextResponse } from "next/server";
import { configured, publicRest, requireRole, userRest } from "../../_lib/supabase";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!configured()) return NextResponse.json({ error: "Supabase 서버 연결이 설정되지 않았습니다." }, { status: 503 });
  const { id } = await params; const response = await publicRest(`literary_works?id=eq.${id}&published_at=not.is.null&select=*`);
  const rows = await response.json(); return NextResponse.json(rows[0] ?? null, { status: rows[0] ? 200 : 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const teacher = await requireRole(request, "teacher"); const { id } = await params; const body = await request.json();
    const annotations = Array.isArray(body.annotations) ? body.annotations.map((item: unknown) => {
      const value = item as { id?: string; phrase?: string; note?: string; tone?: number; start?: number; end?: number };
      const start = Number.isInteger(value.start) && Number(value.start) >= 0 ? Number(value.start) : undefined;
      const end = Number.isInteger(value.end) && Number(value.end) > Number(start ?? -1) ? Number(value.end) : undefined;
      return { id: value.id ?? crypto.randomUUID(), phrase: String(value.phrase ?? "").slice(0, 120), note: String(value.note ?? "").slice(0, 800), tone: Number(value.tone) || 0, ...(start !== undefined && end !== undefined ? { start, end } : {}) };
    }).filter((item: { phrase: string; note: string }) => item.phrase && item.note) : [];
    const row = { title: body.title, author: body.author || null, genre: body.genre || null, source_text: body.sourceText || null, theme: body.theme || null, expression_features: body.expressionFeatures || null, summary: body.summary || null, commentary: body.commentary, generated_result: { ...(body.generatedResult ?? {}), annotations, extraSections: body.extraSections ?? [], authorImageUrl: body.authorImageUrl || null }, published_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const response = await userRest(`literary_works?id=eq.${id}&teacher_id=eq.${teacher.id}`, teacher.token, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) }); const rows = await response.json();
    if (!response.ok || !rows[0]) throw new Error("수정 권한이 없거나 작품을 찾을 수 없습니다.");
    return NextResponse.json(rows[0]);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "출판된 해설을 수정하지 못했습니다." }, { status: 403 }); }
}
