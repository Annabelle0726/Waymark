import { ScreenshotInput, type Scan } from './ScreenshotInput'
import { useState } from 'react'
import { Link2, ScanLine, AlignLeft, PenLine } from 'lucide-react'
import {
  emptyJob,
  fields,
  fieldKeys,
  extractText,
  statuses,
  fillMissingFromScreenshot,
  now,
  type Job,
  type Status,
  type Update,
  type Upload,
} from '../../domain/workspace'
import { Form } from '../../components/forms/Forms'

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
  const [manualDraft, setManualDraft] = useState<Job>(() =>
      job ? { ...job } : emptyJob(),
    ),
    [mode, setMode] = useState('手动填写')
  const [raw, setRaw] = useState(''),
    [url, setUrl] = useState(''),
    [hint, setHint] = useState('')
  const initialScan: Scan = { text: '', pending: false, message: '' }
  const [scan, setScan] = useState<Scan>(initialScan)
  const [imageDraft, setImageDraft] = useState(emptyJob)
  const [supplementing, setSupplementing] = useState(false)
  const scanning = (!job && mode === '上传截图') || supplementing
  const allowMissing = scanning || job?.source === '上传截图'
  const draft = scanning ? imageDraft : manualDraft
  const setDraft = scanning ? setImageDraft : setManualDraft
  function updateScan(result: Scan) {
    setScan(result)
    setImageDraft((d) =>
      fillMissingFromScreenshot(
        supplementing ? manualDraft : { ...emptyJob(), id: d.id },
        result.text,
      ),
    )
  }
  function extract() {
    const values = extractText(raw)
    setDraft((d) => ({ ...d, ...values }))
    setHint(
      '已识别 ' + Object.keys(values).length + ' 个带标签字段，请逐项核对。',
    )
  }
  return (
    <Form
      label={
        job
          ? '保存修改'
          : scanning && scan.pending
            ? '正在识别…'
            : '确认添加岗位'
      }
      submitDisabled={scanning && (scan.pending || !scan.upload)}
      submit={async () => {
        if (!allowMissing && (!draft.company.trim() || !draft.title.trim()))
          throw new Error('请填写公司和岗位名称')
        if (!job && mode === '岗位链接' && !/^https?:\/\//i.test(url))
          throw new Error('请输入 http 或 https 链接')
        if (scanning && (!scan.upload || scan.pending))
          throw new Error('请选择一张岗位截图')
        if (!job && mode === '粘贴文字' && !raw.trim())
          throw new Error('请先粘贴岗位原文')
        const upload = scanning ? scan.upload : undefined
        const time = now(),
          source = job ? job.source : mode,
          original = job
            ? job.original
            : mode === '粘贴文字'
              ? raw
              : mode === '岗位链接'
                ? url
                : mode === '上传截图'
                  ? scan.text || '截图未识别到文字'
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
            fileId: job?.fileId || upload?.id,
            screenshots:
              supplementing && upload
                ? [
                    ...(job?.screenshots || []),
                    { fileId: upload.id, original: scan.text, time },
                  ]
                : job?.screenshots,
            updated: time,
            history: [
              {
                time,
                status: draft.status,
                source: '手动记录',
                text: supplementing
                  ? '补充岗位截图'
                  : job
                    ? '编辑岗位信息'
                    : '收录岗位信息',
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
                  if (scanning && name !== mode) updateScan(initialScan)
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
          {scanning && <ScreenshotInput scan={scan} onScan={updateScan} />}
        </>
      )}
      {job?.source === '上传截图' && (
        <div>
          <button
            type="button"
            className="outline small"
            onClick={() => {
              setScan(initialScan)
              setSupplementing(!supplementing)
            }}
          >
            {supplementing ? '取消补图' : '补充另一张截图'}
          </button>
          {supplementing && (
            <>
              <p>只补充缺失字段，已填写的内容和原图会保留。</p>
              <ScreenshotInput scan={scan} onScan={updateScan} />
            </>
          )}
        </div>
      )}
      {(!scanning || (scan.upload && !scan.pending)) && (
        <div className="field-grid">
          {fieldKeys.map((k) => (
            <label key={k} className={k === 'description' ? 'span2' : ''}>
              {fields[k]}
              {!allowMissing && (k === 'company' || k === 'title') && (
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
                  required={!allowMissing && (k === 'company' || k === 'title')}
                  value={draft[k]}
                  onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                  placeholder={
                    ['skills', 'bonus'].includes(k)
                      ? '多项用逗号分隔'
                      : '待确认'
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
              onChange={(e) =>
                setDraft({ ...draft, supplement: e.target.value })
              }
              placeholder="补充个人观察或沟通内容"
            />
          </label>
        </div>
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
