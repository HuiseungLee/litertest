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
GEMINI_API_KEY=Google_AI_Studio에서_발급한_API_KEY
GEMINI_MODEL=gemini-3.5-flash-lite
TEACHER_EMAILS=교사이메일
STUDENT_EMAILS=
TEACHER_INVITE_CODE=별도로_정한_초대코드
```

### 공개 학생 가입과 확인 이메일

누구나 학생으로 가입할 수 있게 하되 실제 이메일 확인을 요구하려면 Supabase `.env`에서 가입을 허용하고 자동 확인을 끈 뒤 운영용 SMTP를 설정합니다.

```dotenv
DISABLE_SIGNUP=false
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=false
SMTP_ADMIN_EMAIL=no-reply@example.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=SMTP_사용자
SMTP_PASS=SMTP_비밀번호
SMTP_SENDER_NAME=수빙니기는 문학시간
```

설정 후 `docker compose up -d --force-recreate auth`로 인증 컨테이너를 다시 만듭니다. SMTP 비밀번호는 GitHub에 커밋하거나 화면으로 공유하지 않습니다.

### Q&A 답변 알림 이메일

Supabase 가입 확인 메일과 별도로, 문학 앱 컨테이너도 SMTP에 접속해야 학생에게 교사 답변을 알릴 수 있습니다. `/volume1/docker/literature-app/.env`에 같은 SMTP 계정을 다음처럼 추가합니다. Gmail을 사용한다면 일반 로그인 비밀번호가 아니라 앱 비밀번호를 사용하세요.

```dotenv
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=SMTP_사용자
SMTP_PASS=SMTP_비밀번호_또는_앱_비밀번호
SMTP_FROM_EMAIL=no-reply@example.com
SMTP_FROM_NAME=수빙니기는 문학시간
```

포트가 `465`이면 `SMTP_SECURE=true`, 일반적인 STARTTLS 포트 `587`이면 `SMTP_SECURE=false`로 설정합니다. 환경 변수를 바꾼 뒤 문학 앱 컨테이너를 다시 빌드·실행해야 합니다. `/api/health`의 `replyEmailConfigured`가 `true`이면 필수 항목이 인식된 것입니다.

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
