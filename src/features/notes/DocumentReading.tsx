import { useLayoutEffect, useRef, useState } from 'react'
import Preview from './Preview'
import { READING_LINE_LIMIT } from './DocumentControls'
export default function DocumentReading({
  value,
  placeholder,
  preview,
  expanded,
  onToggle,
  onEdit,
}: {
  value: string
  placeholder: string
  preview: boolean
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [long, setLong] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () =>
      setLong(
        el.scrollHeight >
          parseFloat(getComputedStyle(el).lineHeight) * READING_LINE_LIMIT,
      )
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [value, expanded])
  return (
    <>
      <div
        ref={ref}
        role={preview ? undefined : 'button'}
        tabIndex={preview ? undefined : 0}
        className={
          'document-reading ' +
          (expanded ? '' : 'document-clamped') +
          ' ' +
          (!value ? 'document-placeholder' : '')
        }
        onClick={() => {
          if (!preview) onEdit()
        }}
        onKeyDown={(e) => {
          if (!preview && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            onEdit()
          }
        }}
      >
        <Preview value={value || placeholder} />
      </div>
      {(long || expanded) && (
        <button className="text-btn document-read-more" onClick={onToggle}>
          {expanded ? '收起' : '展开'}
        </button>
      )}
    </>
  )
}
