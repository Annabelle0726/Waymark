import path from 'node:path'

export function previewType(name, bytes) {
  if (bytes.subarray(0, 5).toString() === '%PDF-') return 'application/pdf'
  if (bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')))
    return 'image/png'
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return 'image/jpeg'
  if (/^GIF8[79]a$/.test(bytes.subarray(0, 6).toString())) return 'image/gif'
  if (
    bytes.subarray(0, 4).toString() === 'RIFF' &&
    bytes.subarray(8, 12).toString() === 'WEBP'
  )
    return 'image/webp'
  const extension = path.extname(name).toLowerCase()
  if (
    extension === '.docx' &&
    bytes.subarray(0, 4).equals(Buffer.from('504b0304', 'hex'))
  )
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (['.txt', '.md', '.csv', '.json'].includes(extension)) {
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      if (!text.includes('\0')) return 'text/plain; charset=utf-8'
    } catch {
      /* Unsupported text encoding is offered as a download. */
    }
  }
  return null
}
