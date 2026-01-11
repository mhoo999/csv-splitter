import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const selectedColumns = formData.get('columns') as string

    if (!file) {
      return NextResponse.json(
        { error: '파일이 제공되지 않았습니다.' },
        { status: 400 }
      )
    }

    if (!selectedColumns) {
      return NextResponse.json(
        { error: '선택된 컬럼이 없습니다.' },
        { status: 400 }
      )
    }

    const columns: string[] = JSON.parse(selectedColumns)

    if (columns.length === 0) {
      return NextResponse.json(
        { error: '최소 하나의 컬럼을 선택해야 합니다.' },
        { status: 400 }
      )
    }

    // CSV 파일 읽기 및 파싱
    const text = await file.text()
    const parseResult = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
    })

    if (!parseResult.data || parseResult.data.length === 0) {
      return NextResponse.json(
        { error: 'CSV 파일에 데이터가 없습니다.' },
        { status: 400 }
      )
    }

    // 각 선택된 컬럼별로 파일 생성
    const zip = new JSZip()

    for (const column of columns) {
      // 해당 컬럼만 포함하는 데이터 생성
      const filteredData = (parseResult.data as any[]).map((row) => ({
        [column]: row[column] || '',
      }))

      // Excel 워크북 생성
      const ws = XLSX.utils.json_to_sheet(filteredData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

      // Excel 파일을 버퍼로 변환
      const excelBuffer = XLSX.write(wb, {
        type: 'buffer',
        bookType: 'xlsx',
      })

      // ZIP에 추가 (파일명: 컬럼명.xlsx)
      const safeFileName = column.replace(/[^a-zA-Z0-9가-힣_-]/g, '_')
      zip.file(`${safeFileName}.xlsx`, excelBuffer)
    }

    // ZIP 파일 생성
    const zipBuffer = await zip.generateAsync({ type: 'uint8array' })

    // 응답 반환
    return new Response(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="split_files.zip"`,
      },
    })
  } catch (error) {
    console.error('분리 에러:', error)
    return NextResponse.json(
      { error: '파일 분리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

