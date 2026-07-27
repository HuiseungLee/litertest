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
    title: "문학의 장면 | 고등학생 문학 해설",
    description: "어려운 문학 작품을 장면부터 차근차근 이해하는 고등학생용 문학 해설 사이트",
    openGraph: { title: "문학의 장면", description: "마음의 지도가 되는 문학 해설", images: [{ url: `${siteUrl}/og.png`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: "문학의 장면", description: "마음의 지도가 되는 문학 해설", images: [`${siteUrl}/og.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
