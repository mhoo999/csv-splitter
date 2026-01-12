# 코드 스타일 및 규칙

## TypeScript
- 모든 파일은 TypeScript로 작성
- 인터페이스를 사용하여 타입 정의
- 명시적 타입 어노테이션 선호

## React
- 함수형 컴포넌트 사용
- Hooks 사용 (useState, useRef 등)
- 클라이언트 컴포넌트는 'use client' 디렉티브 사용

## 명명 규칙
- 컴포넌트: PascalCase (예: `Home`, `SplitItem`)
- 변수/함수: camelCase (예: `handleFileSelect`, `selectedColumns`)
- 상수: camelCase 또는 UPPER_SNAKE_CASE
- 파일명: kebab-case 또는 PascalCase (컴포넌트)

## 파일 구조
- API 라우트는 `/app/api` 하위에 위치
- 각 API 엔드포인트는 `route.ts` 파일로 정의
- 메인 페이지는 `app/page.tsx`

## 에러 처리
- try-catch 블록 사용
- 사용자 친화적인 에러 메시지 제공
- console.error로 서버 에러 로깅
