import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const siteUrl = `${protocol}://${host}`;

  return {
    metadataBase: new URL(siteUrl),
    title: "문학+각주 | 문학 원문 해설 편집기",
    description: "문학 작품의 원문, 작품 정보, 각주를 한 화면에서 편집하는 학생용 해설지 제작 도구",
    openGraph: { title: "문학+각주", description: "문학 원문 해설 편집기", images: [{ url: `${siteUrl}/og.png`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: "문학+각주", description: "문학 원문 해설 편집기", images: [`${siteUrl}/og.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
