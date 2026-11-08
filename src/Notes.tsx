import OnlineDraft from './OnlineDraft'
import { useEffect, useRef, useState } from 'react'
import {
  NotebookPen,
  Expand,
  Minimize2,
  Save as SaveIcon,
  Sparkles,
  Heading2,
  List,
  Bold,
  PencilLine,
  Eye,
  Check,
  Circle,
} from 'lucide-react'
import { prepareDraft, type Job, type Material } from './model'

function Preview({ value }: { value: string }) {
  return (
    <div className="note-preview">
      {value.split('\n').map((line, i) => {
        const parts = line
          .replace(/^(## |[-·] )/, '')
          .split(/(\*\*[^*]+\*\*)/g)
          .map((p, n) =>
            p.startsWith('**') && p.endsWith('**') ? (
              <strong key={n}>{p.slice(2, -2)}</strong>
            ) : (
              p
            ),
          )
        return line.startsWith('## ') ? (
          <h3 key={i}>{parts}</h3>
        ) : (
          <div key={i}>
            {/^[-·] /.test(line) ? '• ' : ''}
            {parts}
            {!line && <br />}
          </div>
        )
      })}
    </div>
  )
}
export default function Notes({
  job,
  value,
  materials,
  onSave,
  onDirty,
}: {
  job?: Job
  value: string
  materials: Material[]
  onSave: (v: string) => Promise<void>
  onDirty: (dirty: boolean) => void
}) {
  const [draft, setDraft] = useState(value),
    [full, setFull] = useState(false),
    [preview, setPreview] = useState(false),
    [busy, setBusy] = useState(false),
    [err, setErr] = useState('')
  const input = useRef<HTMLTextAreaElement>(null),
    container = useRef<HTMLElement>(null),
    toggle = useRef<HTMLButtonElement>(null)
  const [online, setOnline] = useState(false)
  const dirty = value !== draft
  useEffect(() => {
    onDirty(dirty)
    return () => onDirty(false)
  }, [dirty, onDirty])
  useEffect(() => {
    if (!full) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    input.current?.focus()
    function key(e: KeyboardEvent) {
      if (document.querySelector('dialog[open]')) return
      if (e.key === 'Escape') {
        setFull(false)
        toggle.current?.focus()
      }
      if (e.key === 'Tab') {
        const focus = container.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),textarea:not(:disabled)',
        )
        if (!focus?.length) return
        const first = focus[0],
          last = focus[focus.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('keydown', key)
      document.body.style.overflow = prev
    }
  }, [full])
  async function save() {
    if (busy) return
    setBusy(true)
    setErr('')
    try {
      await onSave(draft)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  function format(prefix: string, suffix = '') {
    const el = input.current
    if (!el) return
    const a = el.selectionStart,
      b = el.selectionEnd
    const inner = draft.slice(a, b) || (suffix ? '重点' : '')
    setDraft(draft.slice(0, a) + prefix + inner + suffix + draft.slice(b))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(a + prefix.length, a + prefix.length + inner.length)
    })
  }
  return (
    <section
      ref={container}
      role={full ? 'dialog' : undefined}
      aria-modal={full || undefined}
      aria-label={job ? '岗位专属面试准备' : '通用面试准备'}
      className={'card notes ' + (full ? 'full' : '')}
    >
      <header className="card-head">
        <h2>
          <span className="section-icon">
            <NotebookPen />
          </span>
          {job ? '岗位专属面试准备' : '通用准备笔记'}
        </h2>
        <div className="actions">
          <button
            ref={toggle}
            className="text-btn"
            onClick={() => setFull(!full)}
          >
            {full ? <Minimize2 /> : <Expand />}
            {full ? '恢复视图' : '放大编辑'}
          </button>
          <button
            className="outline save-btn"
            disabled={busy || !dirty}
            onClick={save}
          >
            <SaveIcon />
            {busy ? '保存中' : '保存笔记'}
          </button>
        </div>
      </header>
      <div className="editor-tools">
        <div>
          <button
            className={'tool-mode ' + (!preview ? 'selected' : '')}
            onClick={() => setPreview(false)}
          >
            <PencilLine />
            编辑
          </button>
          <button
            className={'tool-mode ' + (preview ? 'selected' : '')}
            onClick={() => setPreview(true)}
          >
            <Eye />
            预览
          </button>
          <i />
          <button
            title="插入标题"
            aria-label="插入标题"
            disabled={preview}
            onClick={() => format('\n## ')}
          >
            <Heading2 />
          </button>
          <button
            title="加粗"
            aria-label="加粗"
            disabled={preview}
            onClick={() => format('**', '**')}
          >
            <Bold />
          </button>
          <button
            title="插入列表"
            aria-label="插入列表"
            disabled={preview}
            onClick={() => format('\n- ')}
          >
            <List />
          </button>
        </div>
        <div>
          <button
            className="draft-btn"
            onClick={() => {
              setDraft((d) =>
                [d.trimEnd(), prepareDraft(job, materials)]
                  .filter(Boolean)
                  .join('\n\n'),
              )
              setPreview(false)
            }}
          >
            <Sparkles />
            离线提纲
          </button>
          <button className="draft-btn" onClick={() => setOnline(true)}>
            在线草稿
          </button>
        </div>
      </div>
      {preview ? (
        <Preview value={draft || '尚无笔记内容'} />
      ) : (
        <textarea
          ref={input}
          className="note-input"
          aria-label="面试笔记正文"
          placeholder="从自我介绍、项目经历或一个想问的问题开始…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
              e.preventDefault()
              void save()
            }
          }}
        />
      )}
      <footer className="note-status">
        <span role="status">
          {dirty ? <Circle size={11} /> : <Check size={13} />}{' '}
          {busy
            ? '正在保存'
            : dirty
              ? '有未保存的修改'
              : '已保存到本机'}
        </span>
        <span>{draft.length} 字</span>
      </footer>
      {online && (
        <OnlineDraft
          job={job}
          onClose={() => setOnline(false)}
          insert={(text) => {
            setDraft((d) => [d.trimEnd(), text].filter(Boolean).join('\n\n'))
            setPreview(false)
            setOnline(false)
          }}
        />
      )}
      {err && (
        <p role="alert" className="error">
          {err}
        </p>
      )}
    </section>
  )
}
