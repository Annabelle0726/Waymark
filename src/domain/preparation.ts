export type PreparationSection = { id: string; title: string; content: string }
export type ReviewQuestion = { id: string; title: string; answer: string }
export type ReviewGroup = {
  id: string
  title: string
  questions: ReviewQuestion[]
}
export type Preparation = {
  format: 'waymark-preparation-v1'
  sections: PreparationSection[]
  reviews: ReviewGroup[]
}
export function readPreparation(value: string): Preparation {
  try {
    const parsed = JSON.parse(value)
    const text = (v: unknown) => typeof v === 'string'
    const section = (s: PreparationSection) =>
      s && text(s.id) && text(s.title) && text(s.content)
    const question = (q: ReviewQuestion) =>
      q && text(q.id) && text(q.title) && text(q.answer)
    if (
      parsed.format === 'waymark-preparation-v1' &&
      Array.isArray(parsed.sections) &&
      parsed.sections.every(section) &&
      Array.isArray(parsed.reviews) &&
      parsed.reviews.every(
        (g: ReviewGroup) =>
          g &&
          text(g.id) &&
          text(g.title) &&
          Array.isArray(g.questions) &&
          g.questions.every(question),
      )
    )
      return parsed
  } catch {
    /* Existing plain-text notes remain editable in their own section. */
  }
  return {
    format: 'waymark-preparation-v1',
    sections: [
      { id: 'intro', title: '自我介绍', content: '' },
      ...(value ? [{ id: 'legacy', title: '原有笔记', content: value }] : []),
    ],
    reviews: [],
  }
}
export const writePreparation = (data: Preparation) => JSON.stringify(data)
