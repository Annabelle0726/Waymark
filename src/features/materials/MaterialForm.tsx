import { useState } from 'react'
import {
  readUpload,
  now,
  uid,
  type Material,
  type Upload,
} from '../../domain/workspace'
import { Form } from '../../components/forms/Forms'

export function MaterialForm({
  item,
  onSave,
}: {
  item?: Material
  onSave: (m: Material, u?: Upload) => Promise<void>
}) {
  const [name, setName] = useState(item?.name || ''),
    [category, setCategory] = useState(item?.category || '简历'),
    [summary, setSummary] = useState(item?.summary || ''),
    [file, setFile] = useState<File>()
  return (
    <Form
      label="保存资料"
      submit={async () => {
        if (!name.trim()) throw new Error('请填写资料名称')
        const upload = file ? await readUpload(file) : undefined
        if (!upload && !item) throw new Error('请选择文件')
        await onSave(
          {
            id: item?.id || uid(),
            fileId: upload?.id || item!.fileId,
            name: name.trim(),
            category,
            summary,
            date: now(),
          },
          upload,
        )
      }}
    >
      <label>
        {item ? '替换文件（可选）' : '选择文件'}
        <input
          type="file"
          required={!item}
          onChange={(e) => {
            const f = e.target.files?.[0]
            setFile(f)
            if (f && !name) setName(f.name)
          }}
        />
        <small>单个文件最大 10 MB</small>
      </label>
      <label>
        资料名称
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        资料类型
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {['简历', '证书', '奖状', '其他'].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      <label>
        资料摘要
        <textarea
          rows={3}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="可填写希望用于面试提纲的真实经历；文件正文不会自动解析。"
        />
      </label>
    </Form>
  )
}
