import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import {
  Award,
  BriefcaseBusiness,
  Download,
  FileText,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import { stamp, type Material, type Upload } from '../../domain/workspace'
import { Dialog } from '../../components/forms/Forms'
import { MaterialForm } from './MaterialForm'

type Props = {
  materials: Material[]
  onPreview: (material: Material) => void
  onDownload: (material: Material) => void
  onSave: (material: Material, upload?: Upload) => Promise<void>
  onDelete: (material: Material) => Promise<void>
  onDirty: (dirty: boolean) => void
}
type Menu = { material: Material; right: number; edge: number; above: boolean }

function SummaryEditor({
  material,
  onSave,
  onCancel,
  onDirty,
}: {
  material: Material
  onSave: (summary: string) => Promise<void>
  onCancel: () => void
  onDirty: Props['onDirty']
}) {
  const [summary, setSummary] = useState(material.summary)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    onDirty(summary !== material.summary)
    return () => onDirty(false)
  }, [summary, material.summary, onDirty])
  return (
    <form
      className="material-summary-editor"
      onSubmit={async (e) => {
        e.preventDefault()
        if (busy) return
        setBusy(true)
        setError('')
        try {
          await onSave(summary)
          onCancel()
        } catch (e) {
          setError((e as Error).message)
        } finally {
          setBusy(false)
        }
      }}
    >
      <label>
        资料摘要
        <textarea
          aria-label="资料摘要"
          autoFocus
          rows={3}
          value={summary}
          disabled={busy}
          onChange={(e) => setSummary(e.target.value)}
        />
      </label>
      {error && (
        <p className="danger-text" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <button
          className="outline"
          type="button"
          disabled={busy}
          onClick={() => {
            if (
              summary === material.summary ||
              confirm('放弃尚未保存的摘要修改？')
            )
              onCancel()
          }}
        >
          取消
        </button>
        <button className="primary" disabled={busy}>
          {busy ? '保存中…' : '保存摘要'}
        </button>
      </div>
    </form>
  )
}

function ActionMenu({
  menu,
  onClose,
  onPreview,
  onDownload,
  onEdit,
  onSummary,
  onDelete,
}: {
  menu: Menu
  onClose: () => void
  onPreview: () => void
  onDownload: () => void
  onEdit: () => void
  onSummary: () => void
  onDelete: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = ref.current!
    element.showModal()
    return () => element.close()
  }, [])
  const position = {
    '--menu-right': menu.right + 'px',
    '--menu-edge': menu.edge + 'px',
  } as CSSProperties
  return (
    <dialog
      ref={ref}
      aria-label={'文件操作 ' + menu.material.name}
      className={'material-menu ' + (menu.above ? 'above' : '')}
      style={position}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const bounds = e.currentTarget.getBoundingClientRect()
          if (
            e.clientX < bounds.left ||
            e.clientX > bounds.right ||
            e.clientY < bounds.top ||
            e.clientY > bounds.bottom
          )
            onClose()
        }
      }}
    >
      <header>
        <span title={menu.material.name}>{menu.material.name}</span>
        <button
          className="icon-btn"
          aria-label="关闭文件操作"
          onClick={onClose}
        >
          <X />
        </button>
      </header>
      <button className="mobile-preview-action" onClick={onPreview}>
        <FileText />
        预览
      </button>
      <button onClick={onDownload}>
        <Download />
        下载
      </button>
      <button className="material-rename-action" onClick={onEdit}>
        <Pencil />
        重命名
      </button>
      <button onClick={onSummary}>
        <FileText />
        编辑摘要
      </button>
      <button className="danger-text material-delete-action" onClick={onDelete}>
        <Trash2 />
        删除
      </button>
    </dialog>
  )
}

export default function MaterialsPage({
  materials,
  onPreview,
  onDownload,
  onSave,
  onDelete,
  onDirty,
}: Props) {
  const [query, setQuery] = useState('')
  const [menu, setMenu] = useState<Menu>()
  const [editing, setEditing] = useState<Material>()
  const [uploading, setUploading] = useState(false)
  const [queue, setQueue] = useState<File[]>([])
  const [expanded, setExpanded] = useState('')
  const [summaryMaterial, setSummaryMaterial] = useState<Material>()
  const [deleting, setDeleting] = useState<Material>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [uploadRound, setUploadRound] = useState(0)
  const dragDepth = useRef(0)
  const summaryDirty = useRef(false)
  const reportDirty = useCallback(
    (dirty: boolean) => {
      summaryDirty.current = dirty
      onDirty(dirty)
    },
    [onDirty],
  )
  function canCloseSummary() {
    return !summaryDirty.current || confirm('放弃尚未保存的摘要修改？')
  }
  const groups = [...new Set(materials.map((m) => m.category || '其他'))]
  const visible = materials.filter((m) =>
    (m.name + ' ' + m.category + ' ' + m.summary)
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  )
  const showSearch = materials.length > 8 || Boolean(query)
  function closeMenu(action: () => void) {
    setMenu(undefined)
    action()
  }
  function editSummary(material: Material) {
    if (!canCloseSummary()) return
    if (window.matchMedia('(max-width: 640px)').matches)
      setSummaryMaterial(material)
    else setExpanded(material.id)
  }
  return (
    <section
      className={'materials-page ' + (dragging ? 'is-dragging' : '')}
      aria-label="资料库"
      onDragEnter={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault()
          dragDepth.current++
          setDragging(true)
        }
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'copy'
        }
      }}
      onDragLeave={() => {
        dragDepth.current--
        if (dragDepth.current <= 0) {
          dragDepth.current = 0
          setDragging(false)
        }
      }}
      onDrop={(e) => {
        e.preventDefault()
        dragDepth.current = 0
        setDragging(false)
        if (e.dataTransfer.files.length && !uploading && !editing) {
          setQueue(Array.from(e.dataTransfer.files))
          setUploading(true)
        }
      }}
    >
      <div className="materials-toolbar">
        <h2>资料库 · {materials.length}</h2>
        {materials.length > 0 && (
          <button className="primary" onClick={() => setUploading(true)}>
            <UploadCloud />
            上传资料
          </button>
        )}
      </div>
      {showSearch && (
        <label className="materials-search">
          <Search />
          <input
            aria-label="搜索资料"
            type="search"
            value={query}
            onChange={(e) => {
              if (!canCloseSummary()) return
              setExpanded('')
              setQuery(e.target.value)
            }}
            placeholder="搜索文件名、类型或摘要"
          />
        </label>
      )}
      {!materials.length ? (
        <div className="materials-empty">
          <UploadCloud />
          <p>上传简历、作品集或证书，也可拖拽文件到这里。</p>
          <button className="primary" onClick={() => setUploading(true)}>
            <UploadCloud />
            上传资料
          </button>
        </div>
      ) : (
        <div className="materials-container">
          <div className="materials-table-head" aria-hidden="true">
            <span>文件</span>
            <span>类型</span>
            <span>更新时间</span>
            <span>摘要</span>
            <span />
          </div>
          {groups.map((category) => {
            const items = visible.filter(
              (m) => (m.category || '其他') === category,
            )
            if (!items.length) return null
            return (
              <section
                className="material-group"
                key={category}
                aria-label={category}
              >
                {groups.length > 1 && <h3>{category}</h3>}
                {items.map((m, index) => {
                  const Icon =
                    m.category === '证书' || m.category === '奖状'
                      ? Award
                      : m.category === '作品集'
                        ? BriefcaseBusiness
                        : FileText
                  return (
                    <article
                      key={m.id}
                      className={
                        'material-item ' +
                        (index % 2 === 0 ? 'row-odd' : 'row-even')
                      }
                    >
                      <div
                        className="material-row"
                        onClick={(e) => {
                          if (!(e.target as HTMLElement).closest('button'))
                            onPreview(m)
                        }}
                      >
                        <button
                          className="material-open"
                          aria-label={'预览 ' + m.name}
                          onClick={() => onPreview(m)}
                        >
                          <span className="section-icon">
                            <Icon />
                          </span>
                          <span className="material-info">
                            <strong title={m.name}>{m.name}</strong>
                            <small className="material-mobile-meta">
                              {m.category || '其他'} · {stamp(m.date)}
                            </small>
                          </span>
                        </button>
                        <span className="material-type">
                          {m.category || '其他'}
                        </span>
                        <time className="material-date" dateTime={m.date}>
                          {stamp(m.date)}
                        </time>
                        <button
                          className="material-summary-toggle"
                          title={m.summary || '添加摘要'}
                          aria-expanded={expanded === m.id}
                          onClick={() => {
                            if (!canCloseSummary()) return
                            setExpanded(expanded === m.id ? '' : m.id)
                          }}
                        >
                          {m.summary || '添加摘要'}
                        </button>
                        <div className="material-actions">
                          <button
                            className="icon-btn material-download"
                            aria-label={'下载 ' + m.name}
                            onClick={() => onDownload(m)}
                          >
                            <Download />
                          </button>
                          <button
                            className="icon-btn"
                            aria-label={'更多 ' + m.name}
                            aria-haspopup="dialog"
                            onClick={(e) => {
                              const rect =
                                e.currentTarget.getBoundingClientRect()
                              const above = rect.bottom > window.innerHeight / 2
                              setMenu({
                                material: m,
                                right: window.innerWidth - rect.right,
                                edge: above
                                  ? window.innerHeight - rect.top
                                  : rect.bottom,
                                above,
                              })
                            }}
                          >
                            <MoreHorizontal />
                          </button>
                        </div>
                      </div>
                      {expanded === m.id && (
                        <SummaryEditor
                          key={m.id}
                          material={m}
                          onDirty={reportDirty}
                          onCancel={() => setExpanded('')}
                          onSave={(summary) => onSave({ ...m, summary })}
                        />
                      )}
                    </article>
                  )
                })}
              </section>
            )
          })}
          {!visible.length && (
            <p className="materials-no-results" role="status">
              没有匹配的资料
            </p>
          )}
        </div>
      )}
      {dragging && (
        <div className="materials-drop-hint" role="status">
          <UploadCloud />
          松开以上传资料
        </div>
      )}
      {menu && (
        <ActionMenu
          menu={menu}
          onClose={() => setMenu(undefined)}
          onPreview={() => closeMenu(() => onPreview(menu.material))}
          onDownload={() => closeMenu(() => onDownload(menu.material))}
          onEdit={() => {
            if (canCloseSummary())
              closeMenu(() => {
                setExpanded('')
                setEditing(menu.material)
              })
          }}
          onSummary={() => closeMenu(() => editSummary(menu.material))}
          onDelete={() =>
            closeMenu(() => {
              setError('')
              setDeleting(menu.material)
            })
          }
        />
      )}
      {summaryMaterial && (
        <Dialog
          title={'编辑摘要 · ' + summaryMaterial.name}
          onClose={() => setSummaryMaterial(undefined)}
        >
          <button className="outline material-summary-rename" onClick={() => {
            if (!canCloseSummary()) return
            setEditing(summaryMaterial)
            setSummaryMaterial(undefined)
          }}><Pencil/>重命名文件</button>
          <SummaryEditor
            material={summaryMaterial}
            onDirty={reportDirty}
            onCancel={() => setSummaryMaterial(undefined)}
            onSave={(summary) => onSave({ ...summaryMaterial, summary })}
          />
        </Dialog>
      )}
      {(uploading || editing) && (
        <Dialog
          title={editing ? '编辑资料' : '上传资料'}
          onClose={() => {
            setUploading(false)
            setEditing(undefined)
            setQueue([])
          }}
        >
          {queue.length > 1 && (
            <p className="materials-upload-count">
              还有 {queue.length} 份文件待确认
            </p>
          )}
          <MaterialForm
            key={editing?.id || uploadRound}
            item={editing}
            initialFile={queue[0]}
            onSave={async (m, upload) => {
              await onSave(m, upload)
              if (queue.length > 1) {
                setQueue((files) => files.slice(1))
                setUploadRound((n) => n + 1)
              } else {
                setUploading(false)
                setEditing(undefined)
                setQueue([])
              }
            }}
          />
        </Dialog>
      )}
      {deleting && (
        <Dialog
          title="删除资料"
          onClose={() => {
            if (!busy) setDeleting(undefined)
          }}
        >
          <form
            className="form-body material-delete-form"
            aria-busy={busy}
            onSubmit={async (e) => {
              e.preventDefault()
              if (busy) return
              setBusy(true)
              setError('')
              try {
                await onDelete(deleting)
                setDeleting(undefined)
              } catch (e) {
                setError((e as Error).message)
              } finally {
                setBusy(false)
              }
            }}
          >
            <p>
              确认删除「{deleting.name}
              」？文件及其资料信息将被永久删除，此操作不可恢复。
            </p>
            {error && (
              <p className="danger-text" role="alert">
                {error}
              </p>
            )}
            <div className="actions">
              <button
                type="button"
                className="outline"
                disabled={busy}
                onClick={() => setDeleting(undefined)}
              >
                取消
              </button>
              <button className="outline danger-text" disabled={busy}>
                {busy ? '删除中…' : '确认删除'}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </section>
  )
}
