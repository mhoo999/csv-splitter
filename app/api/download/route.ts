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
    const includeHeader = formData.get('includeHeader') === 'true'
    const enableSplit = formData.get('enableSplit') === 'true'
    const splitRowCount = parseInt(formData.get('splitRowCount') as string) || 1000
    const splitByColumn = (formData.get('splitByColumn') as string) || ''

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

    type CellFormat = 'general' | 'text' | 'number' | 'date' | 'currency'

    interface SplitItem {
      columns: string[]
      fileName: string
      columnFormats: { [columnName: string]: CellFormat }
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
      const baseFileName = item.fileName
        .replace(/[^a-zA-Z0-9가-힣_-]/g, '_')
        .substring(0, 100) // 파일명 길이 제한

      // 분할 처리
      interface DataChunk {
        data: any[]
        groupName?: string
        chunkIndex: number
      }

      const dataChunks: DataChunk[] = []

      if (splitByColumn) {
        // 구분 컬럼 기준으로 그룹화 (출력 컬럼에 포함되지 않아도 가능)
        const groups: { [key: string]: any[] } = {}

        // 원본 데이터에서 구분 컬럼 값을 가져와 그룹화
        filteredData.forEach((filteredRow, index) => {
          // allData의 같은 인덱스에서 구분 컬럼 값 가져오기
          const groupValue = String(allData[index]?.[splitByColumn] || '미분류')
          if (!groups[groupValue]) {
            groups[groupValue] = []
          }
          groups[groupValue].push(filteredRow)
        })

        // 각 그룹 처리
        Object.keys(groups).forEach((groupName) => {
          const groupData = groups[groupName]

          if (enableSplit && splitRowCount > 0) {
            // 각 그룹 내에서 splitRowCount 크기로 분할
            for (let i = 0; i < groupData.length; i += splitRowCount) {
              const chunkIndex = Math.floor(i / splitRowCount)
              dataChunks.push({
                data: groupData.slice(i, i + splitRowCount),
                groupName: groupName,
                chunkIndex: chunkIndex
              })
            }
          } else {
            // 그룹별로 파일 하나씩
            dataChunks.push({
              data: groupData,
              groupName: groupName,
              chunkIndex: 0
            })
          }
        })
      } else if (enableSplit && splitRowCount > 0) {
        // 구분 컬럼 없이 전체 데이터를 splitRowCount 크기로 분할
        for (let i = 0; i < filteredData.length; i += splitRowCount) {
          dataChunks.push({
            data: filteredData.slice(i, i + splitRowCount),
            chunkIndex: Math.floor(i / splitRowCount)
          })
        }
      } else {
        // 분할하지 않으면 전체 데이터를 하나의 청크로
        dataChunks.push({
          data: filteredData,
          chunkIndex: 0
        })
      }

      // 각 데이터 청크에 대해 파일 생성
      for (const chunk of dataChunks) {
        const chunkData = chunk.data
        let safeFileName = baseFileName

        if (chunk.groupName) {
          const safeGroupName = chunk.groupName.replace(/[^a-zA-Z0-9가-힣_-]/g, '_')

          // 그룹 내에서 분할된 경우: 파일명_그룹명_0, 파일명_그룹명_1
          if (enableSplit && splitRowCount > 0) {
            safeFileName = `${baseFileName}_${safeGroupName}_${chunk.chunkIndex}`
          } else {
            // 그룹별로만 나눈 경우: 파일명_그룹명
            safeFileName = `${baseFileName}_${safeGroupName}`
          }
        } else if (dataChunks.length > 1) {
          // 그룹명 없이 분할만: 파일명_0, 파일명_1 형식
          safeFileName = `${baseFileName}_${chunk.chunkIndex}`
        }

        if (fileFormat === 'xlsx') {
          // Excel 파일 생성
          let ws: XLSX.WorkSheet

          if (includeHeader) {
            // 헤더 포함
            ws = XLSX.utils.json_to_sheet(chunkData)
          } else {
            // 헤더 제외 - 데이터만 2차원 배열로 변환
            const dataOnly = chunkData.map((row) =>
              selectedColumns.map((col) => row[col] || '')
            )
            ws = XLSX.utils.aoa_to_sheet(dataOnly)
          }

          // 셀 형식 적용
          const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
          const startRow = includeHeader ? range.s.r + 1 : range.s.r // 헤더 포함이면 두 번째 행부터, 아니면 첫 번째 행부터
          for (let R = startRow; R <= range.e.r; R++) {
            selectedColumns.forEach((col, C) => {
              const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
              if (!ws[cellAddress]) return

              const format = item.columnFormats[col] || 'general'

              // 셀 형식에 따라 number format 지정
              if (format === 'general') {
                // 일반 형식 - 기본 형식, 별도 처리 없음
                // Excel이 자동으로 데이터 타입을 인식
              } else if (format === 'number') {
                ws[cellAddress].z = '#,##0.00'
                // 숫자로 변환 시도
                const value = ws[cellAddress].v
                if (typeof value === 'string' && !isNaN(parseFloat(value))) {
                  ws[cellAddress].v = parseFloat(value)
                  ws[cellAddress].t = 'n'
                }
              } else if (format === 'date') {
                ws[cellAddress].z = 'yyyy-mm-dd'
              } else if (format === 'currency') {
                ws[cellAddress].z = '₩#,##0'
                // 숫자로 변환 시도
                const value = ws[cellAddress].v
                if (typeof value === 'string' && !isNaN(parseFloat(value))) {
                  ws[cellAddress].v = parseFloat(value)
                  ws[cellAddress].t = 'n'
                }
              } else if (format === 'text') {
                // 텍스트 형식
                ws[cellAddress].z = '@'
                ws[cellAddress].t = 's'
              }
            })
          }

          const wb = XLSX.utils.book_new()
          XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
          const excelBuffer = XLSX.write(wb, {
            type: 'buffer',
            bookType: 'xlsx',
          })
          zip.file(`${safeFileName}.xlsx`, excelBuffer)
        } else {
          // CSV 파일 생성
          const csv = Papa.unparse(chunkData, {
            header: includeHeader,
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
    }

    // ZIP 파일 생성
    const zipBuffer = await zip.generateAsync({ type: 'uint8array' })

    // ArrayBuffer로 변환
    const arrayBuffer = zipBuffer.buffer.slice(zipBuffer.byteOffset, zipBuffer.byteOffset + zipBuffer.byteLength)

    // 응답 반환
    return new Response(arrayBuffer as ArrayBuffer, {
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
