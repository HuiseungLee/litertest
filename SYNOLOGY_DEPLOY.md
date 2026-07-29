# 시놀로지 Container Manager 배포

1. 이 저장소를 시놀로지의 공유 폴더에 내려받습니다.
2. `.env.synology.example`을 `.env`로 복사하고 Supabase·Gemini 값을 입력합니다.
3. **Container Manager → 프로젝트 → 생성**에서 이 폴더와 `docker-compose.yml`을 선택해 빌드·실행합니다.
4. `http://시놀로지-IP:3000`에서 먼저 동작을 확인합니다.
5. 외부 공개는 DSM의 **로그인 포털 → 고급 → 역방향 프록시**에서 HTTPS 도메인(예: `literature.example.com`)을 `http://localhost:3000`으로 연결합니다.
6. Supabase Authentication의 URL Configuration에 최종 HTTPS 주소를 Site URL 및 Redirect URL로 추가합니다.

`NEXT_PUBLIC_`으로 시작하는 Supabase 값은 브라우저 번들 생성 시 사용되므로 값을 변경한 뒤에는 Container Manager에서 **다시 빌드**해야 합니다. `GEMINI_API_KEY`와 서비스 역할 키는 `.env`에만 보관합니다.
