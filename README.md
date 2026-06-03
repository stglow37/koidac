# KOI-DAC

## 프로젝트 개요

KOI-DAC는 알고리즘 문제(KOI, BOJ 등)의 **난이도를 사용자들이 직접 평가하는 커뮤니티 플랫폼**입니다.
로그인한 사용자가 문제를 등록하고, 1~5점으로 난이도를 투표하며, 댓글로 풀이 힌트를 주고받을 수 있습니다.
별도 폴더에 있는 **크롬 익스텐션**이 이 앱의 REST API를 호출해, 문제 사이트에서 직접 난이도 정보를 오버레이로 표시합니다.

- 배포 주소: https://koidac.vercel.app

## 기술 스택

| 항목 | 내용 |
|---|---|
| 프레임워크 | Next.js App Router (TypeScript) |
| UI | React 19 + Tailwind CSS v4 |
| 인증 / 데이터베이스 | Supabase (PostgreSQL + Auth) |
| 배포 | Vercel |

모든 페이지는 클라이언트 사이드 렌더링(`'use client'`)이며, SSR/ISR은 적용되지 않았습니다.
Supabase는 `/api/` 라우트를 제외하면 브라우저에서 직접 호출합니다.

## 핵심 기능

- **인증**: 이메일 + 비밀번호 회원가입 / 로그인 (Supabase Auth); 선택적 닉네임 (`user_metadata.display_name` 저장)
- **문제 등록**: 문제 번호(problem_id)와 제목 입력 후 등록
- **투표**: 문제별 1~5점 난이도 투표; 1인 1회 제한 (DB 유니크 제약)
- **검색 / 정렬**: 문제 번호·제목 검색, 최신순 / 난이도 높은순·낮은순 / 투표 많은순 정렬
- **문제 상세**: 평균 난이도, 투표 현황, 댓글 목록 + 작성
- **관리자 대시보드**: 문제 추가 / 삭제, 댓글 삭제 (`NEXT_PUBLIC_ADMIN_EMAILS` 기반 클라이언트 인증)
- **크롬 익스텐션 API**: 단일 문제 조회 / 자동 등록 / 일괄 조회 (CORS 지원)

## 디렉토리 구조

```
src/
  app/
    page.tsx                          # 홈: 로그인·문제 등록·검색·정렬·투표
    layout.tsx                        # 전역 레이아웃 및 메타데이터
    globals.css                       # Tailwind + 전역 스타일
    admin/
      page.tsx                        # 관리자 대시보드
    problem/
      [id]/
        page.tsx                      # 동적 라우트 껍데기
        ProblemClient.tsx             # 문제 상세 (투표·댓글 포함)
    api/
      problem/
        [id]/route.ts                 # GET 단일 조회 / POST 자동 등록
        bulk/route.ts                 # POST 일괄 조회 (익스텐션용)
  components/
    AuthForm.tsx                      # 로그인 / 회원가입 폼
    ProblemList.tsx                   # 문제 카드 + 투표 버튼 목록
  hooks/
    useProblems.ts                    # 문제 목록 로딩 + 평점 집계
  lib/
    supabase.ts                       # Supabase 클라이언트 초기화
  types/
    index.ts                          # Problem, Comment 인터페이스
```

## Supabase 스키마

### `problems`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | integer | 자동 PK |
| problem_id | integer | 외부 문제 번호 (예: BOJ #1234) |
| title | text | 필수 |
| description | text | 선택 |
| algorithm | text | 선택; 쉼표 구분 태그 |
| created_at | timestamptz | 자동 |

### `votes`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | integer | 자동 PK |
| problem_id | integer | `problems.problem_id` 참조 (problems.id 아님) |
| user_id | text | Supabase auth uid |
| rating | integer | 1–5 |
| — | UNIQUE | `(problem_id, user_id)` — 1인 1회 제한; 중복 시 에러 코드 `23505` |

### `comments`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | integer | 자동 PK |
| problem_id | integer | `problems.problem_id` 참조 |
| user_id | text | Supabase auth uid |
| user_nickname | text | 작성 시점의 `display_name` 스냅샷 (이후 닉네임 변경 반영 안 됨) |
| content | text | 댓글 내용 |
| created_at | timestamptz | 자동 |

## API 엔드포인트 (크롬 익스텐션용)

모든 엔드포인트는 CORS 헤더(`Access-Control-Allow-Origin: *`)와 OPTIONS 핸들러를 포함합니다.

| 메서드 | 경로 | 요청 바디 | 설명 |
|---|---|---|---|
| GET | `/api/problem/[id]` | — | 단일 문제 조회; 미등록 시 404 |
| POST | `/api/problem/[id]` | `{title: string}` | 문제 자동 등록 (익스텐션이 문제 발견 시 호출) |
| POST | `/api/problem/bulk` | `{problemIds: number[]}` | 일괄 조회; `{problem_id, registered, title?, avgRating?, voteCount?}[]` 반환 |

## 환경 변수

```env
NEXT_PUBLIC_SUPABASE_URL=       # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase 익명 클라이언트 키
NEXT_PUBLIC_ADMIN_EMAILS=       # 관리자 이메일 목록 (쉼표 구분, 브라우저에 노출됨)
NEXT_PUBLIC_BASE_URL=           # 앱 URL; 미설정 시 window.location.origin 사용
```

> 모든 변수가 `NEXT_PUBLIC_`이므로 브라우저에서 노출됩니다.

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 열어 확인하세요.

## 주요 주의 사항

- **관리자 인증이 클라이언트 사이드**: `NEXT_PUBLIC_ADMIN_EMAILS`를 브라우저에서 비교하므로 우회 가능. Supabase RLS 도입이 필요합니다.
- **`avgRating`은 문자열**: `Problem.avgRating`은 `.toFixed(1)` 형식의 `string`입니다. 계산이 필요할 때는 `Number(avgRating)`으로 변환하세요.
- **닉네임 스냅샷**: 댓글의 `user_nickname`은 작성 시점의 값이며 이후 변경을 반영하지 않습니다.

## 앞으로 해야 할 일

### 필수 개선 과제
1. **관리자 권한 강화**: 서버 측 검증 또는 Supabase RLS 도입; `NEXT_PUBLIC_ADMIN_EMAILS` 대신 안전한 역할 기반 인증
2. **폼 검증 강화**: 문제 등록 / 댓글 / 회원가입 시 클라이언트·서버 유효성 검사 추가
3. **에러 처리 개선**: 사용자 친화적 오류 메시지, 로딩 상태 일관성

### 확장 가능 기능
- 문제 수정(edit) UI
- 관리자 활동 로그
- 댓글 신고 기능
- SSR 또는 ISR 적용
- 모바일 반응형 디자인 강화
- 이메일 인증 및 비밀번호 재설정 흐름
- 페이지별 SEO 메타 정보

## 개발 히스토리

1. 로그인 / 회원가입 + Supabase 인증 구현
2. 문제 등록 / 투표 기능 추가
3. 문제 상세 페이지 + 댓글 기능 추가
4. 관리자 대시보드 추가
5. 크롬 익스텐션용 REST API 추가 (단일 + 일괄 조회, CORS)

---

**참고**: Supabase 스키마가 변경되면 이 README의 테이블 구조와 함께 `AGENTS.md`도 업데이트하세요.
