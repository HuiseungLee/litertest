import type { Metadata } from "next";
import LiteratureApp from "../../literature-app";
import { publicRest } from "../../api/_lib/supabase";

type WorkPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: WorkPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const response = await publicRest(`literary_works?id=eq.${encodeURIComponent(id)}&published_at=not.is.null&select=title,author,genre,summary`);
    const rows = await response.json() as Array<{ title?: string; author?: string; genre?: string; summary?: string }>;
    const work = rows[0];
    if (!response.ok || !work) return { title: "작품을 찾을 수 없습니다 | 수\uE8A1니기는 문학시간" };
    const title = `${work.title || "문학 작품"} | 수\uE8A1니기는 문학시간`;
    const description = work.summary || `${work.author || "작자 미상"}의 ${work.genre || "문학"} 작품 해설과 Q&A`;
    return {
      title,
      description,
      alternates: { canonical: `/works/${id}` },
      openGraph: { title, description, type: "article", images: [] },
      twitter: { card: "summary", title, description, images: [] },
    };
  } catch {
    return { title: "문학 작품 | 수\uE8A1니기는 문학시간" };
  }
}

export default async function WorkPage({ params }: WorkPageProps) {
  const { id } = await params;
  return <LiteratureApp initialWorkId={id} />;
}
