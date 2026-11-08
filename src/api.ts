export async function api<T>(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  let response: Response
  try {
    response = await fetch('/api/' + path, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    })
  } catch {
    throw new Error('无法连接本机服务，请检查连接后重试')
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || '操作失败，请重试')
  return data as T
}
