'use client'

import { useState, useRef, useEffect, DragEvent, ChangeEvent } from 'react'

type CellFormat = 'text' | 'number' | 'date' | 'currency'

interface SplitItem {
  columns: string[]
  fileName: string
  columnFormats: { [columnName: string]: CellFormat }
}

interface Macro {
  name: string
  columns: string[]
  columnFormats: { [columnName: string]: CellFormat }
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [selectedColumnFormats, setSelectedColumnFormats] = useState<{ [key: string]: CellFormat }>({})
  const [splitList, setSplitList] = useState<SplitItem[]>([]) // 분리된 컬럼 조합 리스트
  const [encoding, setEncoding] = useState<string>('UTF-8-BOM')
  const [fileFormat, setFileFormat] = useState<string>('csv')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [macros, setMacros] = useState<Macro[]>([])
  const [showMacroInput, setShowMacroInput] = useState(false)
  const [macroName, setMacroName] = useState('')

  // 로컬스토리지에서 매크로 불러오기
  useEffect(() => {
    const savedMacros = localStorage.getItem('csv-splitter-macros')
    if (savedMacros) {
      try {
        setMacros(JSON.parse(savedMacros))
      } catch (e) {
        console.error('매크로 불러오기 실패:', e)
      }
    }
  }, [])

  const handleFileSelect = async (selectedFile: File) => {
    const fileName = selectedFile.name.toLowerCase()
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      setError('CSV 또는 Excel 파일만 업로드할 수 있습니다.')
      return
    }

    setFile(selectedFile)
    setError(null)
    setSuccess(null)
    setSelectedColumns([])
    setSelectedColumnFormats({})
    setSplitList([])
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '파일 업로드에 실패했습니다.')
      }

      const data = await response.json()
      setColumns(data.columns)
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 처리 중 오류가 발생했습니다.')
      setFile(null)
    } finally {
      setLoading(false)
    }
  }

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }

  const handleColumnToggle = (column: string) => {
    if (selectedColumns.includes(column)) {
      // 이미 선택된 경우 제거
      setSelectedColumns(selectedColumns.filter(col => col !== column))
      const newFormats = { ...selectedColumnFormats }
      delete newFormats[column]
      setSelectedColumnFormats(newFormats)
    } else {
      // 선택되지 않은 경우 클릭 순서대로 추가
      setSelectedColumns([...selectedColumns, column])
      setSelectedColumnFormats({
        ...selectedColumnFormats,
        [column]: 'text' // 기본값은 텍스트
      })
    }
  }

  const handleSelectAll = () => {
    if (selectedColumns.length === columns.length) {
      setSelectedColumns([])
      setSelectedColumnFormats({})
    } else {
      setSelectedColumns([...columns])
      const newFormats: { [key: string]: CellFormat } = {}
      columns.forEach(col => {
        newFormats[col] = 'text'
      })
      setSelectedColumnFormats(newFormats)
    }
  }

  const handleColumnFormatChange = (column: string, format: CellFormat) => {
    setSelectedColumnFormats({
      ...selectedColumnFormats,
      [column]: format
    })
  }

  const generateDefaultFileName = (cols: string[]): string => {
    return cols
      .map((col) => col.replace(/[^a-zA-Z0-9가-힣_-]/g, '_'))
      .join('_')
  }

  const handleSplit = () => {
    if (selectedColumns.length === 0) {
      setError('최소 하나의 컬럼을 선택해야 합니다.')
      return
    }

    // 선택된 컬럼들을 클릭 순서대로 리스트에 추가
    const newColumns = [...selectedColumns]
    const defaultFileName = generateDefaultFileName(newColumns)

    // 현재 선택된 컬럼들의 셀 형식 복사
    const columnFormats: { [key: string]: CellFormat } = {}
    newColumns.forEach(col => {
      columnFormats[col] = selectedColumnFormats[col] || 'text'
    })

    // 중복 확인 (같은 컬럼 조합이 이미 있는지)
    const isDuplicate = splitList.some(
      (item) => item.columns.length === newColumns.length &&
                 item.columns.every((col, idx) => col === newColumns[idx])
    )

    if (isDuplicate) {
      setError('이미 같은 컬럼 조합이 리스트에 있습니다.')
      return
    }

    setSplitList([...splitList, { columns: newColumns, fileName: defaultFileName, columnFormats }])
    setSelectedColumns([])
    setSelectedColumnFormats({})
    setSuccess(`리스트에 추가되었습니다! (${newColumns.join(', ')})`)
    setTimeout(() => setSuccess(null), 2000)
  }

  const handleRemoveFromList = (index: number) => {
    setSplitList(splitList.filter((_, i) => i !== index))
  }

  const handleFileNameChange = (index: number, newFileName: string) => {
    const updatedList = [...splitList]
    updatedList[index].fileName = newFileName
    setSplitList(updatedList)
  }

  const handleSplitItemFormatChange = (index: number, column: string, format: CellFormat) => {
    const updatedList = [...splitList]
    updatedList[index].columnFormats[column] = format
    setSplitList(updatedList)
  }

  const handleSaveMacro = () => {
    if (!macroName.trim()) {
      setError('매크로 이름을 입력해주세요.')
      return
    }

    if (selectedColumns.length === 0) {
      setError('저장할 컬럼을 선택해주세요.')
      return
    }

    const newMacro: Macro = {
      name: macroName.trim(),
      columns: [...selectedColumns],
      columnFormats: { ...selectedColumnFormats }
    }

    // 같은 이름의 매크로가 있는지 확인
    const existingIndex = macros.findIndex(m => m.name === newMacro.name)
    let updatedMacros: Macro[]

    if (existingIndex !== -1) {
      // 기존 매크로 덮어쓰기
      updatedMacros = [...macros]
      updatedMacros[existingIndex] = newMacro
    } else {
      // 새 매크로 추가
      updatedMacros = [...macros, newMacro]
    }

    setMacros(updatedMacros)
    localStorage.setItem('csv-splitter-macros', JSON.stringify(updatedMacros))
    setMacroName('')
    setShowMacroInput(false)
    setSuccess(`매크로 "${newMacro.name}"이(가) 저장되었습니다!`)
    setTimeout(() => setSuccess(null), 2000)
  }

  const handleLoadMacro = (macro: Macro) => {
    // 파일의 모든 컬럼 중 매크로에 포함된 컬럼만 선택
    const validColumns = macro.columns.filter(col => columns.includes(col))

    if (validColumns.length === 0) {
      setError('현재 파일에는 매크로의 컬럼이 없습니다.')
      return
    }

    setSelectedColumns(validColumns)

    // 셀 형식도 함께 적용
    const newFormats: { [key: string]: CellFormat } = {}
    validColumns.forEach(col => {
      newFormats[col] = macro.columnFormats[col] || 'text'
    })
    setSelectedColumnFormats(newFormats)

    setSuccess(`매크로 "${macro.name}"이(가) 적용되었습니다!`)
    setTimeout(() => setSuccess(null), 2000)
  }

  const handleDeleteMacro = (macroName: string) => {
    const updatedMacros = macros.filter(m => m.name !== macroName)
    setMacros(updatedMacros)
    localStorage.setItem('csv-splitter-macros', JSON.stringify(updatedMacros))
    setSuccess(`매크로 "${macroName}"이(가) 삭제되었습니다.`)
    setTimeout(() => setSuccess(null), 2000)
  }

  const handleDownload = async () => {
    if (splitList.length === 0) {
      setError('리스트에 항목이 없습니다. 먼저 컬럼을 선택하고 분리해주세요.')
      return
    }

    if (!file) {
      setError('파일이 선택되지 않았습니다.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('splitList', JSON.stringify(splitList))
      formData.append('encoding', encoding)
      formData.append('fileFormat', fileFormat)

      const response = await fetch('/api/download', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '파일 다운로드에 실패했습니다.')
      }

      // ZIP 파일 다운로드
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'split_files.zip'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setSuccess(`${splitList.length}개의 파일이 성공적으로 생성되었습니다!`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 다운로드 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>csv splitter</h1>

      <div
        className={`upload-area ${isDragging ? 'dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileInputChange}
          className="upload-input"
        />
        <div className="upload-text">CSV 또는 Excel 파일을 드래그하거나 클릭하여 업로드</div>
        <div className="upload-hint">CSV, XLSX, XLS 형식 지원</div>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {file && (
        <div className="file-info">
          <div className="file-name">{file.name}</div>
        </div>
      )}

      {columns.length > 0 && (
        <div className="columns-section">
          <div className="columns-title">컬럼 선택 ({selectedColumns.length}/{columns.length})</div>
          
          <div className="select-all-section">
            <span>전체 선택/해제</span>
            <button className="select-all-button" onClick={handleSelectAll}>
              {selectedColumns.length === columns.length ? '전체 해제' : '전체 선택'}
            </button>
          </div>

          <div className="columns-list">
            {columns.map((column) => {
              const columnIndex = selectedColumns.indexOf(column)
              const isSelected = columnIndex !== -1
              return (
                <div key={column} className="column-item-with-format">
                  <div className="column-item">
                    <input
                      type="checkbox"
                      id={column}
                      className="column-checkbox"
                      checked={isSelected}
                      onChange={() => handleColumnToggle(column)}
                    />
                    <label htmlFor={column} className="column-label">
                      {isSelected && <span className="column-order">({columnIndex + 1}) </span>}
                      {column}
                    </label>
                  </div>
                  {isSelected && (
                    <select
                      className="column-format-select"
                      value={selectedColumnFormats[column] || 'text'}
                      onChange={(e) => handleColumnFormatChange(column, e.target.value as CellFormat)}
                    >
                      <option value="text">텍스트</option>
                      <option value="number">숫자</option>
                      <option value="date">날짜</option>
                      <option value="currency">통화</option>
                    </select>
                  )}
                </div>
              )
            })}
          </div>

          <button
            className="split-button"
            onClick={handleSplit}
            disabled={loading || selectedColumns.length === 0}
          >
            리스트에 추가
          </button>

          {/* 매크로 섹션 */}
          <div className="macro-section">
            <div className="macro-header">
              <div className="macro-title">매크로</div>
              <button
                className="macro-save-button"
                onClick={() => setShowMacroInput(!showMacroInput)}
              >
                {showMacroInput ? '취소' : '현재 선택 저장'}
              </button>
            </div>

            {showMacroInput && (
              <div className="macro-input-section">
                <input
                  type="text"
                  className="macro-name-input"
                  placeholder="매크로 이름 (예: a, b, c 컬럼)"
                  value={macroName}
                  onChange={(e) => setMacroName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveMacro()}
                />
                <button className="macro-confirm-button" onClick={handleSaveMacro}>
                  저장
                </button>
              </div>
            )}

            {macros.length > 0 && (
              <div className="macro-list">
                {macros.map((macro) => (
                  <div key={macro.name} className="macro-item">
                    <button
                      className="macro-load-button"
                      onClick={() => handleLoadMacro(macro)}
                      title={`컬럼: ${macro.columns.join(', ')}`}
                    >
                      {macro.name}
                    </button>
                    <button
                      className="macro-delete-button"
                      onClick={() => handleDeleteMacro(macro.name)}
                      title="삭제"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {splitList.length > 0 && (
        <div className="split-list-section">
          <div className="split-list-title">분리 리스트 ({splitList.length}개)</div>
          <div className="split-list">
            {splitList.map((item, index) => (
              <div key={index} className="split-list-item">
                <div className="split-list-item-content">
                  <input
                    type="text"
                    className="split-list-item-filename"
                    value={item.fileName}
                    onChange={(e) => handleFileNameChange(index, e.target.value)}
                    placeholder="파일명 입력"
                  />
                  <div className="split-list-item-columns-container">
                    {item.columns.map((column) => (
                      <div key={column} className="split-list-column-format">
                        <span className="column-name">{column}</span>
                        <select
                          className="column-format-select-small"
                          value={item.columnFormats[column] || 'text'}
                          onChange={(e) => handleSplitItemFormatChange(index, column, e.target.value as CellFormat)}
                        >
                          <option value="text">텍스트</option>
                          <option value="number">숫자</option>
                          <option value="date">날짜</option>
                          <option value="currency">통화</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  className="remove-button"
                  onClick={() => handleRemoveFromList(index)}
                  title="삭제"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="download-settings">
            <div className="setting-group">
              <label className="setting-label">인코딩:</label>
              <select
                className="setting-select"
                value={encoding}
                onChange={(e) => setEncoding(e.target.value)}
              >
                <option value="UTF-8">UTF-8</option>
                <option value="UTF-8-BOM">UTF-8 (BOM)</option>
                <option value="EUC-KR">EUC-KR</option>
                <option value="CP949">CP949</option>
              </select>
            </div>

            <div className="setting-group">
              <label className="setting-label">파일 형식:</label>
              <select
                className="setting-select"
                value={fileFormat}
                onChange={(e) => setFileFormat(e.target.value)}
              >
                <option value="csv">CSV</option>
                <option value="xlsx">Excel (XLSX)</option>
              </select>
            </div>
          </div>

          <button
            className="download-button"
            onClick={handleDownload}
            disabled={loading}
          >
            {loading ? '처리 중...' : 'ZIP 파일로 다운로드'}
          </button>
        </div>
      )}

      {loading && columns.length === 0 && (
        <div className="loading">파일을 분석하는 중...</div>
      )}

      <footer className="footer">
        <div className="button-group">
          <a
            href="https://hoons-service-archive.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="button-link"
          >
            다른 서비스 이용해보기
          </a>
          <a
            href="https://hoons-service-archive.vercel.app/#coffee"
            target="_blank"
            rel="noopener noreferrer"
            className="button-link"
          >
            개발자 커피 한잔 사주기
          </a>
        </div>
        <div className="email-section">
          mhoo999@naver.com
        </div>
      </footer>
    </div>
  )
}