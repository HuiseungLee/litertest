import { NextResponse } from "next/server";
import { requireRole, rest } from "../_lib/supabase";

export const runtime = "nodejs";

type CommentRow = {
  id: string;
  work_id: string;
  parent_id?: string | null;
  user_id: string;
  author_role: "teacher" | "student";
  author_name: string;
  body: string;
  created_at: string;
};

async function readAll<T>(path: string) {
  const pageSize = 1000;
  const rows: T[] = [];
  for (let start = 0; ; start += pageSize) {
    const response = await rest(path, { headers: { Range: `${start}-${start + pageSize - 1}` } });
    const page = await response.json().catch(() => []);
    if (!response.ok || !Array.isArray(page)) throw new Error("Q&A 게시물 자료를 불러오지 못했습니다.");
    rows.push(...page as T[]);
    if (page.length < pageSize) return rows;
  }
}

export async function GET(request: Request) {
  try {
    await requireRole(request, "teacher");
    const [commentRows, works] = await Promise.all([
      readAll<CommentRow>("work_comments?select=id,work_id,parent_id,user_id,author_role,author_name,body,created_at&order=created_at.desc"),
      readAll<{ id: string; title?: string; author?: string }>("literary_works?select=id,title,author&order=created_at.desc"),
    ]);
    const workMap = new Map(works.map((work) => [work.id, { title: work.title || "제목 없는 작품", author: work.author || "작가 미입력" }]));
    const replies = new Map<string, CommentRow[]>();
    commentRows.forEach((comment) => {
      if (!comment.parent_id) return;
      replies.set(comment.parent_id, [...(replies.get(comment.parent_id) || []), comment]);
    });

    const questions = commentRows
      .filter((comment) => !comment.parent_id)
      .map((comment) => {
        const work = workMap.get(comment.work_id) || { title: "삭제된 작품", author: "" };
        return {
          id: comment.id,
          workId: comment.work_id,
          workTitle: work.title,
          workAuthor: work.author,
          userId: comment.user_id,
          authorRole: comment.author_role,
          authorName: comment.author_name,
          body: comment.body,
          createdAt: comment.created_at,
          replies: (replies.get(comment.id) || []).sort((a, b) => a.created_at.localeCompare(b.created_at)).map((reply) => ({
            id: reply.id,
            userId: reply.user_id,
            authorRole: reply.author_role,
            authorName: reply.author_name,
            body: reply.body,
            createdAt: reply.created_at,
          })),
        };
      });
    return NextResponse.json(questions);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Q&A 게시물을 불러오지 못했습니다." }, { status: 403 });
  }
}
