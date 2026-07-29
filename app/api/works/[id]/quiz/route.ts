import { NextResponse } from "next/server";
import { configured, requireRole, userRest } from "../../../_lib/supabase";

export const runtime = "nodejs";
const prompt = `당신은 고등학교 국어 형성평가 출제 도우미입니다. 제공된 작품 해설만을 근거로 5지선다 단일정답 문항 3개를 만드세요. 작품 원문이나 해설에 없는 사실·인용을 만들지 마세요. 반드시 JSON만 반환하세요. 형식: {"questions":[{"id":"q1","stem":"...","choices":[{"number":1,"text":"..."}],"answer":1,"explanation":"..."}]}`;
async function generate(apiKey: string, model: string, work: unknown) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ generationConfig: { responseMimeType: "application/json", temperature: 0.3 }, contents: [{ parts: [{ text: `${prompt}\n\n${JSON.stringify(work)}` }] }] }) });
  if (!response.ok) throw new Error(`형성평가 생성 요청 실패: ${response.status}`);
  const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] }; const text = data.candidates?.[0]?.content?.parts?.map(part => part.text ?? "").join("") ?? "";
  return JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!configured()) throw new Error("Supabase 연결이 설정되지 않았습니다."); const student = await requireRole(request, "student"); const { id } = await params;
    const workResponse = await userRest(`literary_works?id=eq.${id}&published_at=not.is.null&select=id,title,author,genre,source_text,theme,expression_features,summary,commentary`, student.token); const works = await workResponse.json(); const work = works[0]; if (!work) throw new Error("출판된 작품을 찾을 수 없습니다.");
    const apiKey = process.env.GEMINI_API_KEY; if (!apiKey) throw new Error("형성평가 생성용 Gemini API 키가 서버 환경 변수에 설정되지 않았습니다.");
    const quiz = await generate(apiKey, "gemini-3.5-flash-lite", work);
    const attemptResponse = await userRest("quiz_attempts", student.token, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ work_id: id, student_id: student.id, questions: quiz.questions, answers: {} }) }); const attempts = await attemptResponse.json();
    return NextResponse.json({ attemptId: attempts[0]?.id, questions: quiz.questions });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "형성평가를 생성하지 못했습니다." }, { status: 403 }); }
}
