import { recognizeScreenshot } from './screenshot.mjs'
import { mountAssistant } from './assistant.mjs'
import express from 'express'
import { DatabaseSync } from 'node:sqlite'
import {
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
  createHash,
} from 'node:crypto'
import { promisify } from 'node:util'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const directory = path.resolve(
  process.env.WAYMARK_DATA || path.join(root, 'data'),
)
mkdirSync(directory, { recursive: true, mode: 0o700 })
const db = new DatabaseSync(path.join(directory, 'workspace.sqlite'))
db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA secure_delete=ON;
 CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL, state TEXT NOT NULL, revision INTEGER DEFAULT 0);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, owner TEXT REFERENCES accounts(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS files(id TEXT, owner TEXT REFERENCES accounts(id) ON DELETE CASCADE, name TEXT NOT NULL, bytes BLOB NOT NULL, PRIMARY KEY(owner,id));`)
const app = express()
app.disable('x-powered-by')
app.use((req, res, next) => {
  if (
    !/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(req.headers.host || '')
  )
    return res.sendStatus(403)
  next()
})
const sql = (s) => db.prepare(s)
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status })
}
const textField = (value, max = 200000) =>
  typeof value === 'string' && value.length <= max
const digest = (token) => createHash('sha256').update(token).digest('hex')
const hashPassword = promisify(scrypt)
const newState = () => ({ jobs: [], general: '', materials: [] })
const publicUser = (a) => ({ id: a.id, email: a.email, name: a.name })
const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  path: '/',
  secure: process.env.WAYMARK_HTTPS === '1',
}
const week = 7 * 24 * 60 * 60 * 1000
function signIn(res, id) {
  const token = randomBytes(32).toString('hex')
  sql('DELETE FROM sessions WHERE expires <= ?').run(Date.now())
  sql('INSERT INTO sessions VALUES(?,?,?)').run(
    digest(token),
    id,
    Date.now() + week,
  )
  res.cookie('waymark_session', token, { ...cookieOptions, maxAge: week })
}
app.use(
  '/api',
  (req, res, next) => {
    res.set({
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    })
    if (
      req.method !== 'GET' &&
      req.headers.origin &&
      new URL(req.headers.origin).host !== req.headers.host
    )
      return res.sendStatus(403)
    if (req.method !== 'GET' && !req.is('application/json'))
      return res.sendStatus(415)
    const token = /(?:^|;\s*)waymark_session=([a-f0-9]{64})(?:;|$)/.exec(
      req.headers.cookie || '',
    )?.[1]
    if (token) {
      req.tokenHash = digest(token)
      req.account = sql(
        'SELECT accounts.* FROM accounts JOIN sessions ON accounts.id=sessions.owner WHERE token=? AND expires>?',
      ).get(req.tokenHash, Date.now())
    }
    next()
  },
  express.json({ limit: '18mb' }),
)
app.get('/api/session', (req, res) =>
  res.json({ user: req.account ? publicUser(req.account) : null }),
)
const attempts = new Map()
app.post('/api/auth/:action', async (req, res) => {
  const { action } = req.params
  if (!['login', 'register'].includes(action)) fail(404, '找不到此操作')
  const key = req.socket.remoteAddress
  const recent = (attempts.get(key) || []).filter((t) => Date.now() - t < 60000)
  if (recent.length >= 16) fail(429, '尝试次数较多，请稍后重试')
  attempts.set(key, [...recent, Date.now()])
  const { name, password } = req.body
  const email = String(req.body.email || '')
    .trim()
    .toLowerCase()
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    !textField(password, 256) ||
    password.length < 8
  )
    fail(400, '请输入有效邮箱和至少 8 位的密码')
  let account = sql('SELECT * FROM accounts WHERE email=?').get(email)
  if (action === 'register') {
    if (!textField(name, 50) || !name.trim())
      fail(400, '请填写昵称（最多 50 字）')
    const salt = randomBytes(16).toString('hex')
    const hash = await hashPassword(password, salt, 64)
    if (sql('SELECT id FROM accounts WHERE email=?').get(email))
      fail(409, '邮箱已注册，请登录')
    sql(
      'INSERT INTO accounts(id,email,name,salt,hash,state) VALUES(?,?,?,?,?,?)',
    ).run(
      randomUUID(),
      email,
      name.trim(),
      salt,
      hash.toString('hex'),
      JSON.stringify(newState()),
    )
    account = sql('SELECT * FROM accounts WHERE email=?').get(email)
  } else {
    const hash = await hashPassword(
      password,
      account?.salt || 'unregistered',
      64,
    )
    if (!account || !timingSafeEqual(hash, Buffer.from(account.hash, 'hex')))
      fail(401, '邮箱或密码不正确')
  }
  signIn(res, account.id)
  res.json({ user: publicUser(account) })
})
app.use('/api', (req, res, next) =>
  req.account
    ? next()
    : res.status(401).json({ error: '请登录后访问私人空间' }),
)
mountAssistant(app)
app.post('/api/screenshot/recognize', recognizeScreenshot)
app.post('/api/logout', (req, res) => {
  sql('DELETE FROM sessions WHERE token=?').run(req.tokenHash)
  res.clearCookie('waymark_session', cookieOptions).json({ ok: true })
})
app.patch('/api/account', (req, res) => {
  const { name } = req.body
  if (!textField(name, 50) || !name.trim()) fail(400, '请填写有效昵称')
  sql('UPDATE accounts SET name=? WHERE id=?').run(name.trim(), req.account.id)
  res.json({ user: publicUser({ ...req.account, name: name.trim() }) })
})
app.delete('/api/account', async (req, res) => {
  if (!textField(req.body.password, 256)) fail(400, '请确认密码')
  const hash = await hashPassword(req.body.password, req.account.salt, 64)
  if (!timingSafeEqual(hash, Buffer.from(req.account.hash, 'hex')))
    fail(403, '密码不正确')
  sql('DELETE FROM accounts WHERE id=?').run(req.account.id)
  res.clearCookie('waymark_session', cookieOptions).json({ ok: true })
})
app.get('/api/workspace', (req, res) =>
  res.json({
    state: JSON.parse(req.account.state),
    revision: req.account.revision,
  }),
)
const statuses = ['待确认', '待投递', '已投递', '面试中', '已获录用', '已结束']
const idOk = (id) => typeof id === 'string' && /^[a-zA-Z0-9-]{1,64}$/.test(id)
function validState(s) {
  if (
    !s ||
    !textField(s.general) ||
    !Array.isArray(s.jobs) ||
    !Array.isArray(s.materials)
  )
    return false
  const validIds = (xs) =>
    xs.every((x) => x && idOk(x.id)) &&
    new Set(xs.map((x) => x.id)).size === xs.length
  return (
    validIds(s.jobs) &&
    validIds(s.materials) &&
    s.jobs.every(
      (j) =>
        [
          'company',
          'title',
          'platform',
          'salary',
          'location',
          'remote',
          'skills',
          'bonus',
          'description',
          'supplement',
          'note',
          'source',
          'original',
          'updated',
        ].every((k) => textField(j[k])) &&
        (Boolean(j.company.trim() && j.title.trim()) ||
          (j.source === '上传截图' && idOk(j.fileId))) &&
        statuses.includes(j.status) &&
        (!j.fileId || idOk(j.fileId)) &&
        (j.screenshots === undefined ||
          (Array.isArray(j.screenshots) && j.screenshots.every(s =>
            s && idOk(s.fileId) && textField(s.original) && textField(s.time)))) &&
        Array.isArray(j.history) &&
        j.history.every(
          (h) =>
            h &&
            ['time', 'source', 'text'].every((k) => textField(h[k])) &&
            statuses.includes(h.status),
        ),
    ) &&
    s.materials.every(
      (m) =>
        ['name', 'category', 'summary', 'date'].every((k) => textField(m[k])) &&
        idOk(m.fileId),
    )
  )
}
app.put('/api/workspace', (req, res) => {
  const { state, revision, upload } = req.body
  if (!validState(state) || JSON.stringify(state).length > 4000000)
    fail(400, '内容超出限制或格式不完整')
  const owner = req.account.id
  const ids = new Set([
    ...state.jobs.map((j) => j.fileId).filter(Boolean),
    ...state.jobs.flatMap(j => (j.screenshots || []).map(s => s.fileId)),
    ...state.materials.map((m) => m.fileId),
  ])
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = sql(
      'UPDATE accounts SET state=?,revision=revision+1 WHERE id=? AND revision=?',
    ).run(JSON.stringify(state), owner, revision)
    if (!result.changes)
      fail(409, '另一页面已修改工作空间。请复制未保存内容，刷新后重试')
    if (upload) {
      if (
        !idOk(upload.id) ||
        !ids.has(upload.id) ||
        !textField(upload.name, 255) ||
        !textField(upload.data, 14000000)
      )
        fail(400, '附件无效')
      const bytes = Buffer.from(upload.data, 'base64')
      if (bytes.length > 10 * 1024 * 1024) fail(413, '单个文件最大 10 MB')
      sql('INSERT INTO files VALUES(?,?,?,?)').run(
        upload.id,
        owner,
        upload.name,
        bytes,
      )
    }
    const stored = sql('SELECT id FROM files WHERE owner=?').all(owner)
    const available = new Set(stored.map((f) => f.id))
    for (const id of ids)
      if (!available.has(id)) fail(400, '附件不存在，请重新选择文件')
    for (const file of stored)
      if (!ids.has(file.id))
        sql('DELETE FROM files WHERE owner=? AND id=?').run(owner, file.id)
    db.exec('COMMIT')
    res.json({ revision: revision + 1 })
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
})
app.get('/api/files/:id', (req, res) => {
  const file = sql('SELECT name,bytes FROM files WHERE owner=? AND id=?').get(
    req.account.id,
    req.params.id,
  )
  if (!file) fail(404, '文件不存在')
  res
    .attachment(file.name)
    .type('application/octet-stream')
    .send(Buffer.from(file.bytes))
})
app.use('/api', (_req, res) => res.status(404).json({ error: '接口不存在' }))
app.use((error, _req, res, _next) =>
  res
    .status(error.status || 500)
    .json({
      error:
        error.status === 413
          ? '文件或文本过大'
          : error.status && error.status < 500
            ? error.message
            : '保存或读取失败，请稍后重试',
    }),
)
if (process.argv.includes('--dev')) {
  const { createServer } = await import('vite')
  const vite = await createServer({
    server: {
      middlewareMode: true,
      hmr: { port: Number(process.env.PORT || 5173) + 1 },
    },
  })
  app.use(vite.middlewares)
} else {
  app.use(express.static(path.join(root, 'dist')))
  app.get('/{*rest}', (_req, res) =>
    res.sendFile(path.join(root, 'dist/index.html')),
  )
}
const port = Number(process.env.PORT || 5173)
app.listen(port, process.env.WAYMARK_HOST || '127.0.0.1', () =>
  console.log('Waymark · http://127.0.0.1:' + port),
)
