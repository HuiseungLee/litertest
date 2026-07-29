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
    title: "문학AI실 | 문학 해설·수능형 문항 생성",
    description: "관리자 문학 해설을 수집·문제 생성·문제 검토 에이전트가 처리하고 Supabase에 저장하는 웹앱",
    openGraph: { title: "문학AI실", description: "문학 해설·수능형 문항 생성 워크플로우", images: [{ url: `${siteUrl}/og.png`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: "문학AI실", description: "문학 해설·수능형 문항 생성 워크플로우", images: [`${siteUrl}/og.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
