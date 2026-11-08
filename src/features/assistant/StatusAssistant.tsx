import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Dialog } from '../../components/forms/Forms'
import { api } from '../../services/api'
import { stamp, now, type Job, type Update } from '../../domain/workspace'
import { suggestedUpdate, type Notice } from '../../domain/notifications'
import DevicePanel from './DevicePanel'

type Hit = { title: string; url: string; snippet: string }
export default function StatusAssistant({
  jobs,
  platforms,
  onRecord,
}: {
  jobs: Job[]
  platforms: string[]
  onRecord: (job: Job, entry: Update) => Promise<void>
}) {
  const [open, setOpen] = useState(
    () => new URLSearchParams(location.search).get('view') === 'updates',
  )
  const [tab, setTab] = useState('求职动态'),
    [notices, setNotices] = useState<Notice[]>([]),
    [syncError, setSyncError] = useState('')
  const [query, setQuery] = useState(''),
    [hits, setHits] = useState<Hit[]>([]),
    [excerpt, setExcerpt] = useState(''),
    [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState('')
  const [jobId, setJobId] = useState('')
  const job = jobs.find((j) => j.id === jobId) || jobs[0]
  useEffect(() => {
    if (!open || tab !== '求职动态') return
    let active = true,
      loading = false
    async function refresh() {
      if (loading) return
      loading = true
      try {
        const d = await api<{ items: Notice[] }>('notices')
        if (active) {
          setNotices(d.items)
          setSyncError('')
        }
      } catch (e) {
        if (active) setSyncError((e as Error).message)
      } finally {
        loading = false
      }
    }
    void refresh()
    const timer = setInterval(refresh, 15000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [open, tab])
  async function run(f: () => Promise<void>) {
    setBusy(true)
    setFeedback('')
    try {
      await f()
    } catch (e) {
      setFeedback((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  function summarize(text: string) {
    setExcerpt(text.slice(0, 6000))
    setAnswer('')
    setFeedback('')
    setTab('解读')
  }
  return (
    <>
      <button
        className="primary assistant-launch"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <Sparkles />
        求职助理
      </button>
      {open && (
        <Dialog
          title="DeepSeek 求职助理"
          onClose={() => setOpen(false)}
          confirmDiscard={false}
          className="status-assistant"
        >
          <nav className="assistant-tabs">
            {['求职动态', '公开搜索', '解读', '手机'].map((t) => (
              <button
                key={t}
                disabled={busy}
                aria-pressed={t === tab}
                onClick={() => {
                  setTab(t)
                  setFeedback('')
                }}
              >
                {t}
              </button>
            ))}
          </nav>
          {tab === '求职动态' && (
            <section className="assistant-pane">
              <h3>我的岗位进度</h3>
              {job ? (
                <>
                  <label>
                    查看岗位
                    <select
                      value={job.id}
                      onChange={(e) => setJobId(e.target.value)}
                    >
                      {jobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.company || '公司待确认'} ·{' '}
                          {j.title || '岗位待确认'}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p>
                    <strong>{job.status}</strong> ·{' '}
                    {job.platform || '来源待确认'} · {stamp(job.updated)}
                  </p>
                  {job.history.slice(0, 3).map((h, i) => (
                    <p key={i}>
                      {stamp(h.time)} · {h.text}（{h.source}）
                    </p>
                  ))}
                  <button
                    className="text-btn"
                    onClick={() =>
                      summarize(
                        [
                          job.company,
                          job.title,
                          job.status,
                          ...job.history
                            .slice(0, 3)
                            .map((h) => h.time + ' ' + h.source + ' ' + h.text),
                        ].join('\n'),
                      )
                    }
                  >
                    用 DeepSeek 解读记录
                  </button>
                </>
              ) : (
                <p>添加岗位后，可在这里查看本机记录的进度。</p>
              )}
              <h3>收到的消息</h3>
              {syncError && <p role="alert">{syncError}</p>}
              {notices.length
                ? notices.map((n) => {
                    const suggestion = suggestedUpdate(jobs, n)
                    const recorded = jobs.some((j) =>
                      j.history.some((h) => h.noticeId === n.id),
                    )
                    return (
                      <article key={n.id}>
                        <small>
                          {n.platform} · {stamp(n.received)} · 快捷指令导入
                        </small>
                        <p>{n.body}</p>
                        {recorded ? (
                          <p>已记入岗位历史</p>
                        ) : suggestion ? (
                          <>
                            <p>
                              {suggestion.job.company} · {suggestion.job.title}
                              ：{suggestion.job.status} → {suggestion.status}
                            </p>
                            <button
                              className="outline"
                              disabled={busy}
                              onClick={() =>
                                run(() =>
                                  onRecord(suggestion.job, {
                                    noticeId: n.id,
                                    time: now(),
                                    status: suggestion.status,
                                    source:
                                      n.platform + ' · 快捷指令（本人确认）',
                                    text: n.body,
                                  }),
                                )
                              }
                            >
                              确认记录此进度
                            </button>
                          </>
                        ) : (
                          <small>岗位或进度待确认</small>
                        )}
                        <button
                          className="text-btn"
                          onClick={() => summarize(n.platform + '\n' + n.body)}
                        >
                          解读这条消息
                        </button>
                      </article>
                    )
                  })
                : !syncError && (
                    <p>尚无导入消息。在「手机」中配置来源和推送。</p>
                  )}
              <small>
                本机关联来源：{platforms.join('、') || '暂无'}
                。招聘平台站内进度未自动同步。
              </small>
            </section>
          )}
          {tab === '公开搜索' && (
            <section className="assistant-pane">
              <label>
                发送给博查的搜索词
                <input
                  maxLength={200}
                  value={query}
                  disabled={busy}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setHits([])
                    setFeedback('')
                  }}
                  placeholder="公司、岗位或公开招聘公告"
                />
              </label>
              <button
                disabled={busy || !query.trim()}
                className="primary"
                onClick={() =>
                  run(async () => {
                    setHits([])
                    const d = await api<{ items: Hit[] }>('search', 'POST', {
                      query,
                      confirmed: true,
                    })
                    setHits(d.items)
                    if (!d.items.length) setFeedback('没有找到公开网页')
                  })
                }
              >
                {busy ? '搜索中…' : '确认联网搜索'}
              </button>
              {hits.map((h, i) => (
                <article key={i}>
                  <a href={h.url} target="_blank" rel="noreferrer">
                    {h.title}
                  </a>
                  <p>{h.snippet}</p>
                </article>
              ))}
              {hits.length > 0 && (
                <button
                  className="outline"
                  onClick={() =>
                    summarize(
                      '公开网页搜索结果：\n' +
                        hits
                          .map((h) => h.title + '\n' + h.url + '\n' + h.snippet)
                          .join('\n\n'),
                    )
                  }
                >
                  交给 DeepSeek 整理
                </button>
              )}
            </section>
          )}
          {tab === '解读' && (
            <section className="assistant-pane">
              <label>
                发送给 DeepSeek 的摘录
                <textarea
                  maxLength={6000}
                  rows={6}
                  value={excerpt}
                  disabled={busy}
                  onChange={(e) => {
                    setExcerpt(e.target.value)
                    setAnswer('')
                  }}
                />
              </label>
              <button
                className="primary"
                disabled={busy || !excerpt.trim()}
                onClick={() =>
                  run(async () => {
                    setAnswer('')
                    const d = await api<{ draft: string }>(
                      'assistant',
                      'POST',
                      { task: 'status', excerpt, confirmed: true },
                    )
                    setAnswer(d.draft)
                  })
                }
              >
                {busy ? '解读中…' : '确认发送并解读'}
              </button>
              {answer && <p>{answer}</p>}
            </section>
          )}
          {tab === '手机' && <DevicePanel />}
          {feedback && (
            <p role="status" className="assistant-pane">
              {feedback}
            </p>
          )}
        </Dialog>
      )}
    </>
  )
}
