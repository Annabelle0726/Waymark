import { useRef, useState } from 'react'
import { ChevronRight, Plus, Expand } from 'lucide-react'
import { uid } from '../../domain/workspace'
import { type ReviewGroup, type ReviewQuestion } from '../../domain/preparation'
import { DocumentMenu, GrowingText, InlineTitle } from './DocumentControls'
export default function Review({
  groups,
  onChange,
  preview,
  saving,
  savedQuestions,
  onSaveQuestion,
  onFocusQuestion,
  onDelete,
}: {
  groups: ReviewGroup[]
  onChange: (groups: ReviewGroup[]) => void
  preview: boolean
  saving: boolean
  savedQuestions: Map<string, string>
  onSaveQuestion: (id: string) => void
  onFocusQuestion: (id: string) => void
  onDelete: (
    title: string,
    size: number,
    remove: () => void,
    restore: () => void,
  ) => void
}) {
  const latest = useRef(groups)
  latest.current = groups
  const [opened, setOpened] = useState<string[]>([]),
    [questions, setQuestions] = useState<string[]>([])
  const [menu, setMenu] = useState(''),
    [focus, setFocus] = useState('')
  function change(id: string, patch: Partial<ReviewGroup>) {
    onChange(groups.map((g) => (g.id === id ? { ...g, ...patch } : g)))
  }
  function toggle(id: string, items: string[], set: (v: string[]) => void) {
    set(items.includes(id) ? items.filter((x) => x !== id) : [...items, id])
  }
  function addQuestion(group: ReviewGroup) {
    const q = { id: uid(), title: '', answer: '' }
    change(group.id, { questions: [...group.questions, q] })
    setQuestions((x) => [...x, q.id])
    setFocus(q.id)
  }
  function updateQuestion(
    group: ReviewGroup,
    q: ReviewQuestion,
    patch: Partial<ReviewQuestion>,
  ) {
    change(group.id, {
      questions: group.questions.map((x) =>
        x.id === q.id ? { ...x, ...patch } : x,
      ),
    })
  }
  return (
    <section className="document-review" aria-label="重点复习">
      <div className="document-section-heading">
        <h3>重点复习</h3>
        {!preview && (
          <button
            className="text-btn"
            onClick={() => {
              const g = { id: uid(), title: '', questions: [] }
              onChange([...groups, g])
              setOpened((x) => [...x, g.id])
              setFocus(g.id)
            }}
          >
            <Plus />
            添加分组
          </button>
        )}
      </div>
      {!groups.length && (
        <p className="document-placeholder">
          按技术、业务或项目分组，收拢需要反复练习的问题。
        </p>
      )}
      {groups.map((g, index) => (
        <div className="document-group" key={g.id}>
          <div className="document-group-row">
            <button
              aria-label={
                (opened.includes(g.id) ? '折叠' : '展开') +
                '分组 ' +
                (g.title || '未命名')
              }
              aria-expanded={opened.includes(g.id)}
              onClick={() => toggle(g.id, opened, setOpened)}
            >
              <ChevronRight
                className={opened.includes(g.id) ? 'rotated' : ''}
              />
            </button>
            {preview ? (
              <h4>{g.title || '未命名分组'}</h4>
            ) : (
              <InlineTitle
                value={g.title}
                label="复习分组名称"
                focus={focus === g.id}
                onChange={(title) => change(g.id, { title })}
              />
            )}
            <span className="document-secondary">
              {g.questions.length} 个问题
            </span>
            {!preview && (
              <DocumentMenu
                label={'分组操作 ' + (g.title || '未命名')}
                open={menu === g.id}
                onOpen={() => setMenu(g.id)}
                onClose={() => setMenu('')}
                actions={[
                  {
                    label: '重命名',
                    run: () => {
                      setFocus('')
                      requestAnimationFrame(() => setFocus(g.id))
                    },
                  },
                  {
                    label: '删除分组',
                    run: () =>
                      onDelete(
                        '分组',
                        g.questions.reduce((n, q) => n + q.answer.length, 0),
                        () => onChange(groups.filter((x) => x.id !== g.id)),
                        () => {
                          const current = latest.current
                          onChange([
                            ...current.slice(0, index),
                            g,
                            ...current.slice(index),
                          ])
                        },
                      ),
                  },
                ]}
              />
            )}
          </div>
          {opened.includes(g.id) && (
            <div className="document-questions">
              {g.questions.map((q) => (
                <div key={q.id} className="document-question">
                  <div className="document-question-row">
                    <button
                      aria-label={
                        (questions.includes(q.id) ? '折叠' : '展开') +
                        '问题 ' +
                        (q.title || '未命名')
                      }
                      aria-expanded={questions.includes(q.id)}
                      onClick={() => toggle(q.id, questions, setQuestions)}
                    >
                      <ChevronRight
                        className={questions.includes(q.id) ? 'rotated' : ''}
                      />
                    </button>
                    {preview ? (
                      <h4>{q.title || '未命名问题'}</h4>
                    ) : (
                      <div
                        className="question-name"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addQuestion(g)
                          }
                        }}
                      >
                        <InlineTitle
                          value={q.title}
                          label="复习问题标题"
                          focus={focus === q.id}
                          onChange={(title) => updateQuestion(g, q, { title })}
                        />
                      </div>
                    )}
                    {!preview && (
                      <DocumentMenu
                        label={'问题操作 ' + (q.title || '未命名')}
                        open={menu === q.id}
                        onOpen={() => setMenu(q.id)}
                        onClose={() => setMenu('')}
                        actions={[
                          {
                            label: '重命名',
                            run: () => {
                              setFocus('')
                              requestAnimationFrame(() => setFocus(q.id))
                            },
                          },
                          {
                            label: '删除问题',
                            run: () =>
                              onDelete(
                                '问题',
                                q.answer.length,
                                () =>
                                  change(g.id, {
                                    questions: g.questions.filter(
                                      (x) => x.id !== q.id,
                                    ),
                                  }),
                                () => {
                                  const current = latest.current
                                  onChange(
                                    current.map((x) =>
                                      x.id === g.id
                                        ? {
                                            ...x,
                                            questions: [...x.questions, q],
                                          }
                                        : x,
                                    ),
                                  )
                                },
                              ),
                          },
                        ]}
                      />
                    )}
                  </div>
                  {questions.includes(q.id) && (
                    <div className="document-answer">
                      {preview ? (
                        <div className="document-reading">
                          {q.answer || '尚未填写答案'}
                        </div>
                      ) : (
                        <>
                          <GrowingText
                            data-question={q.id}
                            aria-label={'复习答案 ' + (q.title || '未命名')}
                            value={q.answer}
                            placeholder="记录自己的回答、关键知识点和需要再次练习的内容…"
                            onChange={(e) =>
                              updateQuestion(g, q, { answer: e.target.value })
                            }
                          />
                          <div className="document-question-actions">
                            <span className="document-secondary">
                              {savedQuestions.get(q.id) === JSON.stringify(q)
                                ? '已保存'
                                : '未保存'}
                            </span>
                            <button
                              className="text-btn"
                              onClick={() => onFocusQuestion(q.id)}
                            >
                              <Expand />
                              放大编辑
                            </button>
                            <button
                              className={
                                savedQuestions.get(q.id) === JSON.stringify(q)
                                  ? 'text-btn'
                                  : 'primary'
                              }
                              disabled={
                                saving ||
                                savedQuestions.get(q.id) === JSON.stringify(q)
                              }
                              onClick={() => onSaveQuestion(q.id)}
                            >
                              保存问题
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {!preview && (
                <button
                  className="text-btn document-add-question"
                  onClick={() => addQuestion(g)}
                >
                  <Plus />
                  添加问题
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </section>
  )
}
