import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://literature.lhsstart.synology.me";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "수\uE8A1니기는 문학시간 | 문학 작품 해설과 Q&A",
  description: "문학 작품을 검색하고 교사의 해설과 작품별 Q&A를 함께 살펴보는 문학 학습 공간",
  alternates: { canonical: "/" },
  openGraph: {
    title: "수\uE8A1니기는 문학시간",
    description: "문학 작품의 해설과 Q&A를 한곳에서",
    url: siteUrl,
    siteName: "수\uE8A1니기는 문학시간",
    locale: "ko_KR",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "수\uE8A1니기는 문학시간",
    description: "문학 작품의 해설과 Q&A를 한곳에서",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
