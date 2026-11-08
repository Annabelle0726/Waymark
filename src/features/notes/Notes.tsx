import Preview from './Preview'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Heading2,
  Bold,
  List,
  NotebookPen,
  Expand,
  Minimize2,
  Save,
  Plus,
  Trash2,
  Check,
  Eye,
  PencilLine,
} from 'lucide-react'
import { uid, type Job } from '../../domain/workspace'
import {
  readPreparation,
  writePreparation,
  type PreparationSection,
} from '../../domain/preparation'
import Review from './Review'

export default function Notes({
  job,
  value,
  onSave,
  onDirty,
}: {
  job?: Job
  value: string
  onSave: (v: string) => Promise<void>
  onDirty: (dirty: boolean) => void
}) {
  const baseline = useMemo(
    () => writePreparation(readPreparation(value)),
    [value],
  )
  const [draft, setDraft] = useState(() => readPreparation(value))
  const [full, setFull] = useState(false),
    [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const container = useRef<HTMLElement>(null),
    toggle = useRef<HTMLButtonElement>(null)
  const active = useRef<HTMLTextAreaElement | null>(null)
  const serialized = writePreparation(draft),
    dirty = serialized !== baseline
  useEffect(() => {
    onDirty(dirty)
    return () => onDirty(false)
  }, [dirty, onDirty])
  useEffect(() => {
    if (!full) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    container.current?.querySelector<HTMLTextAreaElement>('textarea')?.focus()
    function key(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setFull(false)
        toggle.current?.focus()
      }
      if (e.key === 'Tab') {
        const nodes = container.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),summary',
        )
        const visible = Array.from(nodes || []).filter(
          (el) => el.getClientRects().length,
        )
        const first = visible[0],
          last = visible[visible.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('keydown', key)
      document.body.style.overflow = previous
    }
  }, [full])
  async function save() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await onSave(serialized)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  function edit(id: string, patch: Partial<PreparationSection>) {
    setDraft((d) => ({
      ...d,
      sections: d.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }))
  }
  function format(prefix: string, suffix = '') {
    const el = active.current
    if (!el || !container.current?.contains(el)) return
    const start = el.selectionStart,
      end = el.selectionEnd
    const text = el.value.slice(start, end)
    edit(el.dataset.section!, {
      content:
        el.value.slice(0, start) + prefix + text + suffix + el.value.slice(end),
    })
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(
        start + prefix.length,
        start + prefix.length + text.length,
      )
    })
  }
  return (
    <section
      ref={container}
      role={full ? 'dialog' : undefined}
      aria-modal={full || undefined}
      aria-label={job ? '岗位专属面试准备' : '通用面试准备'}
      className={'card notes preparation ' + (full ? 'full' : '')}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault()
          void save()
        }
      }}
    >
      <header className="card-head">
        <h2>
          <span className="section-icon">
            <NotebookPen />
          </span>
          {job ? '岗位专属面试准备' : '通用面试准备'}
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
            <Save />
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
            aria-label="插入标题"
            disabled={busy || preview}
            onClick={() => format('\n## ')}
          >
            <Heading2 />
          </button>
          <button
            aria-label="加粗"
            disabled={busy || preview}
            onClick={() => format('**', '**')}
          >
            <Bold />
          </button>
          <button
            aria-label="插入列表"
            disabled={busy || preview}
            onClick={() => format('\n- ')}
          >
            <List />
          </button>
        </div>
        <button
          className="text-btn"
          disabled={busy}
          onClick={() => {
            setDraft((d) => ({
              ...d,
              sections: [
                ...d.sections,
                { id: uid(), title: '新区域', content: '' },
              ],
            }))
            setPreview(false)
          }}
        >
          <Plus />
          添加区域
        </button>
      </div>
      <div className="preparation-body">
        {draft.sections.map((s) => (
          <section
            className="preparation-block"
            key={s.id}
            aria-label={s.title || '未命名区域'}
          >
            <div className="preparation-row">
              {s.id === 'intro' ? (
                <h3>自我介绍</h3>
              ) : (
                <label className="section-title-label">
                  区域标题
                  <input
                    disabled={busy}
                    value={s.title}
                    onChange={(e) => edit(s.id, { title: e.target.value })}
                  />
                </label>
              )}
              {s.id !== 'intro' && (
                <button
                  className="icon-btn"
                  disabled={busy}
                  aria-label={'删除区域 ' + s.title}
                  onClick={() => {
                    if (confirm('删除这个区域及其中的内容？'))
                      setDraft((d) => ({
                        ...d,
                        sections: d.sections.filter((x) => x.id !== s.id),
                      }))
                  }}
                >
                  <Trash2 />
                </button>
              )}
            </div>
            {preview ? (
              <Preview value={s.content || '尚未填写'} />
            ) : (
              <textarea
                className="preparation-text"
                data-section={s.id}
                onFocus={(e) => {
                  active.current = e.currentTarget
                }}
                disabled={busy}
                aria-label={
                  s.id === 'intro'
                    ? '自我介绍正文'
                    : (s.title || '区域') + '正文'
                }
                value={s.content}
                onChange={(e) => edit(s.id, { content: e.target.value })}
                placeholder={
                  s.id === 'intro'
                    ? '可以从求职方向、相关技能和一段真实项目经历开始，简洁介绍自己的职责与成果…'
                    : '填写项目背景、个人职责、关键行动与结果，或整理技术问题、业务问题和向面试官的提问…'
                }
              />
            )}
          </section>
        ))}
        <Review
          groups={draft.reviews}
          disabled={busy || preview}
          onChange={(reviews) => setDraft((d) => ({ ...d, reviews }))}
        />
      </div>
      <footer className="note-status">
        <span role="status">
          <Check size={13} />
          {busy ? '正在保存' : dirty ? '有未保存的修改' : '已保存到本机'}
        </span>
        <span>
          {draft.sections.reduce((n, s) => n + s.content.length, 0) +
            draft.reviews.reduce(
              (n, g) =>
                n + g.questions.reduce((m, q) => m + q.answer.length, 0),
              0,
            )}{' '}
          字
        </span>
      </footer>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  )
}
