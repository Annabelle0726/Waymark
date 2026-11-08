import StatusAssistant from '../features/assistant/StatusAssistant'
import { useEffect, useRef, useState } from 'react'
import {
  Plus,
  BriefcaseBusiness,
  BookOpen,
  FolderOpen,
  Settings2,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Search,
  Layers3,
  Triangle,
  Hexagon,
  Monitor,
  Clock3,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  FileText,
  UploadCloud,
  Download,
  Trash2,
  Compass,
  AlertCircle,
} from 'lucide-react'
import { api } from '../services/api'
import {
  fields,
  fieldKeys,
  now,
  stamp,
  type Job,
  type Material,
  type Workspace,
  type User,
  type Upload,
  type Save,
} from '../domain/workspace'
import { Dialog } from '../components/forms/Forms'
import Settings from '../features/settings/Settings'
import { JobForm, UpdateForm } from '../features/jobs/JobForms'
import MaterialsPage from '../features/materials/MaterialsPage'
import MaterialPreview from '../features/materials/MaterialPreview'
import { Auth } from '../features/auth/Auth'
import Notes from '../features/notes/Notes'
import JobDetail, { StatusPill } from '../features/jobs/JobDetail'
type Page = 'jobs' | 'general' | 'materials' | 'settings'
type Modal = '' | 'add' | 'edit' | 'update' | 'source' | 'history'
const pageNames: Record<Page, string> = {
  jobs: '我的岗位',
  general: '通用面试准备',
  materials: '我的资料',
  settings: '设置',
}
const empty: Workspace = { jobs: [], general: '', materials: [] }
const companyIcons = [Layers3, Hexagon, Triangle]
export default function App() {
  const [previewMaterial, setPreviewMaterial] = useState<Material>()
  const [state, setState] = useState<Workspace>(empty),
    [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [loadError, setLoadError] = useState('')
  const [page, setPage] = useState<Page>('jobs'),
    [selected, setSelected] = useState(''),
    [expanded, setExpanded] = useState(''),
    [jobsOpen, setJobsOpen] = useState(true)
  const [query, setQuery] = useState(''),
    [sidebarCollapsed, setSidebarCollapsed] = useState(false),
    [drawer, setDrawer] = useState(false),
    [modal, setModal] = useState<Modal>(''),
    [toast, setToast] = useState(''),
    [dirty, setDirty] = useState(false)
  const [instance, setInstance] = useState(0)
  const revision = useRef(0),
    lock = useRef(false)
  const job = state.jobs.find((j) => j.id === selected)
  function reset(data: Workspace, u: User | null, rev: number) {
    setPreviewMaterial(undefined)
    setState(data)
    setUser(u)
    revision.current = rev
    setPage('jobs')
    setSelected(data.jobs[0]?.id || '')
    setExpanded(data.jobs[0]?.id || '')
    setModal('')
    setDirty(false)
    setSidebarCollapsed(false)
    setDrawer(false)
    setQuery('')
    setJobsOpen(true)
    setInstance((n) => n + 1)
    setToast('')
  }
  async function loadWorkspace(u: User) {
    const data = await api<{ state: Workspace; revision: number }>('workspace')
    reset(data.state, u, data.revision)
  }
  async function boot() {
    setReady(false)
    setLoadError('')
    try {
      const s = await api<{ user: User | null }>('session')
      if (s.user) await loadWorkspace(s.user)
      else reset(empty, null, 0)
      setReady(true)
    } catch (e) {
      setLoadError((e as Error).message)
    }
  }
  useEffect(() => {
    void boot()
  }, [])
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 4200)
    return () => clearTimeout(timer)
  }, [toast])
  useEffect(() => {
    if (!dirty) return
    function warn(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  useEffect(() => {
    if (!drawer) return
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawer(false)
    }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [drawer])
  const leave = () =>
    !lock.current &&
    (!dirty || window.confirm('笔记有未保存修改。离开并放弃这些修改？'))
  function navigate(p: Page) {
    if (p !== page && !leave()) return
    setPage(p)
    setDrawer(false)
  }
  function pick(j: Job) {
    if ((j.id !== selected || page !== 'jobs') && !leave()) return
    setExpanded(
      selected === j.id && expanded === j.id && page === 'jobs' ? '' : j.id,
    )
    setSelected(j.id)
    setPage('jobs')
    setDrawer(false)
  }
  const save: Save = async (next, upload) => {
    if (lock.current) throw new Error('正在保存，请稍后再试')
    lock.current = true
    try {
      const r = await api<{ revision: number }>('workspace', 'PUT', {
        state: next,
        revision: revision.current,
        ...(Array.isArray(upload) ? { uploads: upload } : { upload }),
      })
      revision.current = r.revision
      setState(next)
    } finally {
      lock.current = false
    }
  }
  async function storeJob(j: Job, u?: Upload | Upload[]) {
    const exists = state.jobs.some((x) => x.id === j.id)
    await save(
      {
        ...state,
        jobs: exists
          ? state.jobs.map((x) => (x.id === j.id ? j : x))
          : [j, ...state.jobs],
      },
      u,
    )
    setSelected(j.id)
    setExpanded(j.id)
    setPage('jobs')
    setModal('')
    setDrawer(false)
    setQuery('')
    setJobsOpen(true)
  }
  async function act(fn: () => Promise<void>) {
    try {
      await fn()
    } catch (e) {
      setToast((e as Error).message)
    }
  }
  async function logout() {
    if (!leave()) return
    await api('logout', 'POST', {})
    reset(empty, null, 0)
  }
  async function download(id: string) {
    const res = await fetch('/api/files/' + id)
    if (!res.ok) throw new Error('文件读取失败，请重新登录后重试')
    const blob = await res.blob()
    const cd = res.headers.get('content-disposition') || ''
    const encoded = cd.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
    const fileName = encoded
      ? decodeURIComponent(encoded)
      : cd.match(/filename="([^"]+)"/)?.[1] || '附件'
    const url = URL.createObjectURL(blob),
      a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  async function deleteJob() {
    if (
      !job ||
      !window.confirm('删除这个岗位、专属笔记和进度记录？') ||
      !leave()
    )
      return
    const jobs = state.jobs.filter((j) => j.id !== job.id)
    await save({ ...state, jobs })
    setSelected(jobs[0]?.id || '')
    setExpanded(jobs[0]?.id || '')
    setModal('')
  }
  if (!ready)
    return (
      <main className="center-state">
        <img src="/brand/mark.svg" width="48" alt="Waymark" />
        <h2>{loadError ? '工作空间加载失败' : '正在检查登录状态…'}</h2>
        {loadError && (
          <>
            <p>{loadError}</p>
            <button className="primary" onClick={boot}>
              重新加载
            </button>
          </>
        )}
      </main>
    )
  if (!user) return <Auth onUser={loadWorkspace} />
  const title =
    page === 'jobs' ? (job ? '岗位详情' : '我的岗位') : pageNames[page]
  const list = state.jobs.filter((j) =>
    (j.company + ' ' + j.title).toLowerCase().includes(query.toLowerCase()),
  )
  const openAdd = () => {
    if (!leave()) return
    setModal('add')
    setDrawer(false)
  }
  const notes = (j?: Job) => (
    <Notes
      key={instance + '-' + (j?.id || 'general')}
      job={j}
      value={j ? j.note : state.general}
      onDirty={setDirty}
      onSave={async (note) => {
        await save(
          j
            ? {
                ...state,
                jobs: state.jobs.map((x) =>
                  x.id === j.id ? { ...x, note, updated: now() } : x,
                ),
              }
            : { ...state, general: note },
        )
      }}
    />
  )
  return (
    <div className={sidebarCollapsed ? 'app-shell sidebar-collapsed' : 'app-shell'}>
      {drawer && (
        <button
          aria-label="关闭导航遮罩"
          className="scrim"
          onClick={() => setDrawer(false)}
        />
      )}
      <aside
        id="workspace-sidebar"
        className={'sidebar ' + (drawer ? 'open' : '')}
        aria-label="工作空间导航"
      >
        <div className="brand-area">
          <img src="/brand/mark.svg" alt="" />
          <div>
            <div className="brand-word">Waymark</div>
            <span>个人求职工作空间</span>
          </div>
          <button
            className="mobile-close icon-btn"
            onClick={() => setDrawer(false)}
            aria-label="关闭导航"
          >
            <X />
          </button>
        </div>
        <button className="add-job primary" onClick={openAdd}>
          <Plus size={18} />
          添加岗位
        </button>
        <div className="side-scroll">
          <div className="nav-group">
            <button
              className={'nav-title ' + (page === 'jobs' ? 'current' : '')}
              onClick={() => {
                if (page === 'jobs') setJobsOpen(!jobsOpen)
                else {
                  navigate('jobs')
                  setJobsOpen(true)
                }
              }}
            >
              <BriefcaseBusiness />
              <strong>我的岗位</strong>
              <span className="count">{state.jobs.length}</span>
              {jobsOpen ? <ChevronDown /> : <ChevronRight />}
            </button>
            {jobsOpen && (
              <>
                <div className="search">
                  <Search size={15} />
                  <input
                    aria-label="搜索公司或岗位"
                    placeholder="搜索公司或岗位"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <div className="job-list">
                  {list.map((j) => {
                    const i = state.jobs.indexOf(j) % 3,
                      Icon = companyIcons[i],
                      active = j.id === selected && page === 'jobs',
                      open = expanded === j.id
                    return (
                      <div
                        key={j.id}
                        className={'job-item ' + (active ? 'active' : '')}
                      >
                        <button
                          onClick={() => pick(j)}
                          aria-expanded={open}
                          className="job-select"
                        >
                          <span className={'company-icon tone' + i}>
                            <Icon />
                          </span>
                          <span>
                            <strong>{j.company || '公司待确认'}</strong>
                            <small>{j.title || '岗位待确认'}</small>
                          </span>
                          {open ? <ChevronDown /> : <ChevronRight />}
                        </button>
                        {open && (
                          <div className="side-details">
                            <span>
                              <Monitor />
                              {j.platform || '平台待确认'}
                            </span>
                            <span>
                              <Clock3 />
                              {stamp(j.updated)}
                            </span>
                            <StatusPill status={j.status} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {!list.length && (
                    <p className="side-empty">
                      {query ? '没有匹配的岗位' : '尚未添加岗位'}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="secondary-nav">
            {(['general', 'materials'] as const).map((p, i) => {
              const Icon = i ? FolderOpen : BookOpen
              return (
                <button
                  key={p}
                  className={page === p ? 'highlight' : ''}
                  onClick={() => navigate(p)}
                >
                  <Icon />
                  {pageNames[p]}
                </button>
              )
            })}
          </div>
        </div>
        <div className="side-bottom">
          <button
            className={'account ' + (page === 'settings' ? 'highlight' : '')}
            aria-label="账号与设置"
            aria-current={page === 'settings' ? 'page' : undefined}
            onClick={() => navigate('settings')}
          >
            <span className="avatar">{user.name.slice(0, 1)}</span>
            <span>
              <strong>{user.name}</strong>
              <small>账号与设置</small>
            </span>
            <Settings2 size={17} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="crumb">
            <button
              aria-label="打开导航"
              aria-controls="workspace-sidebar"
              aria-expanded={drawer}
              className="menu-btn icon-btn"
              onClick={() => setDrawer(true)}
            >
              <Menu />
            </button>
            <button
              type="button"
              className="desktop-panel icon-btn"
              aria-label={sidebarCollapsed ? '展开侧栏' : '收起侧栏'}
              title={sidebarCollapsed ? '展开侧栏' : '收起侧栏'}
              aria-expanded={!sidebarCollapsed}
              aria-controls="workspace-sidebar"
              onClick={() => setSidebarCollapsed(value => !value)}
            >
              {sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            </button>
            <span>工作空间</span>
            <ChevronRight />
            <strong>{pageNames[page]}</strong>
          </div>
          <div className="environment">
            <i />
            本机私人空间
          </div>
        </header>
        <main
          className={
            (page === 'jobs' ? 'main-content jobs-main' : 'main-content') + (page === 'general' ? ' preparation-main' : '') + (page === 'settings' ? ' settings-main' : page === 'materials' ? ' materials-main' : '')
          }
        >
          {page === 'general' && (
            <div className="page-heading"><h2>{title}</h2></div>
          )}
          {page === 'jobs' &&
            (job ? (
              <>
                <JobDetail
                  job={job}
                  source={() => setModal('source')}
                  history={() => setModal('history')}
                  edit={() => setModal('edit')}
                  update={() => setModal('update')}
                />
                {notes(job)}
              </>
            ) : (
              <div className="card empty">
                <Compass />
                <h2>从第一个岗位开始</h2>
                <p>使用导航中的「添加岗位」，收录链接、文字或截图。</p>
              </div>
            ))}
          {page === 'general' && notes()}
          {page === 'materials' && (
            <MaterialsPage materials={state.materials}
              onPreview={setPreviewMaterial}
              onDownload={m => act(() => download(m.fileId))}
              onDirty={setDirty}
              onSave={async (m, upload) => {
                await save({ ...state, materials: state.materials.some(x => x.id === m.id)
                  ? state.materials.map(x => x.id === m.id ? m : x) : [m, ...state.materials] }, upload)
              }}
              onDelete={async m => {
                await save({ ...state, materials: state.materials.filter(x => x.id !== m.id) })
              }}
            />
          )}
          {page === 'settings' && (
            <Settings
              user={user}
              onUser={setUser}
              onLogout={logout}
              onDeleted={() => reset(empty, null, 0)}
            />
          )}
          {page !== 'settings' && page !== 'materials' && page !== 'general' && (
            <footer className="workspace-foot">
              <ShieldCheck size={14} />
              个人资料仅保存在本机服务
            </footer>
          )}
        </main>
        <StatusAssistant
          jobs={state.jobs}
          platforms={user.platforms}
          onRecord={(job, entry) => save({
            ...state,
            jobs: state.jobs.map(j => j.id === job.id
              ? { ...j, status: entry.status, updated: entry.time, history: [entry, ...j.history] }
              : j),
          })}
        />
      </div>
      {previewMaterial && (
        <MaterialPreview
          material={previewMaterial}
          onClose={() => setPreviewMaterial(undefined)}
          onDownload={() => act(() => download(previewMaterial.fileId))}
        />
      )}
      {toast && (
        <div className="toast" role="alert">
          <AlertCircle />
          {toast}
          <button onClick={() => setToast('')} aria-label="关闭提示">
            <X />
          </button>
        </div>
      )}
      {(modal === 'add' || modal === 'edit') && (
        <Dialog
          wide
          title={modal === 'add' ? '添加岗位' : '编辑岗位'}
          onClose={() => setModal('')}
        >
          <JobForm
            platforms={user.platforms}
            bindPlatform={async name => {
              const { platforms } = await api<{ platforms: string[] }>('platforms', 'POST', { name })
              setUser(current => current && { ...current, platforms })
            }}
            job={modal === 'edit' ? job : undefined}
            onSave={storeJob}
          />
          {modal === 'edit' && (
            <button
              className="delete-job danger-text"
              onClick={() => act(deleteJob)}
            >
              删除岗位
            </button>
          )}
        </Dialog>
      )}
      {modal === 'update' && job && (
        <Dialog title="记录更新" onClose={() => setModal('')}>
          <UpdateForm
            job={job}
            onSave={async (u) =>
              storeJob({
                ...job,
                updated: u.time,
                status: u.status,
                history: [u, ...job.history],
              })
            }
          />
        </Dialog>
      )}
      {modal === 'source' && job && (
        <Dialog title="来源与待确认事项" onClose={() => setModal('')}>
          <div className="read-body">
            <h3>原始岗位信息 · {job.source}</h3>
            <pre>{job.original || '待确认'}</pre>
            {job.fileId && (
              <button
                className="outline"
                onClick={() => act(() => download(job.fileId!))}
              >
                <Download />
                下载原始截图
              </button>
            )}
            {job.screenshots?.map((shot, i) => (
              <section key={shot.fileId}>
                <h3>
                  补充截图 {i + 1} · {stamp(shot.time)}
                </h3>
                <pre>{shot.original || '未识别到文字'}</pre>
                <button
                  className="outline"
                  onClick={() => act(() => download(shot.fileId))}
                >
                  <Download />
                  下载补充截图 {i + 1}
                </button>
              </section>
            ))}
            <h3>用户补充</h3>
            <p>{job.supplement || '尚无补充'}</p>
            <h3>待确认事项</h3>
            <p>
              {[
                ...fieldKeys.filter((k) => !job[k]).map((k) => fields[k]),
                ...(job.status === '待确认' ? ['投递状态'] : []),
              ].join('、') || '已填全字段'}
            </p>
          </div>
        </Dialog>
      )}
      {modal === 'history' && job && (
        <Dialog title="全部进度记录" onClose={() => setModal('')}>
          <div className="timeline all-history">
            {job.history.map((h, i) => (
              <div className={'event ' + (!i ? 'latest' : '')} key={i}>
                <i />
                <div>
                  <strong>{h.text}</strong>
                  <small>
                    {stamp(h.time, true)} · {h.source}
                  </small>
                  <StatusPill status={h.status} />
                </div>
              </div>
            ))}
          </div>
        </Dialog>
      )}

    </div>
  )
}
