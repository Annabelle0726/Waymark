import DocumentReading from './DocumentReading'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Heading2,
  Bold,
  List,
  Expand,
  Plus,
  Eye,
  PencilLine,
  ArrowLeft,
} from 'lucide-react'
import { uid, type Job } from '../../domain/workspace'
import {
  readPreparation,
  writePreparation,
  type Preparation,
  type PreparationSection,
} from '../../domain/preparation'
import Preview from './Preview'
import Review from './Review'
import {
  DocumentMenu,
  GrowingText,
  InlineTitle,
  DOCUMENT_SAVE_DELAY,
  DOCUMENT_UNDO_DURATION,
  LONG_CONTENT_THRESHOLD,
  SAVE_RECENCY_DURATION,
  revealCaret,
} from './DocumentControls'

export default function Notes({
  job,
  value,
  onSave,
  onDirty,
}: {
  job?: Job
  value: string
  onSave: (v: string) => Promise<void>
  onDirty: (v: boolean) => void
}) {
  const [draft, setDraft] = useState(() => readPreparation(value))
  const [saved, setSaved] = useState(() => readPreparation(value))
  const [editing, setEditing] = useState<string | null>(null),
    [expanded, setExpanded] = useState<string | null>(null)
  const [focus, setFocus] = useState<string | null>(null),
    [preview, setPreview] = useState(false),
    [menu, setMenu] = useState('')
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [savedAt, setSavedAt] = useState<Date | null>(null)
  const [recent, setRecent] = useState(false)
  useEffect(() => {
    if (!savedAt) return
    setRecent(true)
    const timer = setTimeout(() => setRecent(false), SAVE_RECENCY_DURATION)
    return () => clearTimeout(timer)
  }, [savedAt])
  const [undo, setUndo] = useState<{
    restore: () => void
    label: string
  } | null>(null)
  const [keyboard, setKeyboard] = useState({ bottom: 0, visible: false })
  const root = useRef<HTMLElement>(null),
    active = useRef<HTMLTextAreaElement | null>(null),
    saveRef = useRef(onSave)
  const lastQuestion = useRef<string | undefined>(undefined)
  const locked = useRef(false),
    lastAttempt = useRef(''),
    draftRef = useRef(draft),
    savedRef = useRef(saved)
  const focusReturn = useRef<HTMLElement | null>(null),
    scroll = useRef(0)
  draftRef.current = draft
  savedRef.current = saved
  saveRef.current = onSave
  useEffect(() => {
    setSaved(readPreparation(value))
  }, [value])
  // Background saves commit document sections and group structure. Each question
  // retains its last committed value until its own Save button is pressed.
  function documentSnapshot(
    source: Preparation,
    baseline: Preparation,
  ): Preparation {
    const questions = new Map(
      baseline.reviews.flatMap((g) =>
        g.questions.map((q) => [q.id, q] as const),
      ),
    )
    return {
      ...source,
      reviews: source.reviews.map((g) => ({
        ...g,
        questions: g.questions.flatMap((q) =>
          questions.has(q.id) ? [questions.get(q.id)!] : [],
        ),
      })),
    }
  }
  const autoValue = writePreparation(documentSnapshot(draft, saved))
  const dirty = writePreparation(draft) !== writePreparation(saved)
  const savedQuestions = useMemo(
    () =>
      new Map(
        saved.reviews.flatMap((g) =>
          g.questions.map((q) => [q.id, JSON.stringify(q)]),
        ),
      ),
    [saved],
  )
  useEffect(() => {
    onDirty(dirty || busy)
    return () => onDirty(false)
  }, [dirty, busy, onDirty])
  async function commit(questionId?: string) {
    if (locked.current) return
    let snapshot = documentSnapshot(draftRef.current, savedRef.current)
    if (questionId) {
      snapshot = {
        ...snapshot,
        reviews: snapshot.reviews.map((g) => ({
          ...g,
          questions: draftRef.current.reviews
            .find((x) => x.id === g.id)!
            .questions.flatMap((q) =>
              q.id === questionId
                ? [q]
                : g.questions.filter((x) => x.id === q.id),
            ),
        })),
      }
    }
    const encoded = writePreparation(snapshot)
    if (encoded === writePreparation(savedRef.current)) return
    lastQuestion.current = questionId
    locked.current = true
    lastAttempt.current = encoded
    setBusy(true)
    setError('')
    try {
      await saveRef.current(encoded)
      savedRef.current = snapshot
      setSaved(snapshot)
      setSavedAt(new Date())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      locked.current = false
      setBusy(false)
    }
  }
  useEffect(() => {
    if (
      busy ||
      autoValue === writePreparation(saved) ||
      autoValue === lastAttempt.current
    )
      return
    const timer = setTimeout(() => {
      void commit()
    }, DOCUMENT_SAVE_DELAY)
    return () => clearTimeout(timer)
  }, [autoValue, busy, saved])
  useEffect(() => {
    if (!undo) return
    const t = setTimeout(() => setUndo(null), DOCUMENT_UNDO_DURATION)
    return () => clearTimeout(t)
  }, [undo])
  useEffect(() => {
    if (!focus) return
    focusReturn.current = document.activeElement as HTMLElement
    scroll.current = window.scrollY
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // The focus panel lives inside the app, so hide the other app surfaces from
    // keyboard and assistive navigation while leaving its own ancestors active.
    const outside = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.sidebar,.topbar,.page-heading,.page-intro,.workspace-foot',
      ),
    )
    outside.forEach((el) => (el.inert = true))
    function key(e: KeyboardEvent) {
      if (document.querySelector('dialog[open]')) return
      if (e.key === 'Escape') {
        e.preventDefault()
        setFocus(null)
      }
      if (e.key === 'Tab') {
        const nodes = Array.from(
          root.current?.querySelectorAll<HTMLElement>(
            'button,input,textarea',
          ) || [],
        ).filter(
          (el) => el.getClientRects().length && !el.hasAttribute('disabled'),
        )
        if (e.shiftKey && document.activeElement === nodes[0]) {
          e.preventDefault()
          nodes.at(-1)?.focus()
        }
        if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
          e.preventDefault()
          nodes[0]?.focus()
        }
      }
    }
    window.addEventListener('keydown', key)
    requestAnimationFrame(() => {
      root.current
        ?.querySelector<HTMLTextAreaElement>('.document-focus-body textarea')
        ?.focus()
    })
    return () => {
      document.body.style.overflow = previous
      outside.forEach((el) => (el.inert = false))
      window.removeEventListener('keydown', key)
      window.scrollTo(0, scroll.current)
      focusReturn.current?.focus({ preventScroll: true })
    }
  }, [focus])
  useEffect(() => {
    const viewport = window.visualViewport
    const update = (event?: Event) => {
      const el = document.activeElement
      const visible = Boolean(
        el instanceof HTMLTextAreaElement && root.current?.contains(el),
      )
      setKeyboard({
        bottom: Math.max(
          0,
          window.innerHeight -
            (viewport?.height || window.innerHeight) -
            (viewport?.offsetTop || 0),
        ),
        visible,
      })
      if (visible && event?.type !== 'scroll' && event?.type !== 'focusout')
        requestAnimationFrame(() => {
          if (el instanceof HTMLTextAreaElement) {
            revealCaret(el, viewport, root.current)
          }
        })
    }
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    document.addEventListener('input', update)
    document.addEventListener('focusin', update)
    document.addEventListener('focusout', update)
    return () => {
      viewport?.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', update)
      document.removeEventListener('input', update)
      document.removeEventListener('focusin', update)
      document.removeEventListener('focusout', update)
    }
  }, [])
  function edit(id: string, patch: Partial<PreparationSection>) {
    setDraft((d) => ({
      ...d,
      sections: d.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }))
  }
  function insert(index: number) {
    const s = { id: uid(), title: '', content: '' }
    setDraft((d) => ({
      ...d,
      sections: [...d.sections.slice(0, index), s, ...d.sections.slice(index)],
    }))
    setEditing(s.id)
    setPreview(false)
    requestAnimationFrame(() =>
      root.current
        ?.querySelector<HTMLInputElement>('[data-id="' + s.id + '"] input')
        ?.focus(),
    )
  }
  function remove(
    label: string,
    size: number,
    run: () => void,
    restore: () => void,
  ) {
    if (size > LONG_CONTENT_THRESHOLD && !confirm('这项内容较长，确认删除？'))
      return
    run()
    setUndo({ label: '已删除' + label, restore })
  }
  function move(id: string, offset: number) {
    setDraft((d) => {
      const sections = [...d.sections],
        i = sections.findIndex((s) => s.id === id),
        to = i + offset
      if (to < 0 || to >= sections.length) return d
      ;[sections[i], sections[to]] = [sections[to], sections[i]]
      return { ...d, sections }
    })
  }
  function format(prefix: string, suffix = '') {
    const el = active.current
    if (!el || !root.current?.contains(el)) return
    const a = el.selectionStart,
      b = el.selectionEnd
    const content =
      el.value.slice(0, a) +
      prefix +
      el.value.slice(a, b) +
      suffix +
      el.value.slice(b)
    const section = el.dataset.section
    if (section) edit(section, { content })
    else
      setDraft((d) => ({
        ...d,
        reviews: d.reviews.map((g) => ({
          ...g,
          questions: g.questions.map((q) =>
            q.id === el.dataset.question ? { ...q, answer: content } : q,
          ),
        })),
      }))
    requestAnimationFrame(() => {
      el.focus({ preventScroll: true })
      el.setSelectionRange(a + prefix.length, b + prefix.length)
    })
  }
  const focusedSection = draft.sections.find((s) => s.id === focus)
  const focusedQuestion = draft.reviews
    .flatMap((g) => g.questions)
    .find((q) => q.id === focus)
  const current = focus || editing || draft.sections[0]?.id
  const chars =
    draft.sections.reduce((n, s) => n + s.content.length, 0) +
    draft.reviews.reduce(
      (n, g) => n + g.questions.reduce((m, q) => m + q.answer.length, 0),
      0,
    )
  const status = busy
    ? '保存中…'
    : error
      ? '保存失败'
      : dirty
        ? '有未保存的修改'
        : savedAt
          ? recent
            ? '已保存 · 刚刚'
            : '已保存 · ' +
              savedAt.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
              })
          : '已保存'
  const formatButtons = (
    <>
      <button
        aria-label="插入标题"
        disabled={preview}
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => format('\n## ')}
      >
        <Heading2 />
      </button>
      <button
        aria-label="加粗"
        disabled={preview}
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => format('**', '**')}
      >
        <Bold />
      </button>
      <button
        aria-label="插入列表"
        disabled={preview}
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => format('\n- ')}
      >
        <List />
      </button>
    </>
  )
  function textarea(s: PreparationSection) {
    return (
      <GrowingText
        data-section={s.id}
        aria-label={(s.title || '未命名区域') + '正文'}
        value={s.content}
        onFocus={(e) => {
          active.current = e.target
        }}
        onChange={(e) => edit(s.id, { content: e.target.value })}
        placeholder={
          s.id === 'intro'
            ? '简洁介绍求职方向、相关技能，以及一段真实的项目经历…'
            : '记录项目背景、个人职责、行动与结果，或整理想要练习的问题…'
        }
      />
    )
  }
  return (
    <section
      ref={root}
      className={'document-editor' + (focus ? ' document-focused' : '')}
      onFocus={(e) => {
        if (e.target instanceof HTMLTextAreaElement) active.current = e.target
      }}
      role={focus ? 'dialog' : undefined}
      aria-modal={Boolean(focus) || undefined}
      aria-label={job ? '岗位专属面试准备' : '面试准备文档'}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault()
          void commit(focusedQuestion?.id || active.current?.dataset.question)
        }
      }}
    >
      {job && !focus && <h3 className="document-job-title">岗位专属面试准备</h3>}
      <div className="document-toolbar">
        {focus && (
          <button className="document-done" onClick={() => setFocus(null)}>
            <ArrowLeft />
            <span>完成</span>
          </button>
        )}
        <div className="document-modes">
          <button
            aria-pressed={!preview}
            aria-label="编辑"
            onClick={() => setPreview(false)}
          >
            <PencilLine />
            <span>编辑</span>
          </button>
          <button
            aria-pressed={preview}
            aria-label="预览"
            onClick={() => setPreview(!preview)}
          >
            <Eye />
            <span>预览</span>
          </button>
        </div>
        <div className="document-desktop-format">{formatButtons}</div>
        <span className="document-save-status" role="status">
          {status}
        </span>
        <span className="document-word-count">{chars} 字</span>
        {!focus && (
          <button
            className="document-expand"
            aria-label="放大编辑当前区块"
            onClick={() => {
              if (current) {
                setEditing(current)
                setFocus(current)
              }
            }}
          >
            <Expand />
          </button>
        )}
        <button
          className={'document-save ' + (dirty ? 'primary' : '')}
          disabled={
            busy ||
            (!error &&
              (focusedQuestion
                ? savedQuestions.get(focusedQuestion.id) ===
                  JSON.stringify(focusedQuestion)
                : autoValue === writePreparation(saved)))
          }
          onClick={() =>
            void commit(
              focusedQuestion?.id || (error ? lastQuestion.current : undefined),
            )
          }
        >
          保存
        </button>
        <div className="document-mobile-menu">
          <DocumentMenu
            label="文档操作"
            open={menu === 'document'}
            onOpen={() => setMenu('document')}
            onClose={() => setMenu('')}
            actions={[
              {
                label: '保存文档',
                run: () =>
                  void commit(
                    focusedQuestion?.id ||
                      (error ? lastQuestion.current : undefined),
                  ),
              },
              {
                label: focus ? '完成编辑' : '放大编辑当前区块',
                run: () => {
                  if (focus) setFocus(null)
                  else if (current) {
                    setEditing(current)
                    setFocus(current)
                  }
                },
              },
            ]}
          />
        </div>
      </div>
      {error && (
        <div className="document-error" role="alert">
          {error}
          <button
            onClick={() =>
              void commit(
                focusedQuestion?.id ||
                  (error ? lastQuestion.current : undefined),
              )
            }
          >
            重试保存
          </button>
        </div>
      )}
      {focus ? (
        <div className="document-focus-body">
          {focusedSection && (
            <>
              <InlineTitle
                label="区域标题"
                value={focusedSection.title}
                onChange={(title) => edit(focusedSection.id, { title })}
              />
              {preview ? (
                <Preview value={focusedSection.content} />
              ) : (
                textarea(focusedSection)
              )}
            </>
          )}
          {focusedQuestion && (
            <>
              <InlineTitle
                label="复习问题标题"
                value={focusedQuestion.title}
                onChange={(title) =>
                  setDraft((d) => ({
                    ...d,
                    reviews: d.reviews.map((g) => ({
                      ...g,
                      questions: g.questions.map((q) =>
                        q.id === focus ? { ...q, title } : q,
                      ),
                    })),
                  }))
                }
              />
              {preview ? (
                <Preview value={focusedQuestion.answer} />
              ) : (
                <GrowingText
                  data-question={focusedQuestion.id}
                  aria-label="复习答案"
                  value={focusedQuestion.answer}
                  onFocus={(e) => {
                    active.current = e.target
                  }}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      reviews: d.reviews.map((g) => ({
                        ...g,
                        questions: g.questions.map((q) =>
                          q.id === focus ? { ...q, answer: e.target.value } : q,
                        ),
                      })),
                    }))
                  }
                />
              )}
              <div className="document-question-actions">
                <button
                  className="primary"
                  disabled={
                    busy ||
                    savedQuestions.get(focusedQuestion.id) ===
                      JSON.stringify(focusedQuestion)
                  }
                  onClick={() => void commit(focusedQuestion.id)}
                >
                  保存问题
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
      {
        <div className="document-body" hidden={Boolean(focus)}>
          {draft.sections.map((s, index) => (
            <div key={s.id}>
              {index > 0 && !preview && (
                <div className="document-insert">
                  <button
                    aria-label={'在' + (s.title || '区域') + '前添加区域'}
                    onClick={() => insert(index)}
                  >
                    <Plus />
                  </button>
                </div>
              )}
              <section
                data-id={s.id}
                className="document-block"
                aria-label={s.title || '未命名区域'}
              >
                <div className="document-block-heading">
                  {preview ? (
                    <h3>{s.title || '未命名区域'}</h3>
                  ) : (
                    <InlineTitle
                      label="区域标题"
                      value={s.title}
                      onChange={(title) => edit(s.id, { title })}
                    />
                  )}
                  {!preview && (
                    <DocumentMenu
                      label={'区域操作 ' + (s.title || '未命名')}
                      open={menu === s.id}
                      onOpen={() => setMenu(s.id)}
                      onClose={() => setMenu('')}
                      actions={[
                        {
                          label: '重命名',
                          run: () =>
                            root.current
                              ?.querySelector<HTMLInputElement>(
                                '[data-id="' + s.id + '"] input',
                              )
                              ?.focus(),
                        },
                        {
                          label: '放大编辑',
                          run: () => {
                            setEditing(s.id)
                            setFocus(s.id)
                          },
                        },
                        {
                          label: '上移',
                          disabled: index === 0,
                          run: () => move(s.id, -1),
                        },
                        {
                          label: '下移',
                          disabled: index === draft.sections.length - 1,
                          run: () => move(s.id, 1),
                        },
                        {
                          label: '删除区域',
                          run: () =>
                            remove(
                              '区域',
                              s.content.length,
                              () =>
                                setDraft((d) => ({
                                  ...d,
                                  sections: d.sections.filter(
                                    (x) => x.id !== s.id,
                                  ),
                                })),
                              () =>
                                setDraft((d) => ({
                                  ...d,
                                  sections: [
                                    ...d.sections.slice(0, index),
                                    s,
                                    ...d.sections.slice(index),
                                  ],
                                })),
                            ),
                        },
                      ]}
                    />
                  )}
                </div>
                {!preview && editing === s.id ? (
                  textarea(s)
                ) : (
                  <DocumentReading
                    value={s.content}
                    placeholder={
                      s.id === 'intro'
                        ? '简洁介绍求职方向、相关技能，以及一段真实的项目经历…'
                        : '点击开始记录项目经历、知识点或面试问题…'
                    }
                    preview={preview}
                    expanded={expanded === s.id}
                    onToggle={() =>
                      setExpanded(expanded === s.id ? null : s.id)
                    }
                    onEdit={() => {
                      setExpanded(null)
                      setEditing(s.id)
                      requestAnimationFrame(() =>
                        root.current
                          ?.querySelector<HTMLTextAreaElement>(
                            '[data-id="' + s.id + '"] textarea',
                          )
                          ?.focus(),
                      )
                    }}
                  />
                )}
              </section>
            </div>
          ))}
          <Review
            groups={draft.reviews}
            preview={preview}
            saving={busy}
            savedQuestions={savedQuestions}
            onSaveQuestion={(id) => void commit(id)}
            onFocusQuestion={setFocus}
            onChange={(reviews) => setDraft((d) => ({ ...d, reviews }))}
            onDelete={remove}
          />
          {!preview && (
            <button
              className="document-add-section text-btn"
              onClick={() => insert(draft.sections.length)}
            >
              <Plus />
              添加区域
            </button>
          )}
        </div>
      }
      {undo && (
        <div className="document-undo" role="status">
          {undo.label}
          <button
            onClick={() => {
              undo.restore()
              setUndo(null)
            }}
          >
            撤销
          </button>
        </div>
      )}
      {keyboard.visible && !preview && (
        <div
          className="document-keyboard-tools"
          style={{ bottom: keyboard.bottom }}
        >
          {formatButtons}
        </div>
      )}
    </section>
  )
}
