import { NextResponse } from "next/server";
import { configured, requireRole, userRest } from "../../../_lib/supabase";

export const runtime = "nodejs";

type Work = { title?: string; author?: string | null; genre?: string | null; theme?: string | null; summary?: string | null };
type Question = { id: string; question: string; choices: string[]; answer: number; explanation: string };

function choices(answer: string, alternatives: string[]) {
  return [answer, ...alternatives.filter((item) => item !== answer)].slice(0, 4);
}

function createQuickQuiz(work: Work): Question[] {
  const title = work.title || "이 작품";
  const author = work.author || "작자 정보 없음";
  const genre = work.genre || "갈래 정보 없음";
  const theme = work.theme || work.summary || "작품 해설에 제시된 핵심 내용";
  return [
    { id: "q1", question: "이 페이지에서 다루는 작품의 제목은 무엇인가?", choices: choices(title, [author, genre, "작품 정보에 없는 제목"]), answer: 0, explanation: `작품 제목은 ‘${title}’입니다.` },
    { id: "q2", question: `‘${title}’의 작자는 누구인가?`, choices: choices(author, [title, genre, "작품 정보에 없는 작자"]), answer: 0, explanation: `이 페이지에 제시된 작자는 ‘${author}’입니다.` },
    { id: "q3", question: `‘${title}’의 해설 내용으로 가장 알맞은 것은?`, choices: choices(theme, ["작품과 관련 없는 인물의 전기", "해설에 제시되지 않은 사건", "작품과 무관한 시대 배경"]), answer: 0, explanation: "작품 해설에 제시된 내용으로 확인할 수 있습니다." },
  ];
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!configured()) throw new Error("Supabase 연결이 설정되지 않았습니다.");
    const student = await requireRole(request, "student");
    const { id } = await params;
    const workResponse = await userRest(`literary_works?id=eq.${id}&published_at=not.is.null&select=id,title,author,genre,theme,summary`, student.token);
    const works = await workResponse.json() as Work[];
    const work = works[0];
    if (!workResponse.ok || !work) throw new Error("출판된 작품을 찾을 수 없습니다.");
    const questions = createQuickQuiz(work);
    const attemptResponse = await userRest("quiz_attempts", student.token, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ work_id: id, student_id: student.id, questions, answers: {} }) });
    const attempts = await attemptResponse.json() as Array<{ id?: string; message?: string }>;
    if (!attemptResponse.ok || !attempts[0]?.id) throw new Error(attempts[0]?.message || "형성평가 기록을 만들지 못했습니다.");
    return NextResponse.json({ attemptId: attempts[0].id, questions });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "형성평가를 생성하지 못했습니다." }, { status: 403 });
  }
}
