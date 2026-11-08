import type { Job, Status } from './workspace'

export type Notice = {
  id: number
  platform: string
  body: string
  received: string
}

// A source label alone cannot identify a position or its application stage.
export function suggestedUpdate(jobs: Job[], notice: Notice) {
  const body = notice.body.toLowerCase()
  const matches = jobs.filter(
    (job) =>
      job.platform === notice.platform &&
      job.company.trim() &&
      job.title.trim() &&
      body.includes(job.company.trim().toLowerCase()) &&
      body.includes(job.title.trim().toLowerCase()),
  )
  if (matches.length !== 1 || /[？?]|尚未|暂未|取消|撤回|如果|若您/.test(body))
    return
  const rules: [RegExp, Status][] = [
    [/面试邀请|邀请您参加.{0,10}面试/, '面试中'],
    [/已向您发出录用通知|恭喜您被录用/, '已获录用'],
    [/很遗憾.{0,12}未能通过|本次申请未通过/, '已结束'],
    [/投递成功|已收到您的简历/, '已投递'],
  ]
  const stages = rules.filter(([pattern]) => pattern.test(body))
  if (stages.length === 1) return { job: matches[0], status: stages[0][1] }
}
