# CSV Splitter

CSV 파일의 컬럼을 선택하여 분리하고, 각 컬럼을 Excel 파일로 변환하여 ZIP 파일로 다운로드할 수 있는 웹 서비스입니다.

## 기능

- 📄 CSV 파일 업로드 (드래그 앤 드롭 지원)
- 📋 CSV 파일의 컬럼명 자동 추출
- ☑️ 체크박스로 원하는 컬럼 선택
- 📊 선택한 컬럼별로 Excel 파일 생성
- 📦 모든 Excel 파일을 ZIP 파일로 한번에 다운로드

## 기술 스택

- **Next.js 14** - React 프레임워크 (App Router)
- **TypeScript** - 타입 안정성
- **PapaParse** - CSV 파싱
- **xlsx** - Excel 파일 생성
- **JSZip** - ZIP 파일 생성
- **Vercel** - 배포 플랫폼

## 로컬 개발

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 사용하세요.

## Vercel 배포

1. GitHub에 프로젝트를 푸시
2. [Vercel](https://vercel.com)에 로그인
3. "New Project" 클릭
4. GitHub 저장소 선택
5. 배포 설정 확인 후 "Deploy" 클릭

또는 Vercel CLI를 사용:

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel
```

## 사용 방법

1. CSV 파일을 업로드 영역에 드래그하거나 클릭하여 선택
2. 자동으로 컬럼명이 표시됩니다
3. 분리하고 싶은 컬럼을 체크박스로 선택
4. "분리하기" 버튼 클릭
5. ZIP 파일이 자동으로 다운로드됩니다 (각 컬럼이 별도의 Excel 파일로 포함됨)
