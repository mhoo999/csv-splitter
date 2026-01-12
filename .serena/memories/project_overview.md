# CSV Splitter - 프로젝트 개요

## 목적
CSV 또는 Excel 파일의 컬럼을 선택하여 분리하고, 각 컬럼 조합을 별도 파일(CSV 또는 XLSX)로 변환하여 ZIP 파일로 다운로드할 수 있는 웹 서비스

## 기술 스택
- **Next.js 14** (App Router)
- **TypeScript**
- **React 18** (함수형 컴포넌트, Hooks)
- **PapaParse** - CSV 파싱
- **xlsx** - Excel 파일 생성/읽기
- **JSZip** - ZIP 파일 생성
- **iconv-lite** - 인코딩 변환 (UTF-8, UTF-8-BOM, EUC-KR, CP949)
- **Vercel Analytics**
- **Vercel** - 배포 플랫폼

## 코드베이스 구조
```
/app
  /api
    /upload - 파일 업로드 및 컬럼 추출
    /download - 분리된 파일들을 ZIP으로 생성
    /split - (사용되지 않음, 레거시)
  page.tsx - 메인 UI 컴포넌트
  layout.tsx - 레이아웃
  globals.css - 전역 스타일
  icon.svg - 파비콘
```

## 주요 기능
1. 파일 업로드 (드래그 앤 드롭 지원): CSV, XLSX, XLS
2. 컬럼 자동 추출 및 표시
3. 체크박스로 컬럼 선택
4. 여러 개의 컬럼 조합을 리스트에 추가
5. 각 조합마다 파일명 지정 가능
6. 인코딩 선택 (UTF-8, UTF-8-BOM, EUC-KR, CP949)
7. 출력 형식 선택 (CSV, XLSX)
8. ZIP 파일로 일괄 다운로드
