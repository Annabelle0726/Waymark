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
  PanelLeft,
  Pencil,
  CirclePlus,
  ShieldCheck,
  LogIn,
  LogOut,
  FileText,
  UploadCloud,
  Download,
  Trash2,
  CircleUserRound,
  Compass,
  AlertCircle,
} from 'lucide-react'
import { api } from './api'
import {
  demoWorkspace,
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
} from './model'
import { Dialog, JobForm, UpdateForm, MaterialForm, Auth, Form } from './Forms'
import Notes from './Notes'
import JobDetail, { StatusPill } from './JobDetail'
type Page = 'jobs' | 'general' | 'materials' | 'settings'
type Modal =
  | ''
  | 'add'
  | 'edit'
  | 'update'
  | 'source'
  | 'history'
  | 'material'
  | 'profile'
  | 'deleteAccount'
const pageNames: Record<Page, string> = {
  jobs: '我的岗位',
  general: '通用面试准备',
  materials: '我的资料',
  settings: '设置',
}
const empty: Workspace = { jobs: [], general: '', materials: [] }
const companyIcons = [Layers3, Hexagon, Triangle]
export default function App() {
  const [state, setState] = useState<Workspace>(empty),
    [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [loadError, setLoadError] = useState('')
  const [auth, setAuth] = useState(false),
    [page, setPage] = useState<Page>('jobs'),
    [selected, setSelected] = useState(''),
    [expanded, setExpanded] = useState(''),
    [jobsOpen, setJobsOpen] = useState(true)
  const [query, setQuery] = useState(''),
    [drawer, setDrawer] = useState(false),
    [modal, setModal] = useState<Modal>(''),
    [material, setMaterial] = useState<Material>(),
    [toast, setToast] = useState(''),
    [dirty, setDirty] = useState(false)
  const [name, setName] = useState(''),
    [password, setPassword] = useState(''),
    [instance, setInstance] = useState(0)
  const revision = useRef(0),
    lock = useRef(false),
    guestFiles = useRef(new Map<string, Upload>())
  const job = state.jobs.find((j) => j.id === selected)
  function reset(data: Workspace, u: User | null, rev: number) {
    setState(data)
    setUser(u)
    revision.current = rev
    setPage('jobs')
    setSelected(data.jobs[0]?.id || '')
    setExpanded(data.jobs[0]?.id || '')
    setModal('')
    setDirty(false)
    setDrawer(false)
    setQuery('')
    setJobsOpen(true)
    setInstance((n) => n + 1)
    guestFiles.current.clear()
  }
  async function loadWorkspace(u: User) {
    const data = await api<{ state: Workspace; revision: number }>('workspace')
    reset(data.state, u, data.revision)
    setAuth(false)
  }
  async function boot() {
    setReady(false)
    setLoadError('')
    try {
      const s = await api<{ user: User | null }>('session')
      if (s.user) await loadWorkspace(s.user)
      else reset(demoWorkspace(), null, 0)
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
      if (user) {
        const r = await api<{ revision: number }>('workspace', 'PUT', {
          state: next,
          revision: revision.current,
          upload,
        })
        revision.current = r.revision
      } else if (upload) guestFiles.current.set(upload.id, upload)
      if (!user) {
        const used = new Set([
          ...next.jobs.map((j) => j.fileId),
          ...next.materials.map((m) => m.fileId),
        ])
        for (const key of guestFiles.current.keys())
          if (!used.has(key)) guestFiles.current.delete(key)
      }
      setState(next)
    } finally {
      lock.current = false
    }
  }
  async function storeJob(j: Job, u?: Upload) {
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
  function startAuth() {
    if (!leave()) return
    setDrawer(false)
    setAuth(true)
  }
  async function logout() {
    if (!leave()) return
    await api('logout', 'POST', {})
    reset(demoWorkspace(), null, 0)
    setAuth(true)
  }
  async function download(id: string) {
    let blob: Blob, fileName: string
    if (user) {
      const res = await fetch('/api/files/' + id)
      if (!res.ok) throw new Error('文件读取失败，请重新登录后重试')
      blob = await res.blob()
      const cd = res.headers.get('content-disposition') || ''
      const encoded = cd.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
      fileName = encoded
        ? decodeURIComponent(encoded)
        : cd.match(/filename="([^"]+)"/)?.[1] || '附件'
    } else {
      const file = guestFiles.current.get(id)
      if (!file) throw new Error('文件不存在')
      blob = new Blob([
        Uint8Array.from(atob(file.data), (c) => c.charCodeAt(0)),
      ])
      fileName = file.name
    }
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
        <img src="/mark.svg" width="48" alt="Waymark" />
        <h2>{loadError ? '工作空间加载失败' : '正在打开工作空间…'}</h2>
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
  if (auth) return <Auth onUser={loadWorkspace} onBack={() => setAuth(false)} />
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
      materials={state.materials}
      demo={!user}
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
    <div className="app-shell">
      {drawer && (
        <button
          aria-label="关闭导航遮罩"
          className="scrim"
          onClick={() => setDrawer(false)}
        />
      )}
      <aside
        className={'sidebar ' + (drawer ? 'open' : '')}
        aria-label="工作空间导航"
      >
        <div className="brand-area">
          <img src="/mark.svg" alt="" />
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
                            <strong>{j.company}</strong>
                            <small>{j.title}</small>
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
            className={
              'setting-link ' + (page === 'settings' ? 'highlight' : '')
            }
            onClick={() => navigate('settings')}
          >
            <Settings2 />
            设置
          </button>
          <button
            className="account"
            onClick={() => (user ? navigate('settings') : startAuth())}
          >
            <span className="avatar">
              {user ? user.name.slice(0, 1) : <CircleUserRound />}
            </span>
            <span>
              <strong>{user?.name || '示例访客'}</strong>
              <small>{user ? '个人账号' : '登录 / 注册'}</small>
            </span>
            <ChevronRight size={15} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="crumb">
            <button
              aria-label="打开导航"
              className="menu-btn icon-btn"
              onClick={() => setDrawer(true)}
            >
              <Menu />
            </button>
            <PanelLeft className="desktop-panel" />
            <span>工作空间</span>
            <ChevronRight />
            <strong>{pageNames[page]}</strong>
          </div>
          <div className="environment">
            <i />
            {user ? '本机私人空间' : '虚构示例空间'}
          </div>
        </header>
        <main className="main-content">
          <div className="page-heading">
            <div>
              <span className="heading-dash" />
              <h2>{title}</h2>
            </div>
            <div className="actions">
              {page === 'jobs' && job && (
                <>
                  <button className="outline" onClick={() => setModal('edit')}>
                    <Pencil />
                    编辑岗位
                  </button>
                  <button
                    className="primary"
                    onClick={() => setModal('update')}
                  >
                    <CirclePlus />
                    记录更新
                  </button>
                </>
              )}
              {page === 'materials' && (
                <button
                  className="primary"
                  onClick={() => {
                    setMaterial(undefined)
                    setModal('material')
                  }}
                >
                  <UploadCloud />
                  上传资料
                </button>
              )}
            </div>
          </div>
          {page === 'jobs' &&
            (job ? (
              <>
                <JobDetail
                  job={job}
                  source={() => setModal('source')}
                  history={() => setModal('history')}
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
          {page === 'general' && (
            <>
              <p className="page-intro">
                在这里整理可用于多个岗位的自我介绍、项目经历和常见问题。
              </p>
              {notes()}
            </>
          )}
          {page === 'materials' &&
            (state.materials.length ? (
              <div className="file-list">
                {state.materials.map((m) => (
                  <article className="card file-card" key={m.id}>
                    <span className="section-icon">
                      <FileText />
                    </span>
                    <div>
                      <small>
                        {m.category} · {stamp(m.date)}
                      </small>
                      <h3>{m.name}</h3>
                      <p>{m.summary || '尚未填写摘要'}</p>
                    </div>
                    <div className="actions">
                      <button
                        className="icon-btn"
                        aria-label={'下载 ' + m.name}
                        onClick={() => act(() => download(m.fileId))}
                      >
                        <Download />
                      </button>
                      <button
                        className="icon-btn"
                        aria-label={'编辑 ' + m.name}
                        onClick={() => {
                          setMaterial(m)
                          setModal('material')
                        }}
                      >
                        <Pencil />
                      </button>
                      <button
                        className="icon-btn"
                        aria-label={'删除 ' + m.name}
                        onClick={() =>
                          act(async () => {
                            if (confirm('删除这份资料及其文件？'))
                              await save({
                                ...state,
                                materials: state.materials.filter(
                                  (x) => x.id !== m.id,
                                ),
                              })
                          })
                        }
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="card empty">
                <FolderOpen />
                <h2>资料库还是空的</h2>
                <p>上传简历、证书或奖状，可为每份资料添加摘要。</p>
              </div>
            ))}
          {page === 'settings' && (
            <section className="card settings-card">
              <header className="card-head">
                <h2>
                  <span className="section-icon">
                    <CircleUserRound />
                  </span>
                  个人信息
                </h2>
              </header>
              <dl>
                <dt>昵称</dt>
                <dd>{user?.name || '示例访客'}</dd>
                <dt>邮箱</dt>
                <dd>{user?.email || '尚未登录'}</dd>
                <dt>数据保存</dt>
                <dd>
                  {user
                    ? '岗位、笔记和上传文件按账号保存在本机服务的 SQLite 数据库中。'
                    : '当前为临时示例空间，刷新会重置。注册后可保存私人资料。'}
                </dd>
                <dt>外部服务</dt>
                <dd>
                  离线提纲在本机生成。在线草稿仅在确认摘录后调用
                  DeepSeek。招聘平台与 OCR 尚未接入。
                </dd>
              </dl>
              <div className="settings-actions">
                {user ? (
                  <>
                    <button
                      className="outline"
                      onClick={() => {
                        setName(user.name)
                        setModal('profile')
                      }}
                    >
                      <Pencil />
                      编辑昵称
                    </button>
                    <button className="outline" onClick={() => act(logout)}>
                      <LogOut />
                      退出登录
                    </button>
                    <button
                      className="danger-text"
                      onClick={() => {
                        setPassword('')
                        setModal('deleteAccount')
                      }}
                    >
                      删除账号与数据
                    </button>
                  </>
                ) : (
                  <button className="primary" onClick={startAuth}>
                    <LogIn />
                    登录 / 注册
                  </button>
                )}
              </div>
            </section>
          )}
          <footer className="workspace-foot">
            <ShieldCheck size={14} />
            {user
              ? '个人资料仅保存在本机服务'
              : '虚构示例仅供体验，登录后可保存私人资料'}
          </footer>
        </main>
      </div>
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
          <JobForm job={modal === 'edit' ? job : undefined} onSave={storeJob} />
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
      {modal === 'material' && (
        <Dialog
          title={material ? '编辑资料' : '上传资料'}
          onClose={() => setModal('')}
        >
          <MaterialForm
            item={material}
            onSave={async (m, u) => {
              await save(
                {
                  ...state,
                  materials: material
                    ? state.materials.map((x) => (x.id === m.id ? m : x))
                    : [m, ...state.materials],
                },
                u,
              )
              setModal('')
            }}
          />
        </Dialog>
      )}
      {modal === 'profile' && (
        <Dialog title="编辑个人信息" onClose={() => setModal('')}>
          <Form
            label="保存个人信息"
            submit={async () => {
              const r = await api<{ user: User }>('account', 'PATCH', { name })
              setUser(r.user)
              setModal('')
            }}
          >
            <label>
              昵称
              <input
                required
                maxLength={50}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          </Form>
        </Dialog>
      )}
      {modal === 'deleteAccount' && (
        <Dialog title="删除账号与全部私人数据" onClose={() => setModal('')}>
          <Form
            label="永久删除账号"
            submit={async () => {
              await api('account', 'DELETE', { password })
              reset(demoWorkspace(), null, 0)
              setPassword('')
              setAuth(true)
            }}
          >
            <p>此操作将永久删除岗位、笔记和上传文件。请输入密码确认。</p>
            <label>
              当前密码
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          </Form>
        </Dialog>
      )}
    </div>
  )
}
