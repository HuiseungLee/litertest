import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    ok: true,
    supabaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    runtime: "vercel-compatible",
  });
}
