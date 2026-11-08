import { useState, type FormEvent } from 'react'
import { Pencil, ShieldCheck, LogOut } from 'lucide-react'
import { Dialog, Form } from '../../components/forms/Forms'
import { api } from '../../services/api'
import type { User } from '../../domain/workspace'

type Props = {
  user: User
  onUser: (user: User) => void
  onLogout: () => Promise<void>
  onDeleted: () => void
}

export default function Settings({ user, onUser, onLogout, onDeleted }: Props) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user.name)
  const [saving, setSaving] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [password, setPassword] = useState('')

  function cancelEdit() {
    setName(user.name)
    setEditing(false)
    setError('')
  }

  async function saveName(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    const next = name.trim()
    if (!next) {
      setError('昵称不能为空')
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await api<{ user: User }>('account', 'PATCH', {
        name: next,
      })
      onUser(result.user)
      setEditing(false)
      setMessage('昵称已保存')
    } catch (failure) {
      setError((failure as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function logout() {
    if (leaving || saving) return
    setLeaving(true)
    setError('')
    try {
      await onLogout()
    } catch (failure) {
      setError((failure as Error).message)
    } finally {
      setLeaving(false)
    }
  }

  return (
    <div className="settings-page">
      <section
        className="settings-profile"
        aria-labelledby="settings-profile-title"
      >
        <h2 id="settings-profile-title">个人信息</h2>
        <dl className="settings-info">
          <div className="settings-info-row">
            <dt>昵称</dt>
            <dd>
              {editing ? (
                <form
                  className="settings-name-editor"
                  aria-label="编辑昵称"
                  aria-busy={saving}
                  onSubmit={saveName}
                >
                  <input
                    id="settings-name"
                    aria-label="昵称"
                    autoFocus
                    required
                    maxLength={50}
                    autoComplete="nickname"
                    disabled={saving}
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value)
                      setError('')
                    }}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'settings-name-error' : undefined}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape' && !saving) {
                        event.preventDefault()
                        cancelEdit()
                      }
                    }}
                  />
                  <div className="settings-edit-actions">
                    <button
                      className="primary"
                      disabled={saving || name.trim() === user.name}
                      type="submit"
                    >
                      {saving ? '保存中…' : '保存'}
                    </button>
                    <button
                      className="outline"
                      disabled={saving}
                      type="button"
                      onClick={cancelEdit}
                    >
                      取消
                    </button>
                  </div>
                </form>
              ) : (
                <div className="settings-name-value">
                  <span>{user.name}</span>
                  <button
                    className="icon-btn"
                    aria-label="编辑昵称"
                    title="编辑昵称"
                    onClick={() => {
                      setName(user.name)
                      setEditing(true)
                      setError('')
                      setMessage('')
                    }}
                  >
                    <Pencil />
                  </button>
                </div>
              )}
            </dd>
          </div>
          <div className="settings-info-row">
            <dt>手机号</dt>
            <dd>{user.phone}（未验证）</dd>
          </div>
          <div className="settings-info-row">
            <dt>关联来源</dt>
            <dd>{user.platforms.join('、') || '尚未关联，可在添加岗位时关联'}</dd>
          </div>
          {user.email && <div className="settings-info-row"><dt>邮箱</dt><dd>{user.email}</dd></div>}
        </dl>
        {error && (
          <p
            id="settings-name-error"
            className="settings-feedback danger-text"
            role="alert"
          >
            {error}
          </p>
        )}
        {message && !error && (
          <p className="settings-feedback" role="status">
            {message}
          </p>
        )}
        <button
          className="outline settings-logout"
          disabled={leaving || saving}
          onClick={logout}
        >
          <LogOut />
          {leaving ? '正在退出…' : '退出登录'}
        </button>
      </section>
      <p className="settings-privacy">
        <ShieldCheck />
        <span>
          数据保存在本机
          SQLite，面试准备由本人编辑并保存在本机。岗位截图在本机识别，招聘平台尚未接入。
        </span>
      </p>
      <section
        className="settings-danger"
        aria-labelledby="settings-danger-title"
      >
        <h2 id="settings-danger-title">危险操作</h2>
        <p>删除后，岗位、笔记和上传文件将无法恢复。</p>
        <button
          className="danger-text settings-delete"
          disabled={saving || leaving}
          onClick={() => {
            setPassword('')
            setConfirmDelete(true)
          }}
        >
          删除账号与数据
        </button>
      </section>
      {confirmDelete && (
        <Dialog
          title="确认删除账号与数据"
          className="settings-delete-dialog"
          confirmDiscard={false}
          onClose={() => setConfirmDelete(false)}
        >
          <Form
            className="settings-delete-form"
            label="永久删除账号"
            onCancel={() => setConfirmDelete(false)}
            submit={async () => {
              await api('account', 'DELETE', { password })
              setPassword('')
              onDeleted()
            }}
          >
            <p>
              此操作会永久删除账号下的所有岗位、笔记和上传文件，且不可恢复。请输入当前密码确认。
            </p>
            <label>
              当前密码
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          </Form>
        </Dialog>
      )}
    </div>
  )
}
