import { useEffect, useRef, useState } from 'react'
import { readUpload, type Upload } from '../../domain/workspace'
import { api } from '../../services/api'

export type Scan = {
  upload?: Upload
  text: string
  pending: boolean
  message: string
}

export function ScreenshotInput({
  scan,
  onScan,
}: {
  scan: Scan
  onScan: (s: Scan) => void
}) {
  const version = useRef(0)
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState('')
  const current = useRef<File | undefined>(undefined)
  const latest = useRef(onScan)
  latest.current = onScan

  async function select(file: File) {
    const id = ++version.current
    current.current = file
    setPreview('')
    latest.current({ text: '', pending: true, message: '正在本机识别截图…' })
    let upload: Upload | undefined
    try {
      if (!['image/png', 'image/jpeg'].includes(file.type))
        throw new Error('请选择 PNG 或 JPEG 图片')
      if (file.size > 10 * 1024 * 1024) throw new Error('单张截图最大 10 MB')
      const image = await createImageBitmap(file)
      const pixels = image.width * image.height
      image.close()
      if (pixels > 24000000) throw new Error('请裁切到 2400 万像素以内')
      upload = await readUpload(file)
      if (id !== version.current) return
      setPreview('data:' + file.type + ';base64,' + upload.data)
      const { text } = await api<{ text: string }>(
        'screenshot/recognize',
        'POST',
        { data: upload.data },
      )
      if (id === version.current)
        latest.current({
          upload,
          text,
          pending: false,
          message: text
            ? '已读取截图。请核对候选字段，缺失内容可在保存后补充。'
            : '没有读到清晰文字。可以换图，也可以先保存原图。',
        })
    } catch (error) {
      if (id === version.current)
        latest.current({
          upload,
          text: '',
          pending: false,
          message:
            error instanceof DOMException
              ? '图片无法解码，请换一张截图。'
              : (error as Error).message,
        })
    }
  }
  useEffect(() => {
    const dialog = input.current?.closest('dialog')
    function paste(event: ClipboardEvent) {
      const item = Array.from(event.clipboardData?.items || []).find(
        (i) => i.kind === 'file' && i.type.startsWith('image/'),
      )
      const file = item?.getAsFile()
      if (file && !input.current?.matches(':disabled')) {
        event.preventDefault()
        void select(file)
      }
    }
    dialog?.addEventListener('paste', paste)
    return () => {
      version.current++
      dialog?.removeEventListener('paste', paste)
    }
  }, [])
  return (
    <section className="screenshot-input" aria-label="截图识别">
      <label>
        选择或粘贴岗位截图
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void select(f)
            e.target.value = ''
          }}
        />
      </label>
      <p>支持 PNG、JPEG，最大 10 MB。可在此窗口按 Ctrl+V 或 ⌘V 粘贴截图。</p>
      {preview && <img src={preview} alt="当前岗位截图预览" />}
      <p role="status">{scan.message}</p>
      {scan.upload && !scan.pending && !scan.text && (
        <button
          type="button"
          className="outline small"
          onClick={() => current.current && select(current.current)}
        >
          重新识别
        </button>
      )}
      {scan.text && (
        <details>
          <summary>查看识别原文</summary>
          <pre>{scan.text}</pre>
        </details>
      )}
    </section>
  )
}
