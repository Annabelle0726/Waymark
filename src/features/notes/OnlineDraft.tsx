import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import { Dialog, Form } from '../../components/forms/Forms'
import { type Job } from '../../domain/workspace'

export default function OnlineDraft({
  job,
  onClose,
  insert,
}: {
  job?: Job
  onClose: () => void
  insert: (text: string) => void
}) {
  const [info, setInfo] = useState<{ configured: boolean; model: string }>()
  const [failure, setFailure] = useState('')
  const [excerpt, setExcerpt] = useState(
    job
      ? [job.title, job.description, job.skills]
          .filter(Boolean)
          .join('\n')
          .slice(0, 6000)
      : '',
  )
  useEffect(() => {
    api<{ configured: boolean; model: string }>('assistant')
      .then(setInfo)
      .catch((e) => setFailure(e.message))
  }, [])
  return (
    <Dialog title="DeepSeek 在线草稿" onClose={onClose}>
      {info?.configured ? (
        <Form
          label="确认发送并生成草稿"
          submit={async () => {
            const r = await api<{ draft: string }>('assistant', 'POST', {
              excerpt,
              confirmed: true,
            })
            insert(r.draft)
          }}
        >
          <p className="description">
            下方文字将发送至 DeepSeek（{info.model}），可能产生 API
            费用。可删减内容，或自行添加一段真实项目摘要。
          </p>
          <label>
            发送内容
            <textarea
              required
              maxLength={6000}
              rows={8}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="填写希望用于生成草稿的摘录"
            />
            <small>
              {excerpt.length} / 6000 字。附件、邮箱和现有笔记不会自动附带。
            </small>
          </label>
        </Form>
      ) : (
        <p className="read-body">
          {failure ||
            (info
              ? '尚未配置密钥。可在 private/backend.env 配置后重启服务，或使用离线提纲。'
              : '正在读取配置状态…')}
        </p>
      )}
    </Dialog>
  )
}
