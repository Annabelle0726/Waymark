import { useMemo, useState } from 'react'
import {
  Link2,
  ScanLine,
  AlignLeft,
  PenLine,
  BriefcaseBusiness,
  ListChecks,
  Bookmark,
  Check,
} from 'lucide-react'
import {
  emptyJob,
  fields,
  fieldKeys,
  extractText,
  statuses,
  fillMissingFromScreenshot,
  screenshotSource,
  now,
  type Job,
  type JobField,
  type Status,
  type Update,
  type Upload,
} from '../../domain/workspace'
import { Form } from '../../components/forms/Forms'
import { ScreenshotInput, useScreenshots } from './ScreenshotInput'

const modes = [
  { name: '上传截图', Icon: ScanLine },
  { name: '粘贴文字', Icon: AlignLeft },
  { name: '岗位链接', Icon: Link2 },
  { name: '手动填写', Icon: PenLine },
]
export function JobForm({
  job, platforms, bindPlatform,
  onSave,
}: {
  platforms: string[]
  bindPlatform: (name:string)=>Promise<void>
  job?: Job
  onSave: (j: Job, u?: Upload | Upload[]) => Promise<void>
}) {
  const [base, setBase] = useState<Job>(() => (job ? { ...job } : emptyJob()))
  const [mode, setMode] = useState('上传截图')
  const [raw, setRaw] = useState(''),
    [url, setUrl] = useState(''),
    [hint, setHint] = useState('')
  const [changes, setChanges] = useState<Partial<Job>>({})
  const [platform,setPlatform]=useState(job?.platform || '')
  const [newPlatform,setNewPlatform]=useState('')
  const [binding,setBinding]=useState(false)
  const [bindError,setBindError]=useState('')
  const gallery = useScreenshots(job)
  const withImages = Boolean(job) || mode === '上传截图'
  const pending = withImages && gallery.rows.some((r) => r.state === 'pending')
  const invalid =
    withImages && gallery.rows.some((r) => r.state === 'failed' && !r.upload)
  const allowMissing = (job?.source || mode) === '上传截图'
  const draft = useMemo(() => {
    if (!withImages) return base
    const combined = gallery.rows.reduce(
      (acc, r) =>
        r.state === 'saved' || !r.original
          ? acc
          : fillMissingFromScreenshot(acc, r.original),
      base,
    )
    return { ...combined, ...changes }
  }, [withImages, base, changes, gallery.rows])
  function edit(patch: Partial<Job>) {
    if (withImages) setChanges((v) => ({ ...v, ...patch }))
    else setBase((v) => ({ ...v, ...patch }))
  }
  const field = (key: JobField) => {
    const required = !allowMissing && (key === 'company' || key === 'title')
    const props = {
      value: draft[key],
      required,
      placeholder: required ? '请输入' + fields[key] : '待确认',
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => edit({ [key]: e.target.value }),
    }
    return (
      <label key={key} className={key === 'description' ? 'span2' : ''}>
        {fields[key]}
        {required && <span className="required"> *</span>}
        {key === 'description' ? (
          <textarea rows={3} {...props} />
        ) : (
          <input {...props} />
        )}
      </label>
    )
  }
  return (
    <Form
      className="job-form"
      label={pending ? '正在识别…' : job ? '保存修改' : '确认添加岗位'}
      submitDisabled={
        pending || invalid || (!job && withImages && !gallery.rows.length)
      }
      submit={async () => {
        if (!platform || !platforms.includes(platform))
          throw new Error('请先关联并选择招聘平台')
        if (!allowMissing && (!draft.company.trim() || !draft.title.trim()))
          throw new Error('请填写公司和岗位名称')
        if (!job && mode === '岗位链接' && !/^https?:\/\//i.test(url))
          throw new Error('请输入 http 或 https 链接')
        if (!job && mode === '粘贴文字' && !raw.trim())
          throw new Error('请先粘贴岗位原文')
        const time = now(),
          source = job?.source || mode
        const shots = gallery.rows.map(({ fileId, original, time, name }) => ({
          fileId,
          original,
          time,
          name,
        }))
        const original =
          job?.original ??
          (mode === '粘贴文字'
            ? raw
            : mode === '岗位链接'
              ? url
              : fieldKeys
                  .filter((k) => k === 'platform' || draft[k])
                  .map(
                    (k) =>
                      fields[k] +
                      '：' +
                      (k === 'platform' ? platform : draft[k]),
                  )
                  .join('\n'))
        const sources =
          source === '上传截图'
            ? screenshotSource(shots)
            : { original, screenshots: withImages ? shots : undefined }
        await onSave(
          {
            ...draft,
            platform,
            company: draft.company.trim(),
            title: draft.title.trim(),
            source,
            ...sources,
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
          withImages
            ? gallery.rows.flatMap((r) => (r.upload ? [r.upload] : []))
            : undefined,
        )
      }}
    >
      {!job && (
        <div className="intake-tabs" aria-label="录入方式">
          {modes.map(({ name, Icon }) => (
            <button
              key={name}
              type="button"
              aria-pressed={name === mode}
              onClick={() => setMode(name)}
            >
              <Icon size={19} />
              {name}
              {name === mode && <Check className="mode-check" size={12} />}
            </button>
          ))}
        </div>
      )}
      <label>
        招聘平台 *
        <select
          required
          aria-label="招聘平台"
          value={platforms.includes(platform) ? platform : ''}
          onChange={(e) => setPlatform(e.target.value)}
        >
          <option value="">请选择已关联的平台</option>
          {platforms.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </label>
      <details open={platforms.length === 0 || undefined}>
        <summary>关联新的岗位来源</summary>
        <label>
          平台名称
          <input
            maxLength={80}
            placeholder="例如 BOSS直聘、公司官网"
            value={newPlatform}
            onChange={(e) => setNewPlatform(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="outline"
          disabled={binding || !newPlatform.trim()}
          onClick={async () => {
            const name = newPlatform.trim()
            setBinding(true)
            setBindError('')
            try {
              await bindPlatform(name)
              setPlatform(name)
              setNewPlatform('')
            } catch (e) {
              setBindError((e as Error).message)
            } finally {
              setBinding(false)
            }
          }}
        >
          关联此来源
        </button>
        <small>仅关联本机岗位来源，平台账号授权及站内同步尚未接入。</small>
        {bindError && <p role="alert">{bindError}</p>}
      </details>
      {withImages && <ScreenshotInput gallery={gallery} />}
      {job &&
      (job.fileId || job.screenshots?.length) &&
      gallery.rows.filter((r) => r.state === 'saved').length <
        (job.fileId ? 1 : 0) + (job.screenshots?.length || 0) ? (
        <p className="shot-removal" role="status">
          保存修改后将删除已移除的原图和识别原文，已确认的岗位字段会保留。
        </p>
      ) : null}
      {!job && mode === '粘贴文字' && (
        <label>
          岗位原文
          <textarea
            required
            rows={4}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={'公司：\n岗位：\n薪资：'}
          />
          <button
            type="button"
            className="outline small"
            onClick={() => {
              const values = extractText(raw)
              edit(values)
              setHint(
                '已识别 ' + Object.keys(values).length + ' 个字段，请核对。',
              )
            }}
          >
            提取带标签字段
          </button>
          <small>{hint}</small>
        </label>
      )}
      {!job && mode === '岗位链接' && (
        <label>
          原始链接
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://"
          />
          <small>保存来源链接后，可在下方填写岗位详情。</small>
        </label>
      )}
      {(job || !withImages || gallery.rows.length > 0) && (
        <>
          <section className="job-section">
            <h3>
              <BriefcaseBusiness />
              岗位信息
            </h3>
            <div className="field-grid">
              {(
                ['company', 'title', 'salary', 'location', 'remote'] as const
              ).map(field)}
            </div>
          </section>
          <section className="job-section">
            <h3>
              <ListChecks />
              岗位要求
            </h3>
            <div className="field-grid">
              {(['description', 'skills', 'bonus'] as const).map(field)}
            </div>
          </section>
          <section className="job-section">
            <h3>
              <Bookmark />
              跟进记录
            </h3>
            <div className="field-grid">
              <label>
                投递状态
                <select
                  aria-label="投递状态"
                  value={draft.status}
                  onChange={(e) => edit({ status: e.target.value as Status })}
                >
                  {statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="span2">
                用户补充
                <textarea
                  value={draft.supplement}
                  onChange={(e) => edit({ supplement: e.target.value })}
                  placeholder="记录沟通内容或个人观察"
                  rows={2}
                />
              </label>
            </div>
          </section>
        </>
      )}
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
