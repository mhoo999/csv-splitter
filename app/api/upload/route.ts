import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

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

    const fileName = file.name.toLowerCase()
    let columns: string[] = []

    // Excel 파일 처리
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      
      // 첫 번째 행을 헤더로 사용
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
      
      if (jsonData.length === 0) {
        return NextResponse.json(
          { error: 'Excel 파일에 데이터가 없습니다.' },
          { status: 400 }
        )
      }

      // 첫 번째 행을 컬럼명으로 사용
      columns = jsonData[0].map((cell: any) => String(cell || ''))
      
      if (columns.length === 0 || columns.every(col => !col)) {
        return NextResponse.json(
          { error: 'Excel 파일에 컬럼이 없습니다.' },
          { status: 400 }
        )
      }
    } 
    // CSV 파일 처리
    else if (fileName.endsWith('.csv')) {
      // 여러 인코딩 시도
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

      columns = parseResult.meta.fields
    } else {
      return NextResponse.json(
        { error: 'CSV 또는 Excel 파일만 업로드할 수 있습니다.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      columns,
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
