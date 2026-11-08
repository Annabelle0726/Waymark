import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Trash2, RefreshCw, Images, ChevronDown } from 'lucide-react'
import {
  readUpload,
  savedScreenshots,
  now,
  uid,
  type Job,
  type Screenshot,
  type Upload,
} from '../../domain/workspace'
import { api } from '../../services/api'
import { Dialog } from '../../components/forms/Forms'

type Row = Screenshot & {
  state: 'saved' | 'pending' | 'read' | 'failed'
  file?: File
  upload?: Upload
  message?: string
}
export function useScreenshots(job?: Job) {
  const [rows, setRows] = useState<Row[]>(() =>
    job ? savedScreenshots(job).map((s) => ({ ...s, state: 'saved' })) : [],
  )
  const [error, setError] = useState('')
  const next = rows.find((r) => r.state === 'pending')
  useEffect(() => {
    if (!next?.file) return
    let active = true
    const file = next.file
    async function recognize() {
      let upload: Upload | undefined
      let original = ''
      let message = ''
      try {
        const bitmap = await createImageBitmap(file)
        const pixels = bitmap.width * bitmap.height
        bitmap.close()
        if (pixels > 24000000) throw new Error('图片过大，请裁切后添加')
        if (!active) return
        upload = { ...(await readUpload(file)), id: next!.fileId }
        if (!active) return
        const result = await api<{ text: string }>(
          'screenshot/recognize',
          'POST',
          { data: upload.data },
        )
        original = result.text
      } catch (err) {
        message =
          err instanceof DOMException
            ? '图片无法读取，请删除后换图'
            : (err as Error).message
      }
      if (active)
        setRows((all) =>
          all.map((row) =>
            row.fileId === next!.fileId
              ? {
                  ...row,
                  upload,
                  original,
                  message,
                  state: message ? 'failed' : 'read',
                }
              : row,
          ),
        )
    }
    void recognize()
    return () => {
      active = false
    }
  }, [next])
  function add(files: File[]) {
    const messages: string[] = []
    const added: Row[] = []
    let size = rows.reduce((n, r) => n + (r.file?.size || 0), 0)
    for (const file of files) {
      if (!['image/png', 'image/jpeg'].includes(file.type)) {
        messages.push(file.name + ' 格式不支持')
        continue
      }
      if (file.size > 10 * 1024 * 1024) {
        messages.push(file.name + ' 超过 10 MB')
        continue
      }
      if (size + file.size > 40 * 1024 * 1024) {
        messages.push('本次新增截图合计最多 40 MB，请分次保存')
        break
      }
      size += file.size
      added.push({
        fileId: uid(),
        name: file.name,
        time: now(),
        original: '',
        file,
        state: 'pending',
      })
    }
    setRows((all) => [...all, ...added])
    setError(messages.join('；'))
  }
  return {
    rows,
    error,
    add,
    remove: (id: string) =>
      setRows((all) => all.filter((r) => r.fileId !== id)),
    retry: (id: string) =>
      setRows((all) =>
        all.map((r) =>
          r.fileId === id ? { ...r, state: 'pending', message: '' } : r,
        ),
      ),
  }
}
function Thumbnail({ row }: { row: Row }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!row.file) return
    const src = URL.createObjectURL(row.file)
    setUrl(src)
    return () => URL.revokeObjectURL(src)
  }, [row.file])
  const src = row.file ? url : '/api/files/' + row.fileId + '?preview=1'
  return src ? <img src={src} alt="" loading="lazy" /> : null
}
export function ScreenshotInput({
  gallery,
}: {
  gallery: ReturnType<typeof useScreenshots>
}) {
  const { rows, add, remove, retry, error } = gallery
  const picker = useRef<HTMLInputElement>(null)
  const latest = useRef(add)
  latest.current = add
  const [drag, setDrag] = useState(false)
  const [zoom, setZoom] = useState<Row>()
  useEffect(() => {
    const dialog = picker.current?.closest('dialog')
    function paste(e: ClipboardEvent) {
      const files = Array.from(e.clipboardData?.files || []).filter((f) =>
        f.type.startsWith('image/'),
      )
      if (files.length && !picker.current?.matches(':disabled')) {
        e.preventDefault()
        latest.current(files)
      }
    }
    dialog?.addEventListener('paste', paste)
    return () => dialog?.removeEventListener('paste', paste)
  }, [])
  return (
    <section className="shot-panel" aria-label="岗位截图">
      <header>
        <h3>
          <Images size={18} />
          岗位截图
        </h3>
        <span>{rows.length} 张</span>
      </header>
      <button
        type="button"
        className={'shot-drop ' + (drag ? 'over' : '')}
        onClick={() => picker.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          if (!picker.current?.matches(':disabled'))
            add(Array.from(e.dataTransfer.files))
        }}
      >
        <span className="drop-icon">
          <ImagePlus size={26} />
        </span>
        <span>
          <strong>选择或拖入多张截图</strong>
          <small>也可直接粘贴 · PNG / JPEG · 单张 10 MB</small>
        </span>
      </button>
      <input
        ref={picker}
        type="file"
        multiple
        hidden
        accept="image/png,image/jpeg"
        aria-label="选择岗位截图"
        onChange={(e) => {
          add(Array.from(e.target.files || []))
          e.target.value = ''
        }}
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {rows.length > 0 && (
        <ul className="shot-list">
          {rows.map((row, i) => {
            const status =
              row.state === 'saved'
                ? '已保存'
                : row.state === 'pending'
                  ? '等待本机识别'
                  : row.message ||
                    (row.original
                      ? '已读取 · 待保存'
                      : '没有读到文字 · 可保存原图')
            return (
              <li key={row.fileId}>
                <button
                  type="button"
                  className="shot-thumb"
                  onClick={() => setZoom(row)}
                  aria-label={'放大截图 ' + (i + 1)}
                >
                  <Thumbnail row={row} />
                </button>
                <div className="shot-copy">
                  <strong>{row.name || '岗位截图 ' + (i + 1)}</strong>
                  <small role="status" className={'shot-status ' + row.state}>
                    {status}
                  </small>
                  {row.original && (
                    <details>
                      <summary>
                        识别原文 <ChevronDown size={12} />
                      </summary>
                      <pre>{row.original}</pre>
                    </details>
                  )}
                  {row.file &&
                    (row.state === 'failed' ||
                      (row.state === 'read' && !row.original)) && (
                      <button
                        type="button"
                        className="text-btn"
                        onClick={() => retry(row.fileId)}
                      >
                        <RefreshCw size={12} />
                        重新识别
                      </button>
                    )}
                </div>
                <button
                  type="button"
                  className="shot-delete"
                  data-dirties
                  aria-label={'删除截图 ' + (i + 1)}
                  title="删除截图"
                  onClick={() => remove(row.fileId)}
                >
                  <Trash2 size={16} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {zoom && (
        <Dialog
          title={zoom.name || '截图预览'}
          onClose={() => setZoom(undefined)}
          wide
        >
          <div className="shot-full">
            <Thumbnail row={zoom} />
          </div>
        </Dialog>
      )}
    </section>
  )
}
