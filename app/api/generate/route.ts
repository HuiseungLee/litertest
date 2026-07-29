import { NextResponse } from "next/server";

export const runtime = "nodejs";

type GenerateRequest = {
  studentId: string; grade: string; subject: string; title: string; author: string;
  genre: string; sourceText: string; commentary: string; theme: string; expressionFeatures: string;
  customFields: { label: string; value: string }[]; model?: string; apiKey?: string;
};

const jsonOnly = "반드시 유효한 JSON 객체만 반환하고, 마크다운 코드 펜스나 부가 설명을 쓰지 마세요.";
const collectorPrompt = `당신은 고등학교 문학 해설 수집 에이전트입니다. 관리자가 제공한 자료만 근거로 작품 정보, 한 문장 요약, 핵심 주제 배열, 인물·화자, 갈등, 표현상 특징 배열, 핵심 구절, 수능 출제 키워드, 누락 정보와 품질 보고서를 정리하세요. 입력에 없는 사실·인용은 만들지 마세요. ${jsonOnly}`;
const questionPrompt = `당신은 수능 국어 문학 문항 출제 보조 에이전트입니다. 수집된 해설만 근거로 5지선다 단일정답 문항 3개를 만드세요. 각 문항에 type, difficulty, stem, choices(정확히 5개), answer(1~5), explanation, sourceEvidence를 포함하세요. 원문이 없으면 원문을 지어내지 마세요. ${jsonOnly}`;
const reviewPrompt = `당신은 수능 국어 문항 검토 에이전트입니다. 수집 결과와 문항 초안을 검토하세요. 정답 유일성, 자료 근거성, 선택지 병렬성, 발문 명확성, 고등학생 적합성을 점검한 뒤 문항을 최소 수정하여 반환하세요. review_status는 approved, needs_admin_review, rejected 중 하나입니다. 최종 JSON은 overall_summary, admin_review_required, questions를 포함하세요. ${jsonOnly}`;

async function runGemini(apiKey: string, model: string, instruction: string, payload: unknown) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ generationConfig: { responseMimeType: "application/json", temperature: 0.3 }, contents: [{ role: "user", parts: [{ text: `${instruction}\n\n[입력]\n${JSON.stringify(payload)}` }] }] }),
  });
  if (!response.ok) throw new Error(`Gemini 요청 실패: ${response.status}`);
  const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.map(part => part.text ?? "").join("") ?? "";
  if (!text) throw new Error("Gemini가 결과를 반환하지 않았습니다.");
  try { return JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")); } catch { throw new Error("Gemini 결과가 JSON 형식이 아닙니다."); }
}

export async function POST(request: Request) {
  try {
    const input = await request.json() as GenerateRequest;
    const apiKey = input.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Gemini API 키가 필요합니다. 개인 메뉴에서 입력하거나 서버 환경 변수에 설정하세요." }, { status: 400 });
    if (!input.title || !input.commentary) return NextResponse.json({ error: "작품명과 관리자 해설은 필수입니다." }, { status: 400 });
    const model = input.model || "gemini-3.5-flash-lite";
    const collected = await runGemini(apiKey, model, collectorPrompt, input);
    const draft = await runGemini(apiKey, model, questionPrompt, { input, collected });
    const reviewed = await runGemini(apiKey, model, reviewPrompt, { input, collected, draft });
    const subjectSections = [{ subject: input.subject || "국어", text: reviewed.overall_summary || "검토가 완료되었습니다." }];
    return NextResponse.json({ input: { studentId: input.studentId, grade: input.grade, subject: input.subject, title: input.title, author: input.author }, model, collected, draft, reviewed, subjectSections, createdAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
