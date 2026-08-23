# 수니기는 문학시간

교사가 문학 작품 해설을 출판하고 학생이 작품별 Q&A에서 질문할 수 있는 Next.js + Supabase 웹앱입니다.

## 교사·학생 워크플로우

- 교사: 로그인 후 교사 작업실에서 해설을 작성하고 학생용 자료로 출판합니다.
- 학생: 출판된 작품을 검색해 해설을 읽고, 작품별 Q&A에서 질문을 남기고 교사의 답변을 확인합니다.
- 교사: 작품별 Q&A에서 학생 질문에 답변하고 관련 댓글을 관리합니다.

Supabase Auth에서 교사 계정을 만든 뒤, SQL Editor에서 해당 사용자의 `profiles.role` 값을 `teacher`로 설정하세요. 학생 회원가입은 자동으로 `student` 역할 프로필을 생성합니다.

## Supabase 설정

1. Supabase SQL Editor에서 [`supabase/schema.sql`](supabase/schema.sql)을 실행합니다.
2. 배포 환경 변수에 다음을 추가합니다.
   - `GEMINI_API_KEY` (선택: 개인 메뉴에서 입력한 키를 대신 사용할 수 있음)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (서버 전용. 브라우저에 노출하지 마세요.)
3. 이 프로젝트는 Next.js Route Handler와 Node.js runtime을 사용합니다.

`GET /api/health`는 Gemini 및 Supabase 환경 변수 설정 여부를 확인합니다. `POST /api/generate`는 세 에이전트 워크플로우를 실행하고, `POST /api/results` 및 `GET /api/results`는 Supabase 저장·조회에 사용합니다.

## 호환성 점검

Next.js 프로덕션 빌드 기준으로 `next build`를 통과하도록 구성했습니다. Supabase의 실제 연결 및 쓰기는 프로젝트 URL과 서버 전용 키를 배포 환경 변수에 넣은 뒤 확인할 수 있습니다.

## Synology 배포

Synology에서는 Docker 컨테이너를 `127.0.0.1:3000`에만 연결하고 DSM 역방향 프록시를 통해 `literature.lhsstart.synology.me`로 공개합니다. 자세한 절차는 [`docs/SYNOLOGY_DEPLOYMENT.md`](docs/SYNOLOGY_DEPLOYMENT.md)를 참고하세요.

출판된 작품은 `/works/[id]` 고유 주소를 사용하므로 대표 홈페이지와 검색 결과에서 특정 작품으로 직접 연결할 수 있습니다. 상단의 `국어시간 홈`은 `NEXT_PUBLIC_PORTAL_URL`로 이동합니다.
