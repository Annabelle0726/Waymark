import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from 'react'
import {
  X,
  Link2,
  ScanLine,
  AlignLeft,
  PenLine,
  FileText,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
  LockKeyhole,
  UserRound,
} from 'lucide-react'
import {
  emptyJob,
  fields,
  fieldKeys,
  extractText,
  statuses,
  readUpload,
  now,
  uid,
  type Job,
  type Status,
  type Update,
  type Upload,
  type Material,
  type User,
} from './model'
import { api } from './api'

export function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
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
    if (!dirty.current || window.confirm('放弃尚未提交的表单内容？')) onClose()
  }
  return (
    <dialog
      ref={ref}
      className={'dialog ' + (wide ? 'wide' : '')}
      aria-label={title}
      onChange={() => {
        dirty.current = true
      }}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
    >
      <div className="dialog-head">
        <h2>{title}</h2>
        <button className="icon-btn" onClick={close} aria-label="关闭">
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
}: {
  children: ReactNode
  submit: () => Promise<void>
  label: string
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  async function handle(e: FormEvent) {
    e.preventDefault()
    if (busy) return
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
    <form onSubmit={handle} aria-busy={busy}>
      <fieldset disabled={busy} className="form-body">
        {children}
        {error && (
          <p role="alert" className="error">
            <AlertCircle size={16} />
            {error}
          </p>
        )}
        <div className="form-foot">
          <button className="primary" type="submit">
            {busy ? '正在处理…' : label}
            <ArrowRight size={16} />
          </button>
        </div>
      </fieldset>
    </form>
  )
}
const modes = [
  { name: '手动填写', Icon: PenLine },
  { name: '粘贴文字', Icon: AlignLeft },
  { name: '岗位链接', Icon: Link2 },
  { name: '上传截图', Icon: ScanLine },
]
export function JobForm({
  job,
  onSave,
}: {
  job?: Job
  onSave: (j: Job, u?: Upload) => Promise<void>
}) {
  const [draft, setDraft] = useState<Job>(() =>
      job ? { ...job } : emptyJob(),
    ),
    [mode, setMode] = useState('手动填写')
  const [raw, setRaw] = useState(''),
    [url, setUrl] = useState(''),
    [file, setFile] = useState<File>(),
    [hint, setHint] = useState('')
  function extract() {
    const values = extractText(raw)
    setDraft((d) => ({ ...d, ...values }))
    setHint(
      '已识别 ' + Object.keys(values).length + ' 个带标签字段，请逐项核对。',
    )
  }
  return (
    <Form
      label={job ? '保存修改' : '确认添加岗位'}
      submit={async () => {
        if (!draft.company.trim() || !draft.title.trim())
          throw new Error('请填写公司和岗位名称')
        if (!job && mode === '岗位链接' && !/^https?:\/\//i.test(url))
          throw new Error('请输入 http 或 https 链接')
        if (!job && mode === '上传截图' && !file)
          throw new Error('请选择一张岗位截图')
        if (!job && mode === '粘贴文字' && !raw.trim())
          throw new Error('请先粘贴岗位原文')
        const upload =
          !job && mode === '上传截图' && file
            ? await readUpload(file)
            : undefined
        const time = now(),
          source = job ? job.source : mode,
          original = job
            ? job.original
            : mode === '粘贴文字'
              ? raw
              : mode === '岗位链接'
                ? url
                : mode === '上传截图'
                  ? file!.name
                  : fieldKeys
                      .filter((k) => draft[k])
                      .map((k) => fields[k] + '：' + draft[k])
                      .join('\n')
        await onSave(
          {
            ...draft,
            company: draft.company.trim(),
            title: draft.title.trim(),
            source,
            original,
            fileId: upload?.id || job?.fileId,
            updated: time,
            history: [
              {
                time,
                status: draft.status,
                source: '手动记录',
                text: job ? '编辑岗位信息' : '收录岗位信息',
              },
              ...draft.history,
            ],
          },
          upload,
        )
      }}
    >
      {!job && (
        <>
          <div className="mode-row">
            {modes.map(({ name, Icon }) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setMode(name)
                  setHint('')
                }}
                className={mode === name ? 'chosen' : ''}
              >
                <Icon size={16} />
                {name}
              </button>
            ))}
          </div>
          {mode === '粘贴文字' && (
            <label>
              岗位原文
              <textarea
                required
                rows={4}
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder={'公司：\n岗位：\n薪资：\n地点：'}
              />
              <button className="outline small" type="button" onClick={extract}>
                提取带标签字段
              </button>
              <small>
                {hint || '支持每行一个「字段：内容」，未识别信息可在下方填写。'}
              </small>
            </label>
          )}
          {mode === '岗位链接' && (
            <label>
              原始链接
              <input
                required
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://"
              />
              <small>
                仅保存来源链接，网页读取未接入。请手动核对下方信息。
              </small>
            </label>
          )}
          {mode === '上传截图' && (
            <label>
              岗位截图
              <input
                required
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0])}
              />
              <small>
                单张最大 10 MB。OCR 未接入，请对照截图填写下方字段。
              </small>
            </label>
          )}
        </>
      )}
      <div className="field-grid">
        {fieldKeys.map((k) => (
          <label key={k} className={k === 'description' ? 'span2' : ''}>
            {fields[k]}
            {(k === 'company' || k === 'title') && (
              <span className="required"> *</span>
            )}
            {k === 'description' ? (
              <textarea
                rows={3}
                value={draft[k]}
                onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                placeholder="待确认"
              />
            ) : (
              <input
                required={k === 'company' || k === 'title'}
                value={draft[k]}
                onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                placeholder={
                  ['skills', 'bonus'].includes(k) ? '多项用逗号分隔' : '待确认'
                }
              />
            )}
          </label>
        ))}
        <label>
          投递状态
          <select
            aria-label="投递状态"
            value={draft.status}
            onChange={(e) =>
              setDraft({ ...draft, status: e.target.value as Status })
            }
          >
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="span2">
          用户补充
          <textarea
            rows={2}
            value={draft.supplement}
            onChange={(e) => setDraft({ ...draft, supplement: e.target.value })}
            placeholder="补充个人观察或沟通内容"
          />
        </label>
      </div>
    </Form>
  )
}
export function UpdateForm({
  job,
  onSave,
}: {
  job: Job
  onSave: (u: Update) => Promise<void>
}) {
  const [status, setStatus] = useState(job.status),
    [source, setSource] = useState('手动记录'),
    [text, setText] = useState('')
  return (
    <Form
      label="保存更新"
      submit={async () => {
        if (!text.trim() || !source.trim())
          throw new Error('请填写更新内容和来源')
        await onSave({
          time: now(),
          source: source.trim(),
          text: text.trim(),
          status,
        })
      }}
    >
      <label>
        当前进度
        <select
          aria-label="当前进度"
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
        >
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label>
        更新内容
        <textarea
          required
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="例如，收到面试邀请，准备确认时间"
        />
      </label>
      <label>
        记录来源
        <input
          required
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
      </label>
    </Form>
  )
}
export function MaterialForm({
  item,
  onSave,
}: {
  item?: Material
  onSave: (m: Material, u?: Upload) => Promise<void>
}) {
  const [name, setName] = useState(item?.name || ''),
    [category, setCategory] = useState(item?.category || '简历'),
    [summary, setSummary] = useState(item?.summary || ''),
    [file, setFile] = useState<File>()
  return (
    <Form
      label="保存资料"
      submit={async () => {
        if (!name.trim()) throw new Error('请填写资料名称')
        const upload = file ? await readUpload(file) : undefined
        if (!upload && !item) throw new Error('请选择文件')
        await onSave(
          {
            id: item?.id || uid(),
            fileId: upload?.id || item!.fileId,
            name: name.trim(),
            category,
            summary,
            date: now(),
          },
          upload,
        )
      }}
    >
      <label>
        {item ? '替换文件（可选）' : '选择文件'}
        <input
          type="file"
          required={!item}
          onChange={(e) => {
            const f = e.target.files?.[0]
            setFile(f)
            if (f && !name) setName(f.name)
          }}
        />
        <small>单个文件最大 10 MB</small>
      </label>
      <label>
        资料名称
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        资料类型
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {['简历', '证书', '奖状', '其他'].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      <label>
        资料摘要
        <textarea
          rows={3}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="可填写希望用于面试提纲的真实经历；文件正文不会自动解析。"
        />
      </label>
    </Form>
  )
}
export function Auth({
  onUser,
  onBack,
}: {
  onUser: (u: User) => Promise<void>
  onBack: () => void
}) {
  const [register, setRegister] = useState(false),
    [visible, setVisible] = useState(false)
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [name, setName] = useState('')
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand">
          <img src="/mark.svg" alt="" />
          Waymark
        </div>
        <h1>{register ? '创建账号' : '欢迎回来'}</h1>
        <p>登录本机的私人求职工作空间</p>
        <Form
          key={String(register)}
          label={register ? '注册并进入工作空间' : '登录'}
          submit={async () => {
            if (register && confirm !== password)
              throw new Error('两次输入的密码不一致')
            const r = await api<{ user: User }>(
              'auth/' + (register ? 'register' : 'login'),
              'POST',
              { name, email, password },
            )
            await onUser(r.user)
          }}
        >
          {register && (
            <label>
              <UserRound size={15} /> 昵称
              <input
                required
                maxLength={50}
                autoComplete="nickname"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          )}
          <label>
            <Mail size={15} /> 邮箱
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </label>
          <label>
            <LockKeyhole size={15} /> 密码
            <div className="password">
              <input
                required
                minLength={8}
                maxLength={256}
                type={visible ? 'text' : 'password'}
                autoComplete={register ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 8 位字符"
              />
              <button
                aria-label={visible ? '隐藏密码' : '显示密码'}
                className="icon-btn"
                type="button"
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
          {register && (
            <label>
              确认密码
              <input
                required
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
          )}
        </Form>
        <div className="auth-links">
          <button
            onClick={() => {
              setRegister(!register)
              setPassword('')
              setConfirm('')
            }}
          >
            {register ? '已有账号？登录' : '还没有账号？注册'}
          </button>
          <button onClick={onBack}>
            <FileText size={14} />
            浏览虚构示例
          </button>
        </div>
      </section>
    </main>
  )
}
