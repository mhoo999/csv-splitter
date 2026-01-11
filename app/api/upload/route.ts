import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: '파일이 제공되지 않았습니다.' },
        { status: 400 }
      )
    }

    // CSV 파일 읽기
    const text = await file.text()
    
    // CSV 파싱
    const parseResult = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      preview: 1, // 첫 번째 행만 읽어서 헤더 추출
    })

    if (!parseResult.meta.fields || parseResult.meta.fields.length === 0) {
      return NextResponse.json(
        { error: 'CSV 파일에 컬럼이 없습니다.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      columns: parseResult.meta.fields,
      fileName: file.name,
    })
  } catch (error) {
    console.error('업로드 에러:', error)
    return NextResponse.json(
      { error: '파일 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
