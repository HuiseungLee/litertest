import { NextResponse } from "next/server";
import { requireRole } from "../../_lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireRole(request, "teacher");
    const { title, author } = await request.json();
    if (!title || !author) throw new Error("작품명과 작자를 모두 입력해 주세요.");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("원문 불러오기용 Gemini API 키가 서버 환경 변수에 설정되지 않았습니다.");
    const prompt = `한국 문학 수업용 작품 원문 요청입니다. 작품명: ${title}, 작자: ${author}. 저작권이 만료된 작품 또는 사용 권한이 명확한 작품이면 원문만 반환하세요. 저작권 보호 작품이라면 전체 원문을 반환하지 말고 {"error":"저작권 보호 작품은 원문을 직접 입력하거나 이용 권한을 확인해 주세요."} JSON만 반환하세요. 해설, 제목, 작자, 인용부호 없이 행·연만 유지한 JSON 형식 {"sourceText":"..."}으로 반환하세요.`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(apiKey)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ generationConfig: { responseMimeType: "application/json", temperature: 0 }, contents: [{ parts: [{ text: prompt }] }] }) });
    if (!response.ok) throw new Error(`원문 요청 실패: ${response.status}`);
    const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.map(part => part.text ?? "").join("") ?? "";
    const result = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")) as { sourceText?: string; error?: string };
    if (result.error) throw new Error(result.error);
    if (!result.sourceText?.trim()) throw new Error("원문을 찾지 못했습니다. 직접 입력해 주세요.");
    return NextResponse.json({ sourceText: result.sourceText.trim() });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "원문을 불러오지 못했습니다." }, { status: 400 }); }
}
