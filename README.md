# 수니기는 문학시간

교사가 문학 작품 해설을 출판하고 학생이 작품별 Q&A에서 질문할 수 있는 Next.js + Supabase 웹앱입니다.

## 교사·학생 워크플로우

- 교사: 로그인 후 교사 작업실에서 해설을 작성하고 학생용 자료로 출판합니다.
- 학생: 공개된 해설을 읽고, 회원가입 확인 메일의 6자리 코드를 입력해 인증한 뒤 작품별 Q&A에 질문을 남깁니다.
- 교사: 작품별 Q&A에서 학생 질문에 답변하고 관련 댓글을 관리합니다.
- 교사가 학생 질문에 답변하면 학생의 가입 이메일로 질문·답변 내용과 작품 링크를 알립니다.
- 회원 탈퇴 후에도 Q&A는 작성 당시 이름으로 보존됩니다. 댓글은 작성자 본인 또는 교사 관리자만 삭제할 수 있습니다.
- 닉네임은 공백·대소문자·유니코드 표기 차이를 정규화해 중복 가입과 중복 변경을 차단합니다.

Supabase Auth에서 교사 계정을 만든 뒤, SQL Editor에서 해당 사용자의 `profiles.role` 값을 `teacher`로 설정하세요. 학생 회원가입은 자동으로 `student` 역할 프로필을 생성합니다.

## Supabase 설정

1. Supabase SQL Editor에서 [`supabase/schema.sql`](supabase/schema.sql)을 실행합니다.
2. 배포 환경 변수에 다음을 추가합니다.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (서버 전용. 브라우저에 노출하지 마세요.)
   - `GEMINI_API_KEY` (교사용 AI 원문 불러오기를 사용할 때만 필요합니다.)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL` (Q&A 답변 이메일 알림)
3. 이 프로젝트는 Next.js Route Handler와 Node.js runtime을 사용합니다.

기존 DB를 사용 중이라면 계정 탈퇴 기능을 배포하기 전에 SQL Editor에서 [`supabase/retain_comments_remove_learning.sql`](supabase/retain_comments_remove_learning.sql)을 한 번 실행해야 합니다. 이 작업은 Q&A의 회원 프로필 외래 키를 분리해 탈퇴 후에도 기록을 보존하고, 더 이상 사용하지 않는 `quiz_attempts` 테이블과 모든 기존 학습 기록을 영구 삭제합니다.

`GET /api/health`는 Supabase 연결 및 AI 원문 불러오기 환경 변수의 설정 여부를 확인합니다. Gemini 형성평가 생성 기능은 제거했으며, Gemini는 교사용 AI 원문 불러오기에만 사용합니다. AI가 반환한 원문은 정확성과 저작권 상태를 확인한 뒤 출판해야 합니다.

## 호환성 점검

Next.js 프로덕션 빌드 기준으로 `next build`를 통과하도록 구성했습니다. Supabase의 실제 연결 및 쓰기는 프로젝트 URL과 서버 전용 키를 배포 환경 변수에 넣은 뒤 확인할 수 있습니다.

## Synology 배포

Synology에서는 Docker 컨테이너를 `127.0.0.1:3000`에만 연결하고 DSM 역방향 프록시를 통해 `literature.lhsstart.synology.me`로 공개합니다. 자세한 절차는 [`docs/SYNOLOGY_DEPLOYMENT.md`](docs/SYNOLOGY_DEPLOYMENT.md)를 참고하세요.

출판된 작품은 `/works/[id]` 고유 주소를 사용하므로 대표 홈페이지와 검색 결과에서 특정 작품으로 직접 연결할 수 있습니다. 상단의 `국어시간 홈`은 `NEXT_PUBLIC_PORTAL_URL`로 이동합니다.
