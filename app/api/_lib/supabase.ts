const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

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
export async function currentUser(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || !url || !publishableKey) return null;
  const auth = await fetch(`${url}/auth/v1/user`, { headers: { apikey: publishableKey, Authorization: `Bearer ${token}` } });
  if (!auth.ok) return null;
  const user = await auth.json() as { id: string; email?: string };
  const profileResponse = await userRest(`profiles?id=eq.${user.id}&select=role,display_name,real_name,nickname`, token);
  const profiles = await profileResponse.json() as { role?: string; display_name?: string; real_name?: string; nickname?: string }[];
  return { ...user, role: profiles[0]?.role ?? null, displayName: profiles[0]?.display_name ?? null, realName: profiles[0]?.real_name ?? null, nickname: profiles[0]?.nickname ?? null, token };
}
export async function requireRole(request: Request, role: "teacher" | "student") {
  const user = await currentUser(request);
  if (!user) throw new Error("로그인이 필요합니다.");
  if (user.role !== role) throw new Error(`${role === "teacher" ? "교사" : "학생"} 권한이 필요합니다.`);
  return user;
}
