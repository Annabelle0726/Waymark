import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from 'react'
import { X, ArrowRight, AlertCircle } from 'lucide-react'

export function Dialog({
  title,
  children,
  onClose,
  wide = false,
  className = '',
  confirmDiscard = true,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
  className?: string
  confirmDiscard?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const dirty = useRef(false)
  useEffect(() => {
    const d = ref.current!
    d.showModal()
    return () => d.close()
  }, [])
  function close() {
    if (ref.current?.querySelector('[aria-busy="true"]')) return
    if (!confirmDiscard || !dirty.current || window.confirm('放弃尚未提交的表单内容？')) onClose()
  }
  return (
    <dialog
      ref={ref}
      className={['dialog', wide ? 'wide' : '', className].filter(Boolean).join(' ')}
      aria-label={title}
      onClick={e => { if ((e.target as HTMLElement).closest('[data-dirties]')) dirty.current = true }}
      onDrop={() => { dirty.current = true }}
      onPaste={(event) => { if (event.clipboardData.files.length) dirty.current = true }}
      onChange={() => {
        dirty.current = true
      }}
      onCancel={(e) => {
        e.preventDefault()
        e.stopPropagation()
        close()
      }}
    >
      <div className="dialog-head">
        <h2>{title}</h2>
        <button type="button" className="icon-btn" onClick={close} aria-label="关闭">
          <X size={19} />
        </button>
      </div>
      {children}
    </dialog>
  )
}
export function Form({
  children,
  submit,
  label,
  submitDisabled = false,
  className,
  onCancel,
}: {
  children: ReactNode
  submit: () => Promise<void>
  label: string
  submitDisabled?: boolean
  className?: string
  onCancel?: () => void
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  async function handle(e: FormEvent) {
    e.preventDefault()
    if (busy || submitDisabled) return
    setBusy(true)
    setError('')
    try {
      await submit()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={handle} aria-busy={busy} className={className}>
      <fieldset disabled={busy} className="form-body">
        {children}
        {error && (
          <p role="alert" className="error">
            <AlertCircle size={16} />
            {error}
          </p>
        )}
        <div className="form-foot">
          {onCancel && <button className="outline" type="button" onClick={onCancel}>取消</button>}
          <button className="primary" type="submit" disabled={submitDisabled || busy}>
            {busy ? '正在处理…' : label}
            <ArrowRight size={16} />
          </button>
        </div>
      </fieldset>
    </form>
  )
}
