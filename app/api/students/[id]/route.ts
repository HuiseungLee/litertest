import { NextResponse } from "next/server";
import { authAdmin, deleteAuthUser, requireRole, rest } from "../../_lib/supabase";

export const runtime = "nodejs";

type AdminAccount = {
  id?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: { role?: string };
  raw_user_meta_data?: { role?: string };
  user?: AdminAccount;
};

async function studentAccount(id: string) {
  const [accountResponse, profileResponse] = await Promise.all([
    authAdmin(`users/${encodeURIComponent(id)}`),
    rest(`profiles?id=eq.${encodeURIComponent(id)}&select=role&limit=1`),
  ]);
  const payload = await accountResponse.json().catch(() => ({})) as AdminAccount;
  const profiles = await profileResponse.json().catch(() => []) as Array<{ role?: string }>;
  if (!accountResponse.ok) throw new Error("학생 계정을 찾을 수 없습니다.");
  const account = payload.user || payload;
  const role = profiles[0]?.role || account.user_metadata?.role || account.raw_user_meta_data?.role;
  if (role !== "student") throw new Error("학생 계정만 관리할 수 있습니다.");
  return account;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, "teacher");
    const { id } = await context.params;
    const body = await request.json() as { action?: "toggleRestriction" | "setGrade"; grade?: number };
    const account = await studentAccount(id);
    const metadata = { ...(account.app_metadata || {}) };
    if (body.action === "toggleRestriction") metadata.activity_restricted = !Boolean(metadata.activity_restricted);
    else if (body.action === "setGrade") {
      const grade = Number(body.grade);
      if (!Number.isInteger(grade) || grade < 1 || grade > 3) throw new Error("학생 등급을 다시 선택해 주세요.");
      metadata.student_grade = grade;
    }
    else throw new Error("지원하지 않는 학생 관리 작업입니다.");
    const response = await authAdmin(`users/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify({ app_metadata: metadata }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error("학생 설정을 저장하지 못했습니다.");
    return NextResponse.json({ saved: true, restricted: Boolean(metadata.activity_restricted), grade: Math.max(1, Math.min(3, Number(metadata.student_grade) || 1)), account: result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "학생 설정을 저장하지 못했습니다." }, { status: 403 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const teacher = await requireRole(request, "teacher");
    const { id } = await context.params;
    if (teacher.id === id) throw new Error("현재 교사 계정은 강퇴할 수 없습니다.");
    await studentAccount(id);
    const response = await deleteAuthUser(id);
    const result = await response.json().catch(() => ({})) as { message?: string; error?: string; msg?: string };
    if (!response.ok) throw new Error(result.message || result.msg || result.error || "학생 계정을 삭제하지 못했습니다.");
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "학생 계정을 삭제하지 못했습니다." }, { status: 403 });
  }
}
