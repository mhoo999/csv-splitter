'use client'

import { useState, useRef, DragEvent, ChangeEvent } from 'react'

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set())
  const [splitList, setSplitList] = useState<string[][]>([]) // 분리된 컬럼 조합 리스트
  const [encoding, setEncoding] = useState<string>('UTF-8-BOM')
  const [fileFormat, setFileFormat] = useState<string>('csv')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileSelect = async (selectedFile: File) => {
    const fileName = selectedFile.name.toLowerCase()
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      setError('CSV 또는 Excel 파일만 업로드할 수 있습니다.')
      return
    }

    setFile(selectedFile)
    setError(null)
    setSuccess(null)
    setSelectedColumns(new Set())
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
    const newSelected = new Set(selectedColumns)
    if (newSelected.has(column)) {
      newSelected.delete(column)
    } else {
      newSelected.add(column)
    }
    setSelectedColumns(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedColumns.size === columns.length) {
      setSelectedColumns(new Set())
    } else {
      setSelectedColumns(new Set(columns))
    }
  }

  const handleSplit = () => {
    if (selectedColumns.size === 0) {
      setError('최소 하나의 컬럼을 선택해야 합니다.')
      return
    }

    // 선택된 컬럼들을 배열로 변환하여 리스트에 추가
    const newItem = Array.from(selectedColumns).sort()
    
    // 중복 확인 (같은 컬럼 조합이 이미 있는지)
    const isDuplicate = splitList.some(
      (item) => item.length === newItem.length && item.every((col, idx) => col === newItem[idx])
    )

    if (isDuplicate) {
      setError('이미 같은 컬럼 조합이 리스트에 있습니다.')
      return
    }

    setSplitList([...splitList, newItem])
    setSelectedColumns(new Set())
    setSuccess(`리스트에 추가되었습니다! (${newItem.join(', ')})`)
    setTimeout(() => setSuccess(null), 2000)
  }

  const handleRemoveFromList = (index: number) => {
    setSplitList(splitList.filter((_, i) => i !== index))
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
      <h1>📊 CSV/Excel 컬럼 분리 서비스</h1>

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
        <div className="upload-text">📁 CSV 또는 Excel 파일을 드래그하거나 클릭하여 업로드</div>
        <div className="upload-hint">CSV, XLSX, XLS 형식 지원</div>
      </div>

      {error && <div className="error">❌ {error}</div>}
      {success && <div className="success">✅ {success}</div>}

      {file && (
        <div className="file-info">
          <div className="file-name">📄 {file.name}</div>
        </div>
      )}

      {columns.length > 0 && (
        <div className="columns-section">
          <div className="columns-title">컬럼 선택 ({selectedColumns.size}/{columns.length})</div>
          
          <div className="select-all-section">
            <span>전체 선택/해제</span>
            <button className="select-all-button" onClick={handleSelectAll}>
              {selectedColumns.size === columns.length ? '전체 해제' : '전체 선택'}
            </button>
          </div>

          <div className="columns-list">
            {columns.map((column) => (
              <div key={column} className="column-item">
                <input
                  type="checkbox"
                  id={column}
                  className="column-checkbox"
                  checked={selectedColumns.has(column)}
                  onChange={() => handleColumnToggle(column)}
                />
                <label htmlFor={column} className="column-label">
                  {column}
                </label>
              </div>
            ))}
          </div>

          <button
            className="split-button"
            onClick={handleSplit}
            disabled={loading || selectedColumns.size === 0}
          >
            ➕ 리스트에 추가
          </button>
        </div>
      )}

      {splitList.length > 0 && (
        <div className="split-list-section">
          <div className="split-list-title">분리 리스트 ({splitList.length}개)</div>
          <div className="split-list">
            {splitList.map((item, index) => (
              <div key={index} className="split-list-item">
                <span className="split-list-item-columns">{item.join(', ')}</span>
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
            {loading ? '처리 중...' : '📥 ZIP 파일로 다운로드'}
          </button>
        </div>
      )}

      {loading && columns.length === 0 && (
        <div className="loading">파일을 분석하는 중...</div>
      )}
    </div>
  )
}