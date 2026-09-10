import { NextResponse } from "next/server";
import { configured, publicRest, requireRole, rest } from "../_lib/supabase";

export const runtime = "nodejs";

type TimelineEvent = { id: string; world: string; period: string; korea: string; literature: string };
const timelineTitle = "__literary_timeline__";
const legacyTimelineUrl = "https://lhsstart.synology.me/literature/lhistory.html";

function plainText(html: string) {
  return html.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&#x([0-9a-f]+);/gi, (_, value: string) => String.fromCodePoint(Number.parseInt(value, 16))).replace(/&#(\d+);/g, (_, value: string) => String.fromCodePoint(Number(value))).replace(/\r/g, "").trim();
}

function legacyEvents(html: string): TimelineEvent[] {
  const body = html.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i)?.[1] || "";
  return Array.from(body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)).flatMap((row, index) => {
    const cells = Array.from(row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)).map((cell) => plainText(cell[1]));
    if (cells.length < 4 || !cells.some(Boolean)) return [];
    return [{ id: `legacy-${index}`, world: cells[0], period: cells[1], korea: cells[2], literature: cells[3] }];
  });
}

function cleanEvents(value: unknown): TimelineEvent[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 2500).flatMap((item) => {
    const row = item as Partial<TimelineEvent>;
    const event = { id: String(row.id || crypto.randomUUID()).slice(0, 80), world: String(row.world || "").slice(0, 2000), period: String(row.period || "").slice(0, 120), korea: String(row.korea || "").slice(0, 2000), literature: String(row.literature || "").slice(0, 2000) };
    return event.world || event.period || event.korea || event.literature ? [event] : [];
  });
}

async function importedLegacyEvents() {
  const response = await fetch(legacyTimelineUrl, { next: { revalidate: 3600 } });
  if (!response.ok) throw new Error("기존 연대표를 불러오지 못했습니다.");
  return legacyEvents(await response.text());
}

export async function GET() {
  try {
    if (configured()) {
      const response = await publicRest(`literary_works?title=eq.${encodeURIComponent(timelineTitle)}&published_at=not.is.null&select=generated_result,updated_at&limit=1`, { cache: "no-store" });
      const rows = await response.json().catch(() => []) as Array<{ generated_result?: { timelineEvents?: unknown }; updated_at?: string }>;
      const events = response.ok ? cleanEvents(rows[0]?.generated_result?.timelineEvents) : [];
      if (events.length) return NextResponse.json({ events, source: "saved", updatedAt: rows[0]?.updated_at || null });
    }
    return NextResponse.json({ events: await importedLegacyEvents(), source: "legacy", updatedAt: null });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "연대표를 불러오지 못했습니다." }, { status: 502 }); }
}

export async function POST(request: Request) {
  try {
    if (!configured()) throw new Error("Supabase 서버 연결이 아직 설정되지 않았습니다.");
    const teacher = await requireRole(request, "teacher");
    const body = await request.json(); const events = cleanEvents(body.events);
    if (!events.length) throw new Error("저장할 연대표 행이 없습니다.");
    const lookup = await rest(`literary_works?title=eq.${encodeURIComponent(timelineTitle)}&select=id&limit=1`);
    const existing = await lookup.json().catch(() => []) as Array<{ id: string }>;
    if (!lookup.ok) throw new Error("연대표 저장 위치를 확인하지 못했습니다.");
    const now = new Date().toISOString();
    const row = { teacher_id: teacher.id, title: timelineTitle, author: "수비니기는 문학시간", genre: "문학사 연대표", source_text: null, theme: null, expression_features: null, summary: null, commentary: "문학사·한국사·세계사 통합 연대표", generated_result: { timelineEvents: events }, published_at: now, updated_at: now };
    const response = existing[0]?.id
      ? await rest(`literary_works?id=eq.${encodeURIComponent(existing[0].id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(row) })
      : await rest("literary_works", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(row) });
    if (!response.ok) { const detail = await response.json().catch(() => ({})) as { message?: string }; throw new Error(detail.message || "연대표를 저장하지 못했습니다."); }
    return NextResponse.json({ ok: true, count: events.length, updatedAt: now });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "연대표를 저장하지 못했습니다." }, { status: 403 }); }
}
