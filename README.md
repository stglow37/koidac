# KOI-DAC

## 프로젝트 개요
KOI-DAC는 Supabase 기반 Next.js 웹 앱입니다. 사용자는 로그인 후 문제를 등록하고, 문제 별로 1~5점 투표와 댓글을 남길 수 있으며, 관리자만 접근할 수 있는 대시보드에서 문제와 댓글을 관리할 수 있습니다.

이 프로젝트는 다음 기능을 중심으로 구성되어 있습니다.
- Supabase 인증(Sign up / Sign in) 기반 사용자 인증
- 문제 등록 및 목록 표시
- 문제별 평균 투표 점수 계산
- 문제별 상세 페이지, 댓글 작성
- 관리자 전용 문제 및 댓글 관리

## 핵심 기능
- `src/app/page.tsx`: 로그인/회원가입, 문제 등록, 문제 목록, 투표 기능
- `src/components/AuthForm.tsx`: 로그인/회원가입 UI 컴포넌트
- `src/components/ProblemList.tsx`: 문제 카드, 투표 버튼, 문제 디테일 링크
- `src/hooks/useProblems.ts`: Supabase에서 문제 목록과 투표 점수 집계 로직
- `src/app/problem/[id]/page.tsx`: 문제 상세 페이지, 댓글 로딩/추가
- `src/app/admin/page.tsx`: 관리자 인증, 문제 생성, 문제 삭제, 댓글 삭제

## 기술 스택
- 프레임워크: Next.js 16 App Router
- 언어: TypeScript, React
- 스타일: Tailwind CSS v4
- 인증/데이터: Supabase (`@supabase/supabase-js`)
- 클라이언트 라우팅: Next.js App Router + dynamic route

## 디렉토리 구조
```
src/
  app/
    page.tsx                # 홈 / 로그인 / 문제 등록 / 문제 목록
    admin/page.tsx          # 관리자 대시보드
    problem/[id]/page.tsx   # 문제 상세 페이지
    layout.tsx              # 전역 레이아웃 및 메타데이터
    globals.css             # Tailwind + 전역 스타일
  components/
    AuthForm.tsx            # 인증 폼 컴포넌트
    ProblemList.tsx         # 문제 목록 렌더링 컴포넌트
  hooks/
    useProblems.ts          # 문제 목록 로딩 및 평점 집계 훅
  lib/
    supabase.ts             # Supabase 클라이언트 생성
  types/
    index.ts                # Problem, Comment 타입 정의
```

## 필수 환경 변수
`NEXT_PUBLIC_SUPABASE_URL`와 `NEXT_PUBLIC_SUPABASE_ANON_KEY`가 반드시 필요합니다. 또한 관리자 기능을 위해 `NEXT_PUBLIC_ADMIN_EMAILS`를 설정해야 합니다.

예시 `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_ADMIN_EMAILS=admin@example.com
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 환경 변수 설명
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 익명 클라이언트 키
- `NEXT_PUBLIC_ADMIN_EMAILS`: 관리자 허용 이메일 목록 (쉼표 구분)
- `NEXT_PUBLIC_BASE_URL`: 이메일 인증 리다이렉트 URL을 지정할 때 사용

## Supabase 예상 스키마
현재 코드에서 사용하는 테이블과 예상 필드는 다음과 같습니다.

### `problems`
- `id`: integer
- `problem_id`: integer
- `title`: text
- `description`: text?
- `algorithm`: text?
- `created_at`: timestamp

### `votes`
- `id`: integer
- `problem_id`: integer
- `user_id`: text
- `rating`: integer

### `comments`
- `id`: integer
- `problem_id`: integer
- `user_id`: text
- `content`: text
- `created_at`: timestamp

> 주의: `votes` 테이블에 중복 투표 방지 제약 조건(`problem_id`, `user_id`)이 있는 것으로 코드가 기대할 수 있습니다.

## 실행 방법
```bash
npm install
npm run dev
```
브라우저에서 `http://localhost:3000`을 열어 앱을 확인하세요.

## 주요 페이지 안내
### 홈 페이지
- 로그인 / 회원가입 폼
- 문제 등록 폼
- 문제 목록
- 각 문제 카드에서 `문제 상세` 페이지로 이동 가능
- 점수 투표 버튼 (1~5)

### 문제 상세 페이지
- 문제 제목, 설명, 알고리즘 태그 표시
- 해당 문제 댓글 목록 표시
- 로그인 사용자는 댓글 작성 가능
- 로그인 사용자는 투표 가능

### 관리자 페이지
- 로그인한 사용자가 `NEXT_PUBLIC_ADMIN_EMAILS`에 포함된 이메일일 때 접근 가능
- 문제 추가 / 삭제
- 댓글 삭제
- 관리자만 볼 수 있는 전용 대시보드

## 현재 상태 요약
### 구현된 것
- Supabase 인증 기반 회원가입/로그인
- 문제 등록과 목록 조회
- 문제 평균 평점 집계
- 문제 상세 페이지 / 댓글 기능
- 관리자 페이지 / 관리자 확인
- App Router 기반 동적 라우트 `/problem/[id]`

### 제한 사항 / 개선 필요
- 관리자 인증은 클라이언트 환경 변수 기반 이메일 허용 목록이므로 보안상 취약함
- 입력 폼 검증이 간단하게만 되어 있음
- 에러 처리와 로딩 상태 개선 여지 있음
- 현재 서버 측 렌더링(SSR) 없이 클라이언트에서 Supabase를 직접 호출함
- `NEXT_PUBLIC_BASE_URL`이 없으면 브라우저 `window.location.origin`에 의존함

## AI에게 알려줘야 할 점
AI가 프로젝트를 이해할 때 다음 사항을 반드시 알아야 합니다.
- 이 앱은 Next.js App Router를 사용하며, 페이지는 모두 `src/app` 아래에 있음
- Supabase를 직접 클라이언트에서 호출함
- `src/lib/supabase.ts`에서 Supabase 클라이언트를 생성함
- `src/hooks/useProblems.ts`는 문제 목록을 로딩하고 평가 점수를 계산하는 역할
- `src/components/ProblemList.tsx`는 문제 카드와 투표 UI 함수를 받음
- `src/app/admin/page.tsx`는 관리자 이메일 목록으로 권한을 판단함
- 조건부 렌더링이 많으므로 로그인/비로그인, 관리자/비관리자 상태를 모두 고려해야 함
- `Problem`과 `Comment` 인터페이스는 `src/types/index.ts`에 있음

## 앞으로 해야 할 일
### 필수 개선 과제
1. 관리자 권한 강화
   - 서버 측 검증 또는 Supabase Row Level Security(RLS) 도입
   - `NEXT_PUBLIC_ADMIN_EMAILS` 대신 서버 내 안전한 역할 기반 인증 사용
2. 폼 검증
   - 문제 추가/댓글 작성/회원가입 시 클라이언트 및 서버 유효성 검사 추가
3. 에러 메시지 정교화
   - 사용자 친화적인 오류 안내와 실패 상황 처리
4. 데이터 일관성
   - `votes` 중복 방지 로직 확인 및 DB 제약 조건 적용
   - `comments`, `problems` 관계 정리

### 확장 가능 기능
- 검색 / 필터 / 정렬 기능 추가
- 문제 수정(edit) UI 구현
- 관리자 전용 로그/활동 기록
- 댓글 신고 및 복구 기능
- 페이지별 SEO 메타 정보 개선
- 서버 측 렌더링 또는 ISR 적용
- 모바일/반응형 디자인 강화
- 인증 이메일 및 비밀번호 재설정 흐름 개선

## 개발 히스토리
이 프로젝트는 현재 다음 흐름으로 발전 중입니다.
1. 로그인/회원가입 + Supabase 인증 구현
2. 문제 CRUD 및 투표 기능 추가
3. 문제 상세 페이지와 댓글 기능 추가
4. 관리자 대시보드 추가

## 참고
- Next.js 16 App Router
- Tailwind CSS v4
- Supabase JS v2

---

### 추가 설명
이 README는 프로젝트를 새로 이해하는 사람과 AI 모두가 빠르게 파악할 수 있도록 작성되었습니다. 실제 Supabase 스키마가 변경되면 README의 테이블 구조와 환경 변수 설명을 함께 업데이트하세요.
