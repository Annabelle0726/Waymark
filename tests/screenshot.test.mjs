import test from 'node:test'
import assert from 'node:assert/strict'
import * as domain from '../src/domain/workspace.ts'

test('带标签的中文 OCR 可含字间空格，英文技能保留', () => {
  assert.deepEqual(
    domain.extractScreenshot(
      '公 司 ： 虚 构 科 技\n岗 位：前端工程师\n技能：React, TypeScript',
    ),
    { company: '虚构科技', title: '前端工程师', skills: 'React, TypeScript' },
  )
})
test('裁切后仅提取出现的职位和薪资，不推断公司或进度', () => {
  assert.deepEqual(domain.extractScreenshot('前端开发工程师\n18-25K'), {
    title: '前端开发工程师',
    salary: '18-25K',
  })
})
test('空白或含糊的片段没有候选字段', () => {
  for (const text of ['', '希望你对远程协作有经验', '预计下轮联系'])
    assert.deepEqual(domain.extractScreenshot(text), {})
})

test('无冒号的常见职位详情按小标题连续读取，并保留多行要求', () => {
  assert.deepEqual(
    domain.extractScreenshot(
      '工作地点\n上海·浦东\n岗位职责\n维护产品界面\n参与组件设计\n加分项\n自动化测试',
    ),
    {
      location: '上海·浦东',
      description: '维护产品界面\n参与组件设计',
      bonus: '自动化测试',
    },
  )
})

test('第二张图只补空字段，冲突的职位名不能覆盖已确认内容', () => {
  const existing = { ...domain.emptyJob(), title: '前端开发工程师' }
  const result = domain.fillMissingFromScreenshot(
    existing,
    '公司：虚构科技\n岗位：前端实习生',
  )
  assert.equal(result.company, '虚构科技')
  assert.equal(result.title, existing.title)
  assert.equal(existing.company, '')
})
