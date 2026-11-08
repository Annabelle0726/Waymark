export default function Preview({ value }: { value: string }) {
  return (
    <div className="preparation-preview">
      {value.split('\n').map((line, i) => {
        const parts = line
          .replace(/^(## |[-·] )/, '')
          .split(/(\*\*[^*]+\*\*)/g)
          .map((p, n) =>
            p.startsWith('**') && p.endsWith('**') ? (
              <strong key={n}>{p.slice(2, -2)}</strong>
            ) : (
              p
            ),
          )
        return line.startsWith('## ') ? (
          <h3 key={i}>{parts}</h3>
        ) : (
          <div key={i}>
            {/^[-·] /.test(line) ? '• ' : ''}
            {parts}
            {!line && <br />}
          </div>
        )
      })}
    </div>
  )
}
