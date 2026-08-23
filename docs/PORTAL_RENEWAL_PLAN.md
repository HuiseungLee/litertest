# 국어시간 대표 포털 리뉴얼 설계

## 목표 구조

| 공개 주소 | 역할 | 운영 방식 |
|---|---|---|
| `lhsstart.synology.me` | 국어교육 대표 포털 | 별도 포털 앱 또는 기존 Web Station 교체 |
| `literature.lhsstart.synology.me` | 문학 작품 해설·Q&A | 이 저장소의 Next.js 컨테이너 |
| `grammar.lhsstart.synology.me` | 문법 학습 | 추후 별도 저장소·컨테이너 |
| `supabase.lhsstart.synology.me` | 공통 인증·데이터 API | 현재 자체 호스팅 Supabase |

대표 포털은 문학 웹앱을 `iframe`으로 삽입하지 않고 일반 링크로 연결합니다. 각 서비스는 독립적인 화면을 유지하고 상단의 `국어시간 홈` 링크로 대표 포털에 돌아옵니다.

## 대표 포털 메뉴

1. 문학
2. 문법
3. 독서
4. 화법
5. 작문
6. 방명록

기존 `문헌정보학`은 상단 주 메뉴에서 제외하고 `자료실` 또는 `기존 자료 아카이브`에 배치합니다.

## 첫 화면

- 사이트 소개와 전체 자료 검색
- 여섯 카테고리 카드
- 분야별 최근 게시물
- 전체 최근 업데이트
- 공지사항
- 기존 자료 아카이브
- 교사 관리 진입점

모바일에서는 상단 메뉴를 접는 방식으로 제공하고 모든 카드는 한 열로 표시합니다.

## 문학 연동

- 문학 카드: `https://literature.lhsstart.synology.me/`
- 최근 문학 자료: `https://literature.lhsstart.synology.me/works/[id]`
- 문학 웹앱 브랜드와 `국어시간 홈`: `https://lhsstart.synology.me/`

## 기존 주소 보존

기존 정적 작품은 바로 삭제하지 않습니다. 새 DB로 옮긴 작품마다 기존 주소와 신규 `/works/[id]` 주소의 대응표를 만들고, 검수 후 기존 주소에서 신규 주소로 301 리다이렉트합니다. 이전이 끝나지 않은 자료는 기존 아카이브에서 계속 제공합니다.

## 안전한 전환 순서

1. 기존 Supabase Cloud 데이터를 Synology로 복원
2. 문학 앱을 `literature.lhsstart.synology.me`에서 시험
3. 기존 대표 홈페이지의 문학 링크만 새 주소로 변경
4. 별도 시험 주소에서 새 대표 포털 제작
5. 새 포털 검수 후 `lhsstart.synology.me`에 연결
6. 기존 홈페이지를 아카이브 주소로 보존
7. 문법 앱을 별도 프로젝트로 구축
