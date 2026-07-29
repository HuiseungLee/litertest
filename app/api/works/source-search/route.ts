import { NextResponse } from "next/server";
import { requireRole } from "../../_lib/supabase";

export const runtime = "nodejs";

type SearchItem = { title?: string; link?: string; snippet?: string; displayLink?: string };

export async function POST(request: Request) {
  try {
    await requireRole(request, "teacher");
    const { title, author } = await request.json();
    if (!title || !author) throw new Error("작품명과 작가명을 모두 입력해 주세요.");
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    if (!apiKey || !engineId) throw new Error("원문 검색 기능을 사용하려면 GOOGLE_SEARCH_API_KEY와 GOOGLE_SEARCH_ENGINE_ID를 서버 환경 변수에 등록해 주세요.");
    const query = `${title} ${author} 원문`;
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", apiKey); url.searchParams.set("cx", engineId); url.searchParams.set("q", query); url.searchParams.set("num", "5");
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json() as { items?: SearchItem[]; error?: { message?: string } };
    if (!response.ok) throw new Error(data.error?.message || "검색 결과를 불러오지 못했습니다.");
    return NextResponse.json({ query, results: (data.items ?? []).map((item) => ({ title: item.title ?? "제목 없음", url: item.link ?? "", snippet: item.snippet ?? "", site: item.displayLink ?? "" })).filter((item) => item.url) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "원문을 검색하지 못했습니다." }, { status: 400 }); }
}
