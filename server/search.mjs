export function mountSearch(app) {
  app.post('/api/search', async (req, res) => {
    const { query, confirmed } = req.body
    if (
      confirmed !== true ||
      typeof query !== 'string' ||
      !query.trim() ||
      query.length > 200
    )
      return res.status(400).json({ error: '请确认不超过 200 字的公开检索词' })
    if (!process.env.BOCHA_API_KEY)
      return res.status(503).json({ error: '本机尚未配置博查搜索' })
    try {
      const r = await fetch('https://api.bocha.cn/v1/web-search', {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(20000),
        headers: {
          Authorization: 'Bearer ' + process.env.BOCHA_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim(), count: 5, summary: true }),
      })
      const data = await r.json()
      if (!r.ok || data.code !== 200) throw new Error()
      const items = (data.data?.webPages?.value || [])
        .filter((x) => typeof x.url === 'string' && /^https?:\/\//i.test(x.url))
        .slice(0, 5)
        .map((x) => ({
          title: String(x.name || x.url),
          url: x.url,
          snippet: String(x.summary || x.snippet || '').slice(0, 450),
        }))
      res.json({ items })
    } catch {
      res
        .status(502)
        .json({ error: '公开搜索失败，请检查本机网络、博查密钥及余额' })
    }
  })
}
