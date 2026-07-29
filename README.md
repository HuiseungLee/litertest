# 문학AI실

관리자가 문학 작품 해설을 입력하면 세 AI 에이전트가 순서대로 해설을 정리하고, 수능형 문항 초안을 생성·검토하는 Vercel + Supabase 웹앱입니다.

## 교사·학생 워크플로우

1. 수집 에이전트: 관리자 해설을 작품 메타데이터·핵심 분석·출제 키워드로 정리합니다.
2. 문제 생성 에이전트: 정리된 근거만으로 5지선다 수능형 문제 초안을 만듭니다.
3. 문제 검토 에이전트: 정답 유일성, 근거성, 선택지 균형을 점검해 최종 문항을 반환합니다.

- 교사: 로그인 후 교사 작업실에서 해설을 작성하고, AI 검토 결과를 확인한 뒤 학생용 자료로 출판합니다.
- 학생: 출판된 작품을 검색해 해설을 읽고, `문제 생성하기`로 형성평가를 시작합니다. 시작 및 제출 결과는 학생 계정에 자동 저장됩니다.

Supabase Auth에서 교사 계정을 만든 뒤, SQL Editor에서 해당 사용자의 `profiles.role` 값을 `teacher`로 설정하세요. 학생 회원가입은 자동으로 `student` 역할 프로필을 생성합니다.

## Vercel + Supabase 설정

1. Supabase SQL Editor에서 [`supabase/schema.sql`](supabase/schema.sql)을 실행합니다.
2. Vercel 프로젝트 환경 변수에 다음을 추가합니다.
   - `GEMINI_API_KEY` (선택: 개인 메뉴에서 입력한 키를 대신 사용할 수 있음)
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (서버 전용. 브라우저에 노출하지 마세요.)
3. Vercel에 이 저장소를 연결합니다. 이 프로젝트는 Next.js Route Handler와 Node.js runtime을 사용합니다.

`GET /api/health`는 Gemini 및 Supabase 환경 변수 설정 여부를 확인합니다. `POST /api/generate`는 세 에이전트 워크플로우를 실행하고, `POST /api/results` 및 `GET /api/results`는 Supabase 저장·조회에 사용합니다.

## 호환성 점검

Vercel의 Next.js 프로덕션 빌드 기준으로 `next build`를 통과하도록 구성했습니다. Supabase의 실제 연결 및 쓰기는 프로젝트 URL과 서버 전용 키를 Vercel 환경 변수에 넣은 뒤 확인할 수 있습니다.
