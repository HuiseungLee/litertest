# Synology 문학 웹앱 배포

이 문서는 `literature.lhsstart.synology.me`를 Synology에서 Docker로 실행하는 절차입니다.

## 구성

- 공개 주소: `https://literature.lhsstart.synology.me`
- Synology 내부 주소: `http://127.0.0.1:3000`
- Supabase: `https://supabase.lhsstart.synology.me`
- 대표 홈페이지: `https://lhsstart.synology.me`

외부에는 3000번 포트를 직접 개방하지 않습니다. DSM 역방향 프록시만 127.0.0.1:3000으로 연결합니다.

## 최초 설치

NAS SSH에서 다음 폴더에 저장소를 복제합니다.

```bash
cd /volume1/docker
git clone https://github.com/HuiseungLee/litertest.git literature-app
cd literature-app
cp .env.synology.example .env
```

`.env`에 다음 값을 입력합니다. 실제 키와 비밀번호를 GitHub에 커밋하거나 화면으로 공유하지 않습니다.

```dotenv
NEXT_PUBLIC_SITE_URL=https://literature.lhsstart.synology.me
NEXT_PUBLIC_PORTAL_URL=https://lhsstart.synology.me
NEXT_PUBLIC_SUPABASE_URL=https://supabase.lhsstart.synology.me
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=자체호스팅_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=자체호스팅_SERVICE_ROLE_KEY
TEACHER_EMAILS=교사이메일
STUDENT_EMAILS=
TEACHER_INVITE_CODE=별도로_정한_초대코드
```

컨테이너를 빌드하고 실행합니다.

```bash
docker compose up -d --build
```

NAS 내부에서 상태를 확인합니다.

```bash
curl -i http://127.0.0.1:3000/api/health
```

## DSM 역방향 프록시

DSM의 **제어판 → 로그인 포털 → 고급 → 역방향 프록시**에서 다음 규칙을 만듭니다.

| 항목 | 값 |
|---|---|
| 이름 | Literature |
| 소스 프로토콜 | HTTPS |
| 소스 호스트 | literature.lhsstart.synology.me |
| 소스 포트 | 443 |
| 대상 프로토콜 | HTTP |
| 대상 호스트 | 127.0.0.1 |
| 대상 포트 | 3000 |

`literature.lhsstart.synology.me` 인증서를 이 역방향 프록시 서비스에 배정합니다.

## Supabase 로그인 허용 주소

Supabase 폴더 `/volume1/docker/supabase-project/.env`에서 사이트 주소를 문학 웹앱으로 바꿉니다.

```dotenv
SITE_URL=https://literature.lhsstart.synology.me
ADDITIONAL_REDIRECT_URLS=https://literature.lhsstart.synology.me/**,https://lhsstart.synology.me/**
```

설정을 적용합니다.

```bash
cd /volume1/docker/supabase-project
docker compose up -d --force-recreate auth
```

기존 Vercel 주소를 병행 시험해야 한다면 전환이 끝날 때까지 `ADDITIONAL_REDIRECT_URLS`에 그 주소를 함께 유지합니다.

## 업데이트

GitHub에 새 커밋을 올린 뒤 NAS SSH에서 실행합니다.

```bash
cd /volume1/docker/literature-app
git pull --ff-only
docker compose up -d --build
```

## 대표 홈페이지 연결

대표 홈페이지의 문학 메뉴는 `iframe` 대신 일반 링크를 사용합니다.

```html
<a href="https://literature.lhsstart.synology.me/">문학</a>
```

문학 웹앱의 상단 `국어시간 홈` 링크는 `NEXT_PUBLIC_PORTAL_URL`로 돌아갑니다.
