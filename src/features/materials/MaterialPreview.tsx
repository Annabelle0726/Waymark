import { useEffect, useRef, useState } from 'react'
import { Download, RotateCw, X } from 'lucide-react'
import type { Material } from '../../domain/workspace'

type Preview =
  | { kind: 'pdf'; url: string }
  | { kind: 'image'; url: string }
  | { kind: 'text' | 'word'; content: string }

export default function MaterialPreview({
  material,
  onClose,
  onDownload,
}: {
  material: Material
  onClose: () => void
  onDownload: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [preview, setPreview] = useState<Preview>()
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => element.close()
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    let url: string | undefined
    setPreview(undefined)
    setError('')
    async function load() {
      try {
        const response = await fetch(
          '/api/files/' + material.fileId + '/preview',
          { signal: controller.signal },
        )
        if (!response.ok) {
          const result = await response.json().catch(() => ({}))
          throw new Error(result.error || '无法读取文件，请重试')
        }
        const type = response.headers.get('content-type') || ''
        const blob = await response.blob()
        if (controller.signal.aborted) return
        let next: Preview
        if (type.startsWith('image/') || type === 'application/pdf') {
          url = URL.createObjectURL(blob)
          next = { kind: type.startsWith('image/') ? 'image' : 'pdf', url }
        } else if (type.startsWith('text/plain')) {
          next = { kind: 'text', content: await blob.text() }
        } else {
          const [mammoth, { default: sanitize }] = await Promise.all([
            import('mammoth'),
            import('dompurify'),
          ])
          const result = await mammoth
            .convertToHtml(
              { arrayBuffer: await blob.arrayBuffer() },
              {
                externalFileAccess: false,
                convertImage: mammoth.images.imgElement(async () => ({
                  src: '',
                })),
              },
            )
            .catch(() => {
              throw new Error(
                'Word 文档无法解析，文件可能损坏或已加密。请下载原文件查看。',
              )
            })
          next = {
            kind: 'word',
            content: sanitize.sanitize(result.value, {
              ALLOWED_TAGS: [
                'p',
                'h1',
                'h2',
                'h3',
                'h4',
                'h5',
                'h6',
                'strong',
                'em',
                'u',
                's',
                'sup',
                'sub',
                'ul',
                'ol',
                'li',
                'table',
                'thead',
                'tbody',
                'tr',
                'th',
                'td',
                'br',
                'blockquote',
              ],
              ALLOWED_ATTR: [],
            }),
          }
        }
        if (!controller.signal.aborted) setPreview(next)
      } catch (e) {
        if (!controller.signal.aborted)
          setError((e as Error).message || '文档解析失败，请下载原文件查看')
      }
    }
    void load()
    return () => {
      controller.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [material.fileId, attempt])
  return (
    <dialog
      ref={dialog}
      className="document-preview"
      aria-label={'预览 ' + material.name}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      <header className="dialog-head">
        <h2>{material.name}</h2>
        <div className="actions">
          <button className="outline" onClick={onDownload}>
            <Download size={16} />
            下载原文件
          </button>
          <button className="icon-btn" aria-label="关闭预览" onClick={onClose}>
            <X />
          </button>
        </div>
      </header>
      <div className="document-body" aria-busy={!preview && !error}>
        {error ? (
          <div className="document-message" role="alert">
            <p>{error}</p>
            <button
              className="outline"
              onClick={() => setAttempt((n) => n + 1)}
            >
              <RotateCw size={15} />
              重试
            </button>
          </div>
        ) : !preview ? (
          <p className="document-message" role="status">
            正在读取文档…
          </p>
        ) : preview.kind === 'image' ? (
          <img
            className="document-image"
            src={preview.url}
            alt={material.name}
            onError={() => setError('图片无法显示，请下载原文件查看')}
          />
        ) : preview.kind === 'pdf' ? (
          <iframe title={material.name + ' PDF 预览'} src={preview.url} />
        ) : preview.kind === 'word' ? (
          <>
            <p className="document-hint">
              Word 内容预览 · 排版与原件可能有差异，图片请下载原件查看。
            </p>
            <article
              className="document-word"
              dangerouslySetInnerHTML={{ __html: preview.content }}
            />
          </>
        ) : (
          <pre className="document-text">
            {preview.content || '文档没有可显示的文字'}
          </pre>
        )}
      </div>
      {preview?.kind === 'pdf' && (
        <p className="document-hint">
          PDF 由浏览器显示；若设备无法显示，可下载原文件查看。
        </p>
      )}
    </dialog>
  )
}
