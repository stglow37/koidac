This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


📝 My Personal Page (개인 메모장 및 연구 노트 웹 서비스)
Developer: 신우진 (Shin Woo-jin)
Last Updated: 2026-05

1. 프로젝트 개요 (Project Overview)
본 프로젝트는 개인적인 물리 연구, 프로그래밍 학습 기록, 학교생활 등을 체계적으로 분류하고 기록하기 위해 개발된 풀스택(Full-stack) 웹 애플리케이션입니다. 클라우드 데이터베이스를 연동하여 영구적인 데이터 보존이 가능하며, 사용자 맞춤형 카테고리(폴더) 생성 기능과 다크 모드 UI를 지원합니다.

2. 기술 스택 (Tech Stack)
Backend: Python, FastAPI

Database: PostgreSQL (Render Managed DB), SQLAlchemy (ORM), psycopg2-binary

Frontend: Vanilla HTML, CSS, JavaScript (비동기 Fetch API 활용)

Deployment: Render (Web Service), GitHub (CI/CD Pipeline)

3. 시스템 아키텍처 및 배포 환경 (Architecture)
서버 구조: FastAPI가 백엔드 API 서버 역할과 정적 파일(HTML, JS) 서빙을 동시에 수행하는 모놀리식(Monolithic) 구조.

데이터베이스 연동: 로컬 환경에서는 SQLite를 사용했으나, Render 배포 후 데이터 휘발성 문제를 해결하기 위해 PostgreSQL로 마이그레이션 완료. 환경 변수(DATABASE_URL)를 통해 동적으로 DB 주소를 할당받음.

CI/CD 파이프라인: 로컬(VS Code)에서 코드 수정 후 GitHub의 main 브랜치로 Push하면, Render가 이를 감지하여 자동으로 빌드 및 재배포(Redeploy)를 수행함.

4. 데이터베이스 스키마 (Database Schema)
현재 카테고리와 메모가 분리된 관계형 데이터베이스 구조(RDBMS)로 업그레이드 중입니다.

Table: categories

id (Integer, Primary Key)

name (String, Unique) - 폴더의 이름 (예: 물리연구, C++공부)

Table: notes (현재 notes_v3 등으로 버전 관리 중)

id (Integer, Primary Key)

title (String) - 메모 제목

content (String) - 메모 본문

category_id (Integer, Foreign Key 참조 예정) - 해당 메모가 속한 카테고리의 고유 ID

5. 주요 구현 기능 (Implemented Features)
메모 CRUD 기능: 프론트엔드에서 비동기(fetch)로 API를 호출하여 메모를 생성하고 불러오는 기본 기능 완료.

커스텀 카테고리 기능: 사용자가 직접 이름을 입력하여 새로운 폴더(카테고리)를 생성하고, 메모 작성 시 이를 선택할 수 있는 기능.

반응형 다크 모드 UI: CSS를 활용해 어두운 배경(#1a1a1a, #2d2d2d) 중심의 카드형 레이아웃을 구성하여 가독성 향상.

로그인 및 이메일 인증 기능 (개발 중): SMTP를 활용한 인증 메일 발송 로직 구현됨.

6. 현재 개발 상태 및 알려진 이슈 (Current Status & Known Issues)
새로운 작업자나 AI는 아래의 이슈들을 우선적으로 해결해야 합니다.

Issue 1: 카테고리 생성 시 빈 값('') 예외 처리 부족 (DB 충돌)

상황: UI에서 폴더 이름 없이 생성을 요청했을 때, DB에 빈 문자열이 unique 제약 조건과 충돌하여 Internal Server Error (500) 발생.

해결 방향: FastAPI 라우터 및 JS onclick 이벤트 내부에 빈 문자열 예외 처리(Validation) 추가 필요. 꼬인 DB 테이블은 __tablename__을 변경하여 초기화 요망.

Issue 2: 프론트엔드 코드 비대화 (Refactoring 필요)

상황: index.html 내부에 HTML, CSS, JS 코드가 혼재되어 있어 유지보수가 어려워짐.

해결 방향: JS 코드를 static/script.js로 분리하고, FastAPI에서 StaticFiles를 마운트하여 정적 파일을 서빙하는 구조로 개편 진행 예정.

Issue 3: 이메일 인증 링크 라우팅 오류

상황: 회원가입 시 인증 메일은 정상 발송되나, 첨부된 링크 클릭 시 정상적인 페이지 연결이 안 됨.

해결 방향: 메일 발송 시 생성되는 URL이 localhost로 하드코딩되어 있는지 확인하고, Render의 실제 배포 도메인으로 수정. 또한, 해당 링크를 처리할 @app.get("/verify/...") 형태의 API 엔드포인트 검증 필요.


SMTP 메일 제한 확인 필요...