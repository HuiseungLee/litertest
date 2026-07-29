import { NextResponse } from "next/server";
import { configured, rest } from "../../_lib/supabase";

export const runtime = "nodejs";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!configured()) return NextResponse.json({ error: "Supabase 서버 연결이 아직 설정되지 않았습니다." }, { status: 503 });
  const { id } = await params; const response = await rest(`literary_works?id=eq.${id}&published_at=not.is.null&select=*`);
  const rows = await response.json(); return NextResponse.json(rows[0] ?? null, { status: rows[0] ? 200 : 404 });
}
