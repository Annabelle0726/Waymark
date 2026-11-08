import {
  useEffect,
  useLayoutEffect,
  useRef,
  type TextareaHTMLAttributes,
} from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Dialog } from '../../components/forms/Forms'

export const DOCUMENT_SAVE_DELAY = 800
export const DOCUMENT_UNDO_DURATION = 5000
export const LONG_CONTENT_THRESHOLD = 1000
export const READING_LINE_LIMIT = 6
export const SAVE_RECENCY_DURATION = 60000
export function GrowingText({
  value,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (el && el.getClientRects().length) {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
  }, [value])
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let width = el.clientWidth
    const observer = new ResizeObserver(() => {
      if (el.clientWidth && el.clientWidth !== width) {
        width = el.clientWidth
        el.style.height = 'auto'
        el.style.height = el.scrollHeight + 'px'
      } else if (!el.clientWidth) width = 0
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return <textarea {...props} ref={ref} value={value} rows={value ? 3 : 2} />
}
export function InlineTitle({
  value,
  label,
  onChange,
  focus = false,
}: {
  value: string
  label: string
  onChange: (v: string) => void
  focus?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (focus) {
      ref.current?.focus()
      ref.current?.select()
    }
  }, [focus])
  return (
    <input
      ref={ref}
      className="document-title-input"
      aria-label={label}
      value={value}
      placeholder="输入名称"
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
export type MenuAction = { label: string; run: () => void; disabled?: boolean }
export function DocumentMenu({
  label,
  actions,
  open,
  onOpen,
  onClose,
}: {
  label: string
  actions: MenuAction[]
  open: boolean
  onOpen: () => void
  onClose: () => void
}) {
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open || matchMedia('(max-width: 640px)').matches) return
    const panel = document.querySelector<HTMLDialogElement>(
      '.document-action-menu[open]',
    )
    const bounds = trigger.current?.getBoundingClientRect()
    if (panel && bounds) {
      Object.assign(panel.style, {
        margin: '0',
        left:
          Math.max(
            0,
            Math.min(
              bounds.right - panel.offsetWidth,
              innerWidth - panel.offsetWidth,
            ),
          ) + 'px',
        top:
          Math.max(
            0,
            Math.min(bounds.bottom, innerHeight - panel.offsetHeight),
          ) + 'px',
      })
    }
  }, [open])
  return (
    <>
      <button
        ref={trigger}
        className="document-menu-toggle"
        aria-label={label}
        aria-haspopup="dialog"
        onClick={onOpen}
      >
        <MoreHorizontal />
      </button>
      {open && (
        <Dialog
          title={label}
          className="document-action-menu"
          confirmDiscard={false}
          onClose={onClose}
        >
          <div className="document-menu-items">
            {actions.map((a) => (
              <button
                key={a.label}
                disabled={a.disabled}
                onClick={() => {
                  onClose()
                  a.run()
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </Dialog>
      )}
    </>
  )
}

export function revealCaret(
  el: HTMLTextAreaElement,
  viewport: VisualViewport | null,
  root: HTMLElement | null,
) {
  if (!matchMedia('(max-width: 640px)').matches) return
  const style = getComputedStyle(el)
  const mirror = document.createElement('div')
  for (const key of [
    'font',
    'line-height',
    'letter-spacing',
    'padding',
    'border',
    'box-sizing',
    'word-break',
    'overflow-wrap',
  ]) {
    mirror.style.setProperty(key, style.getPropertyValue(key))
  }
  Object.assign(mirror.style, {
    position: 'fixed',
    top: '0',
    left: '-100vw',
    visibility: 'hidden',
    whiteSpace: 'pre-wrap',
    width: el.getBoundingClientRect().width + 'px',
  })
  mirror.textContent = el.value.slice(0, el.selectionStart)
  const marker = document.createElement('span')
  marker.textContent = '|'
  mirror.append(marker)
  document.body.append(mirror)
  const caret =
    el.getBoundingClientRect().top +
    marker.offsetTop +
    parseFloat(style.lineHeight)
  const controls =
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        '--control-height',
      ),
    ) * parseFloat(getComputedStyle(document.documentElement).fontSize)
  const bottom =
    (viewport?.height || innerHeight) + (viewport?.offsetTop || 0) - controls
  mirror.remove()
  if (caret > bottom) {
    const target = root?.classList.contains('document-focused') ? root : window
    target.scrollBy({ top: caret - bottom })
  }
}
