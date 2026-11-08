import {
  Pencil,
  CirclePlus,
  MapPin,
  Building2,
  Coins,
  Monitor,
  Clock3,
  FileText,
  History,
  SquareArrowOutUpRight,
  ChevronRight,
  NotebookText,
  Layers3,
} from 'lucide-react'
import {
  fields,
  fieldKeys,
  stamp,
  tags,
  type Job,
} from '../../domain/workspace'
export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={
        'status-pill s' +
        ({ 面试中: ' interview', 已投递: ' sent', 已获录用: ' offer' }[
          status
        ] || '')
      }
    >
      <i />
      {status}
    </span>
  )
}
export default function JobDetail({
  job,
  source,
  history,
  edit,
  update,
}: {
  job: Job
  source: () => void
  edit: () => void
  update: () => void
  history: () => void
}) {
  const missing = fieldKeys.filter((k) => !job[k]?.trim()).map((k) => fields[k])
  if (job.status === '待确认')
    missing.push('投递状态' as (typeof missing)[number])
  return (
    <>
      <section className="position-header" aria-label="岗位概览">
        <div className="position-top">
          <div className="position-company"><Building2 aria-hidden="true" /><span>{job.company || '公司待确认'}</span></div>
          <div className="position-actions">
            <button type="button" className="outline" onClick={edit} aria-label="编辑岗位" title="编辑岗位"><Pencil aria-hidden="true" /><span>编辑岗位</span></button>
            <button type="button" className="primary" onClick={update} aria-label="记录更新" title="记录更新"><CirclePlus aria-hidden="true" /><span>记录更新</span></button>
          </div>
        </div>
        <div className="position-heading">
          <h1>{job.title || '岗位待确认'}</h1>
          <div className="position-summary">
            <span className="position-salary"><Coins aria-hidden="true" /><span>薪资</span><strong>{job.salary || '待确认'}</strong></span>
            <StatusPill status={job.status} />
          </div>
        </div>
        <div className="position-metadata">
          <span><MapPin aria-hidden="true" /><span>{job.location || '地点待确认'}</span></span>
          <span><Monitor aria-hidden="true" /><span>远程要求 <b>{job.remote || '待确认'}</b></span></span>
          <span><Clock3 aria-hidden="true" /><span><span className="position-updated-label">更新于 </span><time dateTime={job.updated}>{stamp(job.updated)}</time></span></span>
          <span><Layers3 aria-hidden="true" /><span>来源 <b>{job.platform || '待确认'}</b></span></span>
        </div>
      </section>
      <div className="detail-grid">
        <section className="card requirements">
          <header className="card-head">
            <h2>
              <span className="section-icon">
                <FileText />
              </span>
              岗位信息
            </h2>
            <button className="text-btn" onClick={source}>
              查看来源
              <SquareArrowOutUpRight />
            </button>
          </header>
          <div className="card-body">
            <h3>岗位描述</h3>
            <p className="description">{job.description || '待确认'}</p>
            <div className="skill-row">
              <h3>必备技能</h3>
              <div className="tags">
                {tags(job.skills || '待确认').map((s, i) => (
                  <span key={i}>{s}</span>
                ))}
              </div>
            </div>
            <div className="skill-row bonus">
              <h3>加分项</h3>
              <div className="tags">
                {tags(job.bonus || '待确认').map((s, i) => (
                  <span key={i}>{s}</span>
                ))}
              </div>
            </div>
            {job.supplement && (
              <>
                <h3>用户补充</h3>
                <p className="description">{job.supplement}</p>
              </>
            )}
          </div>
          <button className="source-foot" onClick={source}>
            <span>
              <Layers3 />
              {job.platform || '平台待确认'}
            </span>
            <span className="pending">
              {missing.length ? missing.length + ' 项待确认' : '已填全字段'}
              <ChevronRight />
            </span>
          </button>
        </section>
        <section className="card activity">
          <header className="card-head">
            <h2>
              <span className="section-icon">
                <History />
              </span>
              进度记录
            </h2>
            <button className="text-btn" onClick={history}>
              全部
              <ChevronRight />
            </button>
          </header>
          <div className="timeline">
            {job.history.slice(0, 3).map((h, i) => (
              <div key={i} className={'event ' + (!i ? 'latest' : '')}>
                <i />
                <div>
                  <strong>{h.text}</strong>
                  <small>
                    {stamp(h.time)}
                    <b>·</b>
                    {h.source}
                  </small>
                </div>
              </div>
            ))}
            {job.history.length === 0 && (
              <p>
                <NotebookText /> 尚无进度记录
              </p>
            )}
          </div>
        </section>
      </div>
    </>
  )
}
