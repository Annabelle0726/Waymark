export const statuses = [
  '待确认',
  '待投递',
  '已投递',
  '面试中',
  '已获录用',
  '已结束',
] as const
export type Status = (typeof statuses)[number]
export type Update = {
  time: string
  source: string
  status: Status
  text: string
}
export type Job = {
  id: string
  company: string
  title: string
  platform: string
  salary: string
  location: string
  remote: string
  skills: string
  bonus: string
  description: string
  supplement: string
  status: Status
  note: string
  source: string
  original: string
  fileId?: string
  screenshots?: { fileId: string; original: string; time: string }[]
  updated: string
  history: Update[]
}
export type Material = {
  id: string
  fileId: string
  name: string
  category: string
  summary: string
  date: string
}
export type Workspace = { jobs: Job[]; general: string; materials: Material[] }
export type User = { id: string; name: string; email: string }
export type Upload = { id: string; name: string; data: string }
export type Save = (state: Workspace, upload?: Upload) => Promise<void>
export const uid = () => crypto.randomUUID()
export const now = () => new Date().toISOString()
export const stamp = (value: string, full = false) =>
  new Date(value).toLocaleString('zh-CN', {
    ...(full ? { year: 'numeric' as const } : {}),
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
export const emptyJob = (): Job => ({
  id: uid(),
  company: '',
  title: '',
  platform: '',
  salary: '',
  location: '',
  remote: '',
  skills: '',
  bonus: '',
  description: '',
  supplement: '',
  status: '待确认',
  note: '',
  source: '手动填写',
  original: '',
  updated: now(),
  history: [],
})
export const fields = {
  company: '公司名称',
  title: '岗位名称',
  platform: '招聘平台',
  salary: '薪资范围',
  location: '工作地点',
  remote: '远程要求',
  skills: '必备技能',
  bonus: '加分项',
  description: '岗位描述',
} as const
export type JobField = keyof typeof fields
export const fieldKeys = Object.keys(fields) as JobField[]
const aliases: Record<JobField, string> = {
  company: '公司名称|公司|企业',
  title: '岗位名称|岗位|职位',
  platform: '招聘平台|平台',
  salary: '薪资范围|薪资|工资',
  location: '工作地点|地点|城市',
  remote: '远程要求|远程',
  skills: '必备技能|技能要求|技能',
  bonus: '加分项',
  description: '岗位描述|岗位职责|职责',
}
export function extractText(raw: string): Partial<Record<JobField, string>> {
  const values: Partial<Record<JobField, string>> = {}
  for (const key of fieldKeys) {
    const match = raw.match(
      new RegExp('^(?:' + aliases[key] + ')[ \\t]*[：:][ \\t]*(.+)$', 'm'),
    )
    if (match) values[key] = match[1].trim()
  }
  return values
}
export const tags = (s: string) =>
  s
    .split(/[,，、;；\n]+/)
    .map((x) => x.trim())
    .filter(Boolean)
export function prepareDraft(job: Job | undefined, materials: Material[]) {
  const evidence = materials
    .filter((m) => m.summary.trim())
    .map((m) => '· ' + m.name + '：' + m.summary)
    .join('\n')
  return [
    job ? job.title + ' · 面试提纲' : '通用面试提纲',
    '自我介绍\n待补充：求职方向及与岗位相关的真实经历。',
    '项目经历\n' +
      (evidence
        ? '已填写的资料摘要\n' +
          evidence +
          '\n待补充：个人职责、具体行动与结果。'
        : '待补充：项目背景、个人职责、行动与结果。'),
    '技术与业务问题\n' +
      (job?.skills
        ? tags(job.skills)
            .map((s) => '· 如何在项目中使用 ' + s + '？\n  我的回答：待补充')
            .join('\n')
        : '待补充：根据岗位要求整理问题与回答。'),
    '向面试官提问\n· 团队希望这个岗位优先解决什么问题？',
  ].join('\n\n')
}
export async function readUpload(file: File): Promise<Upload> {
  if (file.size > 10 * 1024 * 1024)
    throw new Error('文件超过 10 MB，请选择较小的文件')
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('无法读取文件，请重新选择'))
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.readAsDataURL(file)
  })
  return { id: uid(), name: file.name, data }
}

export function extractScreenshot(
  raw: string,
): Partial<Record<JobField, string>> {
  const normalized = raw.replace(
    /(?<=[\p{Script=Han}])[ \t]+(?=[\p{Script=Han}])/gu,
    '',
  )
  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const values: Partial<Record<JobField, string>> = {}
  const headers = new Map(
    fieldKeys.flatMap((key) =>
      aliases[key].split('|').map((label) => [label, key] as const),
    ),
  )
  let section: JobField | undefined
  for (const line of lines) {
    const [label, ...rest] = line.split(/[：:]/)
    const key = headers.get(label.trim())
    if (key) {
      const inline = rest.join('：').trim()
      section = key
      if (!inline) continue
      values[key] = inline
    } else if (section) {
      if (/^[^：:]{1,12}[：:]/.test(line)) {
        section = undefined
        continue
      }
      values[section] = [values[section], line].filter(Boolean).join('\n')
    }
    if (
      section !== 'description' &&
      section !== 'skills' &&
      section !== 'bonus'
    )
      section = undefined
  }
  const salary =
    /\b\d+(?:\.\d+)?\s*[-–~至]\s*\d+(?:\.\d+)?\s*[kK万](?:\s*[·×x]\s*\d+薪)?/u
  for (const line of lines) {
    const pay = line.match(salary)?.[0]
    const heading = (pay ? line.replace(pay, '') : line).trim()
    const isTitle =
      /^[\p{Script=Han}A-Za-z0-9 /+#.-]{2,28}(?:工程师|设计师|经理|开发岗|专员|实习生|架构师)$/u.test(
        heading,
      )
    if (!values.title && isTitle) values.title = heading
    if (!values.salary && pay && (line === pay || isTitle)) values.salary = pay
    if (
      !values.company &&
      /^[\p{Script=Han}A-Za-z0-9（）()·]{2,45}(?:有限公司|有限责任公司)$/u.test(
        line,
      )
    )
      values.company = line
  }
  return values
}

export function fillMissingFromScreenshot(base: Job, text: string): Job {
  const result = { ...base }
  const candidates = extractScreenshot(text)
  for (const field of fieldKeys) {
    if (!result[field].trim() && candidates[field])
      result[field] = candidates[field]
  }
  return result
}
