import type { Metadata } from "next";

const ADSENSE_CLIENT_ID = "ca-pub-3651546052793597";
const PRIMARY_GA_ID = "G-PVPS1HPY49";

export const metadata: Metadata = {
  other: {
    "google-adsense-account": ADSENSE_CLIENT_ID,
  },
};

export default function PublishedWorksLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <script
        async
        {...{ "custom-element": "amp-auto-ads" }}
        src="https://cdn.ampproject.org/v0/amp-auto-ads-0.1.js"
      />
      <script
        async
        crossOrigin="anonymous"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      />
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${PRIMARY_GA_ID}`}
      />
      <script async src="/google-publisher-init.js" />
      {children}
    </>
  );
}
