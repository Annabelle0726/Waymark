import { useState } from 'react'
import {
  Eye,
  EyeOff,
  Mail,
  LockKeyhole,
  UserRound,
} from 'lucide-react'
import { type User } from '../../domain/workspace'
import { api } from '../../services/api'
import { Form } from '../../components/forms/Forms'

export function Auth({
  onUser,
}: {
  onUser: (u: User) => Promise<void>
}) {
  const [register, setRegister] = useState(false),
    [visible, setVisible] = useState(false)
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [name, setName] = useState('')
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand">
          <img src="/brand/mark.svg" alt="" />
          Waymark
        </div>
        <h1>{register ? '创建账号' : '欢迎回来'}</h1>
        <p className="auth-tagline">整理机会，准备下一步</p>
        <Form
          key={String(register)}
          label={register ? '注册并进入工作空间' : '登录'}
          submit={async () => {
            if (register && confirm !== password)
              throw new Error('两次输入的密码不一致')
            const r = await api<{ user: User }>(
              'auth/' + (register ? 'register' : 'login'),
              'POST',
              { name, email, password },
            )
            await onUser(r.user)
          }}
        >
          {register && (
            <label>
              <UserRound size={15} /> 昵称
              <input
                required
                maxLength={50}
                autoComplete="nickname"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          )}
          <label>
            <Mail size={15} /> 邮箱
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </label>
          <label>
            <LockKeyhole size={15} /> 密码
            <div className="password">
              <input
                required
                minLength={8}
                maxLength={256}
                type={visible ? 'text' : 'password'}
                autoComplete={register ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 8 位字符"
              />
              <button
                aria-label={visible ? '隐藏密码' : '显示密码'}
                className="icon-btn"
                type="button"
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
          {register && (
            <label>
              确认密码
              <input
                required
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
          )}
        </Form>
        <div className="auth-links">
          <button
            onClick={() => {
              setRegister(!register)
              setPassword('')
              setConfirm('')
            }}
          >
            {register ? '已有账号？登录' : '还没有账号？注册'}
          </button>
        </div>
      </section>
    </main>
  )
}
