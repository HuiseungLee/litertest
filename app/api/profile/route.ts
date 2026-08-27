import { NextResponse } from "next/server";
import { currentUser, deleteAuthUser, requireRole, rest, updateUserMetadata, userRest } from "../_lib/supabase";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    const student = await requireRole(request, "student");
    const body = await request.json();
    const realName = String(body.realName || "").trim();
    const nickname = String(body.nickname || "").trim();
    if (!realName) throw new Error("이름을 입력해 주세요.");
    if (!nickname || [...nickname].length > 7) throw new Error("닉네임은 1~7글자로 입력해 주세요.");
    let response = await userRest(`profiles?id=eq.${student.id}`, student.token, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ real_name: realName, nickname, display_name: nickname }) });
    let rows = await response.json();
    if (!response.ok && JSON.stringify(rows).includes("nickname")) {
      response = await userRest(`profiles?id=eq.${student.id}`, student.token, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ display_name: nickname }) });
      rows = await response.json();
    }
    await updateUserMetadata(student.token, { real_name: realName, nickname });
    if (!response.ok || !rows[0]) return NextResponse.json({ saved: true, profileSynced: false, real_name: realName, nickname });
    return NextResponse.json(rows[0]);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "내 정보를 저장하지 못했습니다." }, { status: 403 }); }
}

export async function DELETE(request: Request) {
  try {
    const account = await currentUser(request);
    if (!account) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    if (account.role === "teacher") {
      const worksResponse = await rest(`literary_works?teacher_id=eq.${account.id}&select=id&limit=1`);
      const works = await worksResponse.json().catch(() => []);
      if (!worksResponse.ok) throw new Error("교사 계정의 출판물을 확인하지 못했습니다.");
      if (Array.isArray(works) && works.length) {
        return NextResponse.json({ error: "출판물이 남아 있는 교사 계정은 탈퇴할 수 없습니다. 출판물을 모두 삭제한 뒤 다시 시도해 주세요." }, { status: 409 });
      }
    }

    const response = await deleteAuthUser(account.id);
    const result = await response.json().catch(() => ({})) as { message?: string; msg?: string; error?: string; error_description?: string };
    if (!response.ok) {
      throw new Error(result.message || result.msg || result.error_description || result.error || "회원 탈퇴를 완료하지 못했습니다.");
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "회원 탈퇴를 완료하지 못했습니다." }, { status: 500 });
  }
}
