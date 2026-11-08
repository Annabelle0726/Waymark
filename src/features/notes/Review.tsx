import { Plus, Trash2, ChevronRight } from 'lucide-react'
import { uid } from '../../domain/workspace'
import { type ReviewGroup } from '../../domain/preparation'

export default function Review({
  groups,
  onChange,
  disabled,
}: {
  groups: ReviewGroup[]
  onChange: (groups: ReviewGroup[]) => void
  disabled: boolean
}) {
  function change(id: string, patch: Partial<ReviewGroup>) {
    onChange(groups.map((g) => (g.id === id ? { ...g, ...patch } : g)))
  }
  return (
    <section className="review-section" aria-label="重点复习">
      <div className="preparation-heading">
        <h3>重点复习</h3>
        <button
          className="outline"
          disabled={disabled}
          onClick={() =>
            onChange([
              ...groups,
              { id: uid(), title: '新复习分组', questions: [] },
            ])
          }
        >
          <Plus />
          添加分组
        </button>
      </div>
      {groups.length === 0 && (
        <p className="review-empty">
          按技术、业务或项目建立分组，再添加需要重点复习的问题。
        </p>
      )}
      {groups.map((group) => (
        <details key={group.id} className="review-group">
          <summary>
            <ChevronRight />
            {group.title || '未命名分组'}
            <span>{group.questions.length} 个问题</span>
          </summary>
          <div className="review-group-body">
            <div className="preparation-row">
              <label>
                分组名称
                <input
                  disabled={disabled}
                  value={group.title}
                  onChange={(e) => change(group.id, { title: e.target.value })}
                />
              </label>
              <button
                className="icon-btn"
                disabled={disabled}
                aria-label={'删除分组 ' + group.title}
                onClick={() => {
                  if (confirm('删除这个分组及其中所有问题？'))
                    onChange(groups.filter((g) => g.id !== group.id))
                }}
              >
                <Trash2 />
              </button>
            </div>
            {group.questions.map((q) => (
              <details key={q.id} className="review-question">
                <summary>
                  <ChevronRight />
                  {q.title || '未命名问题'}
                </summary>
                <div className="review-answer">
                  <div className="preparation-row">
                    <label>
                      问题标题
                      <input
                        disabled={disabled}
                        value={q.title}
                        onChange={(e) =>
                          change(group.id, {
                            questions: group.questions.map((x) =>
                              x.id === q.id
                                ? { ...x, title: e.target.value }
                                : x,
                            ),
                          })
                        }
                      />
                    </label>
                    <button
                      className="icon-btn"
                      disabled={disabled}
                      aria-label={'删除问题 ' + q.title}
                      onClick={() => {
                        if (confirm('删除这个复习问题？'))
                          change(group.id, {
                            questions: group.questions.filter(
                              (x) => x.id !== q.id,
                            ),
                          })
                      }}
                    >
                      <Trash2 />
                    </button>
                  </div>
                  <label>
                    复习答案
                    <textarea
                      disabled={disabled}
                      rows={5}
                      value={q.answer}
                      onChange={(e) =>
                        change(group.id, {
                          questions: group.questions.map((x) =>
                            x.id === q.id
                              ? { ...x, answer: e.target.value }
                              : x,
                          ),
                        })
                      }
                      placeholder="整理关键知识点、自己的回答和需要再次练习的内容…"
                    />
                  </label>
                </div>
              </details>
            ))}
            <button
              className="text-btn"
              disabled={disabled}
              onClick={() =>
                change(group.id, {
                  questions: [
                    ...group.questions,
                    { id: uid(), title: '新复习问题', answer: '' },
                  ],
                })
              }
            >
              <Plus />
              添加问题
            </button>
          </div>
        </details>
      ))}
    </section>
  )
}
