import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import iconv from 'iconv-lite'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const splitList = formData.get('splitList') as string
    const encoding = formData.get('encoding') as string || 'UTF-8'
    const fileFormat = formData.get('fileFormat') as string || 'csv'

    if (!file) {
      return NextResponse.json(
        { error: '파일이 제공되지 않았습니다.' },
        { status: 400 }
      )
    }

    if (!splitList) {
      return NextResponse.json(
        { error: '분리할 컬럼 목록이 없습니다.' },
        { status: 400 }
      )
    }

    interface SplitItem {
      columns: string[]
      fileName: string
    }

    const splitItems: SplitItem[] = JSON.parse(splitList)

    if (splitItems.length === 0) {
      return NextResponse.json(
        { error: '최소 하나의 항목을 추가해야 합니다.' },
        { status: 400 }
      )
    }

    const fileName = file.name.toLowerCase()
    let allData: any[] = []
    let allColumns: string[] = []

    // 원본 파일 데이터 읽기
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      allData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
      
      if (allData.length === 0) {
        return NextResponse.json(
          { error: 'Excel 파일에 데이터가 없습니다.' },
          { status: 400 }
        )
      }

      allColumns = allData[0].map((cell: any) => String(cell || ''))
      // 헤더 제외하고 데이터만
      const dataRows = allData.slice(1)
      allData = dataRows.map((row: any[]) => {
        const obj: any = {}
        allColumns.forEach((col, idx) => {
          obj[col] = row[idx] || ''
        })
        return obj
      })
    } else if (fileName.endsWith('.csv')) {
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

      allData = parseResult.data as any[]
      allColumns = parseResult.meta.fields || []
    }

    const zip = new JSZip()

    // 각 분리 항목에 대해 파일 생성
    for (let idx = 0; idx < splitItems.length; idx++) {
      const item = splitItems[idx]
      const selectedColumns = item.columns
      
      // 선택된 컬럼만 포함하는 데이터 생성
      const filteredData = allData.map((row) => {
        const filteredRow: any = {}
        selectedColumns.forEach((col) => {
          filteredRow[col] = row[col] || ''
        })
        return filteredRow
      })

      // 파일명 생성 (사용자가 지정한 파일명 사용, 안전하게 처리)
      const safeFileName = item.fileName
        .replace(/[^a-zA-Z0-9가-힣_-]/g, '_')
        .substring(0, 100) // 파일명 길이 제한

      if (fileFormat === 'xlsx') {
        // Excel 파일 생성
        const ws = XLSX.utils.json_to_sheet(filteredData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
        const excelBuffer = XLSX.write(wb, {
          type: 'buffer',
          bookType: 'xlsx',
        })
        zip.file(`${safeFileName}.xlsx`, excelBuffer)
      } else {
        // CSV 파일 생성
        const csv = Papa.unparse(filteredData, {
          header: true,
        })

        // 인코딩 변환
        let csvBuffer: Buffer
        if (encoding === 'UTF-8') {
          csvBuffer = Buffer.from(csv, 'utf-8')
        } else if (encoding === 'UTF-8-BOM') {
          csvBuffer = Buffer.from('\ufeff' + csv, 'utf-8')
        } else if (encoding === 'EUC-KR') {
          csvBuffer = iconv.encode(csv, 'euc-kr')
        } else if (encoding === 'CP949') {
          csvBuffer = iconv.encode(csv, 'cp949')
        } else {
          csvBuffer = Buffer.from(csv, 'utf-8')
        }

        zip.file(`${safeFileName}.csv`, csvBuffer)
      }
    }

    // ZIP 파일 생성
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

    // 응답 반환
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="split_files.zip"`,
      },
    })
  } catch (error) {
    console.error('다운로드 에러:', error)
    return NextResponse.json(
      { error: '파일 다운로드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
