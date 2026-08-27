import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    ok: true,
    supabasePublicConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    supabaseWriteConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    geminiSourceConfigured: Boolean(process.env.GEMINI_API_KEY),
    replyEmailConfigured: Boolean(process.env.SMTP_HOST && (process.env.SMTP_FROM_EMAIL || process.env.SMTP_ADMIN_EMAIL || process.env.SMTP_USER)),
    runtime: "nodejs",
  });
}
