import { useState } from 'react'
import { api } from '../../services/api'

export default function DevicePanel() {
  const [token, setToken] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false)
  async function run(f: () => Promise<void>) {
    setBusy(true)
    setMessage('')
    try {
      await f()
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  async function configure(enable: boolean) {
    if (
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !window.matchMedia('(display-mode: standalone)').matches
    )
      throw new Error(
        '请在 iPhone 上通过 HTTPS 打开 Waymark，添加到主屏幕后从图标启动。',
      )
    if (enable && (await Notification.requestPermission()) !== 'granted')
      throw new Error('系统尚未允许 Waymark 通知')
    await navigator.serviceWorker.register('/notifications.js')
    const registration = await navigator.serviceWorker.ready
    let sub = await registration.pushManager.getSubscription()
    if (enable) {
      const { key } = await api<{ key: string }>('push-key')
      const bytes = Uint8Array.from(
        atob(key.replace(/-/g, '+').replace(/_/g, '/')),
        (c) => c.charCodeAt(0),
      )
      sub =
        sub ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: bytes,
        }))
      await api('push', 'POST', sub.toJSON())
      setMessage('已订阅此设备的 Waymark 求职提醒')
    } else {
      if (sub) {
        await api('push', 'DELETE', { endpoint: sub.endpoint })
        await sub.unsubscribe()
      }
      setMessage('此设备已关闭提醒')
    }
  }
  return (
    <section className="assistant-pane">
      <h3>iPhone 提醒</h3>
      <p>
        iOS 16.4
        及以上支持主屏幕网页推送。收到导入的消息或岗位状态变化后，Waymark
        可提醒已订阅的设备。
      </p>
      <p>默认本机地址只能在电脑访问。手机需要能访问此服务的可信 HTTPS 地址。</p>
      <div className="actions">
        <button
          disabled={busy}
          className="outline"
          onClick={() => run(() => configure(true))}
        >
          启用本机推送
        </button>
        <button
          disabled={busy}
          className="text-btn"
          onClick={() => run(() => configure(false))}
        >
          关闭提醒
        </button>
      </div>
      <details>
        <summary>通过快捷指令导入消息</summary>
        <p>
          iPhone 无法把其他招聘 App
          的推送列表授权给网页。可用快捷指令共享选中的文本，或为指定发件人的招聘短信建立自动化。先在添加岗位时关联来源。
        </p>
        <p>
          在「获取 URL 内容」中向同一 HTTPS 地址的{' '}
          <code>/api/mobile/intake</code> 发送 POST。使用 JSON 字段{' '}
          <code>platform</code>（已关联名称）和 <code>text</code>
          （消息摘录）；仅发送你选中的招聘内容。
        </p>
        <p>
          请求头填写 <code>Authorization: Bearer 配对码</code>
          。配对码只能导入，重新生成将替换旧码。
        </p>
        <button
          className="outline"
          disabled={busy}
          onClick={() =>
            run(async () => {
              if (confirm('生成新配对码？已使用旧码的快捷指令需要更新。'))
                setToken(
                  (await api<{ token: string }>('device-key', 'POST', {}))
                    .token,
                )
            })
          }
        >
          生成配对码
        </button>
        {token && (
          <label>
            配对码（仅本次显示）
            <input readOnly value={token} onFocus={(e) => e.target.select()} />
          </label>
        )}
        <button
          className="text-btn"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await api('device-key', 'DELETE', {})
              setToken('')
              setMessage('配对码已撤销')
            })
          }
        >
          撤销配对码
        </button>
      </details>
      {message && <p role="status">{message}</p>}
    </section>
  )
}
