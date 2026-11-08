import {
  BriefcaseBusiness,
  MapPin,
  Building2,
  Coins,
  Monitor,
  CircleDot,
  Clock3,
  FileText,
  History,
  SquareArrowOutUpRight,
  ChevronRight,
  NotebookText,
  Layers3,
} from 'lucide-react'
import { fields, fieldKeys, stamp, tags, type Job } from './model'
import RouteMap from './RouteMap'
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
}: {
  job: Job
  source: () => void
  history: () => void
}) {
  const missing = fieldKeys.filter((k) => !job[k]?.trim()).map((k) => fields[k])
  if (job.status === '待确认')
    missing.push('投递状态' as (typeof missing)[number])
  return (
    <>
      <section className="job-cover">
        <div className="cover-main">
          <RouteMap />
          <div className="cover-copy">
            <div className="cover-eyebrow">
              <BriefcaseBusiness size={14} />
              岗位档案
            </div>
            <h1>{job.title}</h1>
            <div className="cover-meta">
              <span>
                <Building2 />
                {job.company}
              </span>
              <i />
              <span>
                <MapPin />
                {job.location || '待确认'}
              </span>
            </div>
          </div>
        </div>
        <div className="facts">
          <div>
            <span>
              <Coins />
              薪资范围
            </span>
            <strong>{job.salary || '待确认'}</strong>
          </div>
          <div>
            <span>
              <Monitor />
              远程要求
            </span>
            <strong>{job.remote || '待确认'}</strong>
          </div>
          <div>
            <span>
              <CircleDot />
              投递状态
            </span>
            <StatusPill status={job.status} />
          </div>
          <div>
            <span>
              <Clock3 />
              最近更新
            </span>
            <strong>{stamp(job.updated)}</strong>
          </div>
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
