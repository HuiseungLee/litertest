import { NextResponse } from "next/server";
import { requireRole } from "../../_lib/supabase";

export const runtime = "nodejs";

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
};

export async function POST(request: Request) {
  try {
    await requireRole(request, "teacher");
    const { title, author } = await request.json();
    const workTitle = String(title || "").trim();
    const workAuthor = String(author || "").trim();
    if (!workTitle || !workAuthor) throw new Error("작품명과 작가명을 모두 입력해 주세요.");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("NAS의 .env 파일에 GEMINI_API_KEY를 설정한 뒤 컨테이너를 다시 시작해 주세요.");
    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
    const prompt = `한국 문학 수업용 작품 원문 확인 요청입니다. 작품명: ${workTitle}, 작가: ${workAuthor}. 저작권이 만료되어 전문 이용이 명확하고 원문을 확실히 알고 있을 때만 원문을 반환하세요. 저작권 보호 작품이거나 정확한 원문인지 확신할 수 없다면 sourceText를 만들거나 추측하지 말고 error에 이유를 적으세요. 제목·작가·해설·인용부호 없이 행과 연을 보존하여 {"sourceText":"..."} 또는 {"error":"..."} JSON으로만 응답하세요.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ generationConfig: { responseMimeType: "application/json", temperature: 0 }, contents: [{ parts: [{ text: prompt }] }] }),
    });
    const raw = await response.text();
    let data: GeminiResponse = {};
    try { data = raw ? JSON.parse(raw) as GeminiResponse : {}; } catch { throw new Error("Gemini가 읽을 수 없는 응답을 반환했습니다. 잠시 후 다시 시도해 주세요."); }
    if (!response.ok) throw new Error(data.error?.message || `Gemini 원문 요청에 실패했습니다. (${response.status})`);

    const candidate = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    let result: { sourceText?: string; error?: string } = {};
    try { result = JSON.parse(candidate.replace(/^```json\s*|\s*```$/g, "")); } catch { throw new Error("Gemini가 원문을 올바른 형식으로 반환하지 않았습니다. 다시 시도해 주세요."); }
    if (result.error) throw new Error(result.error);
    if (!result.sourceText?.trim()) throw new Error("확인 가능한 원문을 찾지 못했습니다. 직접 입력하거나 인터넷 원문 검색을 이용해 주세요.");
    return NextResponse.json({ sourceText: result.sourceText.trim() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "원문을 불러오지 못했습니다." }, { status: 400 });
  }
}
