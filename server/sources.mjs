import { createHash, randomBytes } from 'node:crypto'
import { generateVAPIDKeys, sendNotification } from 'web-push'

export function initSources(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS platforms(owner TEXT REFERENCES accounts(id) ON DELETE CASCADE, name TEXT, PRIMARY KEY(owner,name));
    CREATE TABLE IF NOT EXISTS device_keys(owner TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE, digest TEXT UNIQUE NOT NULL);
    CREATE TABLE IF NOT EXISTS notices(id INTEGER PRIMARY KEY,owner TEXT REFERENCES accounts(id) ON DELETE CASCADE, platform TEXT NOT NULL, body TEXT NOT NULL, received TEXT NOT NULL, fingerprint TEXT NOT NULL, UNIQUE(owner,fingerprint));
    CREATE TABLE IF NOT EXISTS subscriptions(endpoint TEXT PRIMARY KEY,owner TEXT REFERENCES accounts(id) ON DELETE CASCADE, session TEXT NOT NULL REFERENCES sessions(token) ON DELETE CASCADE, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS app_config(name TEXT PRIMARY KEY, value TEXT NOT NULL);
  `)
  const sql = (s) => db.prepare(s)
  if (!sql("SELECT 1 FROM app_config WHERE name='push'").get()) {
    sql('INSERT OR IGNORE INTO app_config VALUES(?,?)').run(
      'push',
      JSON.stringify(generateVAPIDKeys()),
    )
  }
  const keys = JSON.parse(
    sql("SELECT value FROM app_config WHERE name='push'").get().value,
  )
  const digest = (s) => createHash('sha256').update(s).digest('hex')
  const list = (id) =>
    sql('SELECT name FROM platforms WHERE owner=? ORDER BY name')
      .all(id)
      .map((r) => r.name)
  async function notify(owner) {
    const devices = sql(
      'SELECT endpoint,data FROM subscriptions s JOIN sessions t ON s.session=t.token WHERE s.owner=? AND t.expires>?',
    ).all(owner, Date.now())
    await Promise.allSettled(
      devices.map(async (d) => {
        try {
          await sendNotification(
            JSON.parse(d.data),
            JSON.stringify({
              title: 'Waymark',
              body: '求职动态有更新，打开助理查看。',
            }),
            {
              TTL: 3600,
              timeout: 10000,
              vapidDetails: {
                subject:
                  process.env.WAYMARK_PUSH_CONTACT ||
                  'mailto:admin@waymark.invalid',
                publicKey: keys.publicKey,
                privateKey: keys.privateKey,
              },
            },
          )
        } catch (e) {
          if ([404, 410].includes(e.statusCode))
            sql('DELETE FROM subscriptions WHERE owner=? AND endpoint=?').run(
              owner,
              d.endpoint,
            )
        }
      }),
    )
  }
  function intake(req, res) {
    const token = /^Bearer ([a-f0-9]{64})$/.exec(
      req.headers.authorization || '',
    )?.[1]
    const device =
      token &&
      sql('SELECT owner FROM device_keys WHERE digest=?').get(digest(token))
    if (!device) return res.status(401).json({ error: '设备配对码无效' })
    const { platform, text, eventId } = req.body
    if (
      !list(device.owner).includes(platform) ||
      typeof text !== 'string' ||
      !text.trim() ||
      text.length > 3000 ||
      (eventId !== undefined &&
        (typeof eventId !== 'string' || eventId.length > 200))
    )
      return res
        .status(400)
        .json({ error: '请提供已关联的平台和不超过 3000 字的通知原文' })
    const fingerprint = digest(
      JSON.stringify([platform, eventId || text.trim()]),
    )
    const result = sql(
      'INSERT OR IGNORE INTO notices(owner,platform,body,received,fingerprint) VALUES(?,?,?,?,?)',
    ).run(
      device.owner,
      platform,
      text.trim(),
      new Date().toISOString(),
      fingerprint,
    )
    if (result.changes) void notify(device.owner)
    res.json({ added: Boolean(result.changes) })
  }
  function mount(app) {
    app.post('/api/platforms', (req, res) => {
      const name = req.body.name?.trim?.()
      if (!name || name.length > 80 || name === '待确认')
        return res.status(400).json({ error: '请输入实际的平台或来源名称' })
      sql('INSERT OR IGNORE INTO platforms VALUES(?,?)').run(
        req.account.id,
        name,
      )
      res.json({ platforms: list(req.account.id) })
    })
    app.get('/api/notices', (req, res) =>
      res.json({
        items: sql(
          'SELECT id,platform,body,received FROM notices WHERE owner=? ORDER BY id DESC LIMIT 50',
        ).all(req.account.id),
      }),
    )
    app.post('/api/device-key', (req, res) => {
      const token = randomBytes(32).toString('hex')
      sql('INSERT OR REPLACE INTO device_keys VALUES(?,?)').run(
        req.account.id,
        digest(token),
      )
      res.json({ token })
    })
    app.delete('/api/device-key', (req, res) => {
      sql('DELETE FROM device_keys WHERE owner=?').run(req.account.id)
      res.json({ ok: true })
    })
    app.get('/api/push-key', (_req, res) => res.json({ key: keys.publicKey }))
    app.post('/api/push', (req, res) => {
      const { endpoint, keys: k } = req.body
      let url
      try {
        url = new URL(endpoint)
      } catch {}
      if (
        !url ||
        url.protocol !== 'https:' ||
        (url.hostname !== 'web.push.apple.com' &&
          !url.hostname.endsWith('.push.apple.com')) ||
        url.port ||
        url.username ||
        url.password ||
        !/^[\w-]{87}$/.test(k?.p256dh || '') ||
        !/^[\w-]{22}$/.test(k?.auth || '')
      )
        return res
          .status(400)
          .json({ error: '需要 iPhone 主屏幕应用的有效推送订阅' })
      sql(
        'INSERT OR REPLACE INTO subscriptions(endpoint,owner,session,data) VALUES(?,?,?,?)',
      ).run(
        endpoint,
        req.account.id,
        req.tokenHash,
        JSON.stringify({ endpoint, keys: { p256dh: k.p256dh, auth: k.auth } }),
      )
      res.json({ ok: true })
    })
    app.delete('/api/push', (req, res) => {
      sql('DELETE FROM subscriptions WHERE owner=? AND endpoint=?').run(
        req.account.id,
        String(req.body.endpoint),
      )
      res.json({ ok: true })
    })
  }
  return { list, intake, mount, notify }
}
