import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  Eye,
  EyeOff,
  Mail,
  LockKeyhole,
  UserRound,
  BriefcaseBusiness,
  FolderOpen,
  CalendarDays,
} from 'lucide-react'
import { type User } from '../../domain/workspace'
import { api } from '../../services/api'
import { Form } from '../../components/forms/Forms'
import { AuthBackdrop } from './AuthBackdrop'

export function Auth({ onUser }: { onUser: (u: User) => Promise<void> }) {
  const page = useRef<HTMLElement>(null)
  const card = useRef<HTMLElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const [sized, setSized] = useState(false)
  useLayoutEffect(() => {
    const panel = card.current
    const inner = content.current
    if (!panel || !inner) return
    const resize = () => {
      panel.style.height = inner.getBoundingClientRect().height + 2 + 'px'
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(inner)
    const frame = requestAnimationFrame(() => setSized(true))
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const resize = () => {
      page.current?.style.setProperty('--auth-height', viewport.height + 'px')
      const active = document.activeElement
      if (
        active instanceof HTMLInputElement &&
        viewport.height < window.innerHeight * 0.8
      ) {
        active.scrollIntoView({ block: 'nearest' })
      }
    }
    viewport.addEventListener('resize', resize)
    return () => viewport.removeEventListener('resize', resize)
  }, [])
  const [register, setRegister] = useState(false)
  const [visible, setVisible] = useState(false)
  const [confirmVisible, setConfirmVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [name, setName] = useState('')

  useEffect(() => {
    const firstEmpty = Array.from(
      content.current?.querySelectorAll<HTMLInputElement>('input') || [],
    ).find((input) => !input.value)
    firstEmpty?.focus({ preventScroll: true })
  }, [register])

  function switchMode(next: boolean) {
    if (submitting || register === next) return
    setRegister(next)
    setPassword('')
    setConfirm('')
    setVisible(false)
    setConfirmVisible(false)
  }

  return (
    <main ref={page} className="auth-page">
      <AuthBackdrop />
      <img
        className="auth-landscape"
        src="/brand/mountain-sea.svg"
        alt=""
        aria-hidden="true"
      />
      <div className="auth-frame">
        <header className="auth-header">
          <a className="auth-brand" href="/" aria-label="Waymark 首页">
            <img src="/brand/mark.svg" alt="" />
            <span>Waymark</span>
          </a>
          <span className="auth-private">
            <LockKeyhole size={16} />
            本机私人空间
          </span>
        </header>
        <div className="auth-layout">
          <section className="auth-intro" aria-label="Waymark 求职工作空间">
            <div className="auth-message">
              <h1>
                <span>求职进展，</span>
                <span>一目了然。</span>
              </h1>
              <p>收拢岗位信息，跟进每一次投递。</p>
            </div>
            <ul className="auth-features">
              <li>
                <BriefcaseBusiness />
                岗位管理
              </li>
              <li>
                <FolderOpen />
                资料归档
              </li>
              <li>
                <CalendarDays />
                面试准备
              </li>
            </ul>
          </section>
          <section
            ref={card}
            className={[
              'auth-card',
              register ? 'is-register' : '',
              sized ? 'is-ready' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-labelledby="auth-title"
          >
            <div ref={content} className="auth-card-content">
              <nav className="auth-tabs" aria-label="账号入口">
                <button
                  type="button"
                  aria-current={!register ? 'page' : undefined}
                  disabled={submitting}
                  onClick={() => switchMode(false)}
                >
                  登录
                </button>
                <button
                  type="button"
                  aria-current={register ? 'page' : undefined}
                  disabled={submitting}
                  onClick={() => switchMode(true)}
                >
                  注册
                </button>
              </nav>
              <div className="auth-form-heading">
                <h2 id="auth-title">{register ? '创建账号' : '欢迎回来'}</h2>
                <p>
                  {register ? '开始整理你的求职旅程' : '登录你的求职工作空间'}
                </p>
              </div>
              <Form
                key={String(register)}
                label={register ? '注册并进入工作空间' : '登录'}
                submit={async () => {
                  if (register && confirm !== password)
                    throw new Error('两次输入的密码不一致')
                  setSubmitting(true)
                  try {
                    const r = await api<{ user: User }>(
                      'auth/' + (register ? 'register' : 'login'),
                      'POST',
                      { name, email, password },
                    )
                    await onUser(r.user)
                  } finally {
                    setSubmitting(false)
                  }
                }}
              >
                {register && (
                  <label htmlFor="auth-name">
                    昵称
                    <div className="auth-input">
                      <UserRound />
                      <input
                        id="auth-name"
                        required
                        maxLength={50}
                        autoComplete="nickname"
                        placeholder="输入昵称"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  </label>
                )}
                <label htmlFor="auth-email">
                  邮箱
                  <div className="auth-input">
                    <Mail />
                    <input
                      id="auth-email"
                      required
                      type="email"
                      inputMode="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      autoComplete="email"
                      placeholder="请输入邮箱地址"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </label>
                <label htmlFor="auth-password">
                  密码
                  <div className="auth-input">
                    <LockKeyhole />
                    <input
                      id="auth-password"
                      required
                      minLength={8}
                      maxLength={256}
                      type={visible ? 'text' : 'password'}
                      autoComplete={
                        register ? 'new-password' : 'current-password'
                      }
                      placeholder={register ? '至少 8 位字符' : '请输入密码'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={visible ? '隐藏密码' : '显示密码'}
                      aria-pressed={visible}
                      onClick={() => setVisible(!visible)}
                    >
                      {visible ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                </label>
                {register && (
                  <label htmlFor="auth-confirm">
                    确认密码
                    <div className="auth-input">
                      <LockKeyhole />
                      <input
                        id="auth-confirm"
                        required
                        type={confirmVisible ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="再次输入密码"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                      />
                      <button
                        type="button"
                        aria-label={
                          confirmVisible ? '隐藏确认密码' : '显示确认密码'
                        }
                        aria-pressed={confirmVisible}
                        onClick={() => setConfirmVisible(!confirmVisible)}
                      >
                        {confirmVisible ? <EyeOff /> : <Eye />}
                      </button>
                    </div>
                  </label>
                )}
              </Form>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
