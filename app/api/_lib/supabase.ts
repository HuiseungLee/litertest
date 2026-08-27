const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// These two accounts have fixed roles even if an old or incomplete profile row remains.
// Additional account roles continue to be managed through public.profiles in Supabase.
function fixedRole(email?: string) {
  const address = email?.trim().toLowerCase();
  const teachers = (process.env.TEACHER_EMAILS || "lhsstart@gmail.com,admin@admin.com").split(",").map((value) => value.trim().toLowerCase());
  const students = (process.env.STUDENT_EMAILS || "stu01@st.com").split(",").map((value) => value.trim().toLowerCase());
  if (address && teachers.includes(address)) return "teacher" as const;
  if (address && students.includes(address)) return "student" as const;
  return undefined;
}

export function configured() { return Boolean(url && publishableKey); }
export function userRest(path: string, token: string, init: RequestInit = {}) {
  if (!url || !publishableKey) throw new Error("Supabase 공개 환경 변수가 설정되지 않았습니다.");
  return fetch(`${url}/rest/v1/${path}`, { ...init, headers: { apikey: publishableKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
}
export function publicRest(path: string, init: RequestInit = {}) {
  if (!url || !publishableKey) throw new Error("Supabase 공개 환경 변수가 설정되지 않았습니다.");
  return fetch(`${url}/rest/v1/${path}`, { ...init, headers: { apikey: publishableKey, Authorization: `Bearer ${publishableKey}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
}
export function rest(path: string, init: RequestInit = {}) {
  if (!url || !serviceKey) throw new Error("Supabase 서버 환경 변수가 설정되지 않았습니다.");
  return fetch(`${url}/rest/v1/${path}`, { ...init, headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
}
export function deleteAuthUser(userId: string) {
  if (!url || !serviceKey) throw new Error("회원 탈퇴를 위한 Supabase 서버 환경 변수가 설정되지 않았습니다.");
  return fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
}
export function authAdmin(path: string, init: RequestInit = {}) {
  if (!url || !serviceKey) throw new Error("Supabase 관리자 기능을 위한 서버 환경 변수가 설정되지 않았습니다.");
  return fetch(`${url}/auth/v1/admin/${path}`, {
    ...init,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}
export async function getAuthUserById(userId: string) {
  const response = await authAdmin(`users/${encodeURIComponent(userId)}`);
  if (response.status === 404) return null;
  const data = await response.json().catch(() => ({})) as { id?: string; email?: string; user?: { id?: string; email?: string } };
  if (!response.ok) throw new Error("답변 알림을 받을 회원 정보를 확인하지 못했습니다.");
  return data.user ?? data;
}

function normalizedNickname(value: unknown) {
  return String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
}

export async function nicknameInUse(nickname: string, excludeUserId?: string) {
  const wanted = normalizedNickname(nickname);
  if (!wanted) return false;

  const [profilesResponse, usersResponse] = await Promise.all([
    rest("profiles?select=id,nickname,display_name"),
    authAdmin("users?page=1&per_page=1000"),
  ]);
  const profiles = await profilesResponse.json().catch(() => []);
  const usersData = await usersResponse.json().catch(() => ({})) as { users?: Array<{ id?: string; user_metadata?: { nickname?: string }; raw_user_meta_data?: { nickname?: string } }> } | Array<{ id?: string; user_metadata?: { nickname?: string }; raw_user_meta_data?: { nickname?: string } }>;
  if (!profilesResponse.ok || !usersResponse.ok) throw new Error("닉네임 중복 여부를 확인하지 못했습니다.");

  const profileMatch = Array.isArray(profiles) && profiles.some((profile: { id?: string; nickname?: string; display_name?: string }) =>
    profile.id !== excludeUserId && normalizedNickname(profile.nickname || profile.display_name) === wanted);
  const users = Array.isArray(usersData) ? usersData : (usersData.users || []);
  const authMatch = users.some((account) => account.id !== excludeUserId
    && normalizedNickname(account.user_metadata?.nickname || account.raw_user_meta_data?.nickname) === wanted);
  return profileMatch || authMatch;
}
export async function updateUserMetadata(token: string, data: Record<string, string>) {
  if (!url || !publishableKey) throw new Error("Supabase connection is not configured.");
  const response = await fetch(`${url}/auth/v1/user`, { method: "PUT", headers: { apikey: publishableKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ data }) });
  if (!response.ok) throw new Error("Could not save account profile information.");
  return response.json();
}
export async function currentUser(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || !url || !publishableKey) return null;
  const auth = await fetch(`${url}/auth/v1/user`, { headers: { apikey: publishableKey, Authorization: `Bearer ${token}` } });
  if (!auth.ok) return null;
  const user = await auth.json() as { id: string; email?: string; user_metadata?: { role?: "teacher" | "student"; real_name?: string; nickname?: string } };
  let profileResponse = await userRest(`profiles?id=eq.${user.id}&select=role,display_name,real_name,nickname`, token);
  let profileData = await profileResponse.json();
  if (!profileResponse.ok && JSON.stringify(profileData).includes("nickname")) {
    profileResponse = await userRest(`profiles?id=eq.${user.id}&select=role,display_name`, token);
    profileData = await profileResponse.json();
  }
  const profile = Array.isArray(profileData) ? profileData[0] as { role?: string; display_name?: string; real_name?: string; nickname?: string } | undefined : undefined;
  const assignedRole = fixedRole(user.email);
  return { ...user, role: assignedRole ?? profile?.role ?? (user.user_metadata?.role === "student" ? "student" : null), fixedRole: assignedRole, profileRole: profile?.role, displayName: profile?.display_name ?? null, realName: profile?.real_name ?? user.user_metadata?.real_name ?? null, nickname: profile?.nickname ?? user.user_metadata?.nickname ?? profile?.display_name ?? null, token };
}
export async function requireRole(request: Request, role: "teacher" | "student") {
  const user = await currentUser(request);
  if (!user) throw new Error("로그인이 필요합니다.");
  if (user.role !== role) throw new Error(`${role === "teacher" ? "교사" : "학생"} 권한이 필요합니다.`);
  // Email-confirmed signups do not receive a session during signup, so their profile is
  // created lazily on the first authenticated action. Fixed teacher accounts are synced too.
  const profileNeedsSync = (role === "teacher" && user.fixedRole === "teacher" && user.profileRole !== "teacher")
    || (role === "student" && user.profileRole !== "student");
  if (profileNeedsSync) {
    if (!serviceKey) throw new Error("회원 프로필을 만들기 위한 Supabase 서버 키가 설정되지 않았습니다.");
    const metadataName = String(user.user_metadata?.real_name || "").trim();
    const metadataNickname = [...String(user.user_metadata?.nickname || "").trim()].slice(0, 7).join("");
    if (metadataNickname && await nicknameInUse(metadataNickname, user.id)) throw new Error("이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요.");
    const displayName = user.displayName || metadataNickname || user.email?.split("@")[0] || (role === "teacher" ? "교사" : "학생");
    const profileResponse = await rest("profiles?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ id: user.id, role, display_name: displayName, ...(metadataName ? { real_name: metadataName } : {}), ...(metadataNickname ? { nickname: metadataNickname } : {}) }) });
    if (!profileResponse.ok) {
      const detail = await profileResponse.json().catch(() => ({})) as { message?: string; details?: string; hint?: string };
      throw new Error(detail.message || detail.details || detail.hint || `${role === "teacher" ? "교사" : "학생"} 프로필을 준비하지 못했습니다.`);
    }
  }
  return user;
}
