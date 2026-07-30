import { NextResponse } from "next/server";
import { configured, requireRole, userRest } from "../../../_lib/supabase";

export const runtime = "nodejs";

type Annotation = { phrase?: string; note?: string; area?: "source" | "modern" };
type Question = { id: string; level: "easy" | "hard"; question: string; choices: string[]; answer: number; explanation: string };
type Work = { id: string; title?: string; author?: string; genre?: string; source_text?: string; theme?: string; expression_features?: string; summary?: string; commentary?: string; generated_result?: { annotations?: Annotation[] } };

function fallbackQuiz(work: Work): Question[] {
  const notes = (work.generated_result?.annotations || []).filter((item) => item.phrase && item.note).slice(0, 2);
  const first = notes[0] || { phrase: "작품의 핵심 시어", note: work.theme || work.summary || "작품 해설의 핵심 내용" };
  const second = notes[1] || first;
  return [
    { id: "q1", level: "easy", question: `시어 ‘${first.phrase}’에 대한 해설로 알맞은 것은?`, choices: [first.note || "", "작품과 무관한 인물의 전기", "해설에 없는 시대 배경", "원문에 없는 사건"], answer: 0, explanation: first.note || "각주를 확인하세요." },
    { id: "q2", level: "easy", question: `시어 ‘${second.phrase}’를 이해하는 데 가장 직접적인 자료는?`, choices: [second.note || "", "작품 외부의 전기 정보", "작품과 무관한 역사 사건", "작품에 없는 다른 인물"], answer: 0, explanation: second.note || "각주를 확인하세요." },
    { id: "q3", level: "hard", question: "각주가 달린 시어들과 작품 해설을 종합할 때, 작품의 핵심 의미로 가장 적절한 것은?", choices: [work.theme || work.summary || "해설에 제시된 작품의 핵심 내용", "작품과 관련 없는 인물의 전기", "원문에 제시되지 않은 사건", "해설과 무관한 시대 배경"], answer: 0, explanation: "여러 각주와 작품 해설을 함께 연결해 판단합니다." },
  ];
}

async function generateQuiz(apiKey: string, work: Work): Promise<Question[]> {
  const annotations = (work.generated_result?.annotations || []).filter((item) => item.phrase && item.note).map((item) => ({ phrase: item.phrase, note: item.note, area: item.area || "source" }));
  const source = { title: work.title, author: work.author, genre: work.genre, sourceText: work.source_text, theme: work.theme, expressionFeatures: work.expression_features, summary: work.summary, commentary: work.commentary, annotations };
  const prompt = `너는 고등학교 문학 형성평가 출제자다. 아래 작품 자료와 각주만 근거로 4지선다형 3문항을 작성하라. 반드시 각주가 달린 시어를 중심으로 출제한다. 1번과 2번은 각주의 뜻·표현 효과를 확인하는 쉬운 문항, 3번은 둘 이상의 각주와 작품 주제·맥락을 종합해 판단하는 고난도 문항으로 만든다. 자료에 없는 사실을 만들지 말고, 모든 보기는 짧고 분명하게 쓴다. 반드시 JSON만 반환한다. 형식: {"questions":[{"id":"q1","level":"easy","question":"...","choices":["...","...","...","..."],"answer":0,"explanation":"..."},{"id":"q2","level":"easy","question":"...","choices":["...","...","...","..."],"answer":0,"explanation":"..."},{"id":"q3","level":"hard","question":"...","choices":["...","...","...","..."],"answer":0,"explanation":"..."}]}\n\n자료:\n${JSON.stringify(source)}`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(apiKey)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ generationConfig: { responseMimeType: "application/json", temperature: 0.35, maxOutputTokens: 1600 }, contents: [{ parts: [{ text: prompt }] }] }) });
  if (!response.ok) throw new Error(`Gemini 문제 생성 요청 실패: ${response.status}`);
  const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  const result = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")) as { questions?: Question[] };
  if (!Array.isArray(result.questions) || result.questions.length !== 3 || result.questions.some((item) => !item.question || !Array.isArray(item.choices) || item.choices.length !== 4 || typeof item.answer !== "number")) throw new Error("Gemini 응답 형식이 올바르지 않습니다.");
  return result.questions.map((item, index) => ({ ...item, id: `q${index + 1}`, level: index === 2 ? "hard" : "easy", answer: Math.max(0, Math.min(3, item.answer)) }));
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!configured()) throw new Error("Supabase 연결이 설정되지 않았습니다.");
    const student = await requireRole(request, "student");
    const { id } = await params;
    const workResponse = await userRest(`literary_works?id=eq.${id}&published_at=not.is.null&select=id,title,author,genre,source_text,theme,expression_features,summary,commentary,generated_result`, student.token);
    const works = await workResponse.json() as Work[];
    const work = works[0];
    if (!workResponse.ok || !work) throw new Error("출판된 작품을 찾을 수 없습니다.");
    let questions = fallbackQuiz(work);
    if (process.env.GEMINI_API_KEY) {
      try { questions = await generateQuiz(process.env.GEMINI_API_KEY, work); } catch { /* Use the annotation-based quiz if Gemini is temporarily unavailable. */ }
    }
    const attemptResponse = await userRest("quiz_attempts", student.token, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ work_id: id, student_id: student.id, student_name: student.realName || null, student_nickname: student.nickname || student.displayName || null, questions, answers: {} }) });
    const attempts = await attemptResponse.json() as Array<{ id?: string; message?: string }>;
    if (!attemptResponse.ok || !attempts[0]?.id) throw new Error(attempts[0]?.message || "형성평가 기록을 만들지 못했습니다.");
    return NextResponse.json({ attemptId: attempts[0].id, questions });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "형성평가를 생성하지 못했습니다." }, { status: 403 }); }
}
