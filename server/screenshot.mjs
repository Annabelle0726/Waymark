import { execFile } from 'node:child_process'

const maxBytes = 10 * 1024 * 1024
const pngHeader = Buffer.from('89504e470d0a1a0a', 'hex')

// Bound the decoded size before passing compressed data to the OCR engine.
function dimensions(bytes) {
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(pngHeader))
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)]
  if (bytes.readUInt16BE(0) !== 0xffd8) return []
  for (let i = 2; i + 9 < bytes.length && bytes[i] === 0xff;) {
    const marker = bytes[++i]
    if (marker === 0xff) continue
    if (marker === 0xda || marker === 0xd9) break
    const length = bytes.readUInt16BE(i + 1)
    if (length < 2 || i + 1 + length > bytes.length) break
    if ([0xc0, 0xc1, 0xc2].includes(marker))
      return [bytes.readUInt16BE(i + 6), bytes.readUInt16BE(i + 4)]
    i += length + 1
  }
  return []
}
let running = 0
export async function recognizeScreenshot(req, res) {
  const data = req.body?.data
  if (typeof data !== 'string' || data.length > 4 * Math.ceil(maxBytes / 3))
    return res.status(400).json({ error: '请选择 10 MB 以内的截图' })
  const bytes = Buffer.from(data, 'base64')
  const [width, height] =
    bytes.length >= 24 && bytes.length <= maxBytes ? dimensions(bytes) : []
  if (!width || !height || width * height > 24000000)
    return res
      .status(422)
      .json({
        error: '图片格式或尺寸不支持，请换用 2400 万像素以内的 PNG 或 JPEG',
      })
  if (running >= 2)
    return res.status(429).json({ error: '本机正在识别其他截图，请稍后重试' })
  running++
  try {
    const text = await new Promise((resolve, reject) => {
      const child = execFile(
        'tesseract',
        ['stdin', 'stdout', '-l', 'chi_sim+eng', '--psm', '6'],
        {
          timeout: 30000,
          killSignal: 'SIGKILL',
          maxBuffer: 1024 * 1024,
          windowsHide: true,
          env: { ...process.env, OMP_THREAD_LIMIT: '2' },
        },
        (error, stdout) => (error ? reject(error) : resolve(stdout.trim())),
      )
      child.stdin.on('error', () => {}) // Early engine exits are reported by the callback.
      child.stdin.end(bytes)
    })
    res.json({ text })
  } catch {
    res.status(503).json({ error: '本机识别未完成，可重试、换图或先保存原图' })
  } finally {
    running--
  }
}
