export function Logo({ height = 32 }) {
  return <span className="logo" role="img" aria-label="D&D" style={{ height, width: height * 2.195 }} />
}

export function ThemeToggle({ theme, onToggle }) {
  const dark = theme === 'dark'
  return (
    <button className="icon-btn theme-toggle" onClick={onToggle} aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} title={dark ? 'Modo claro' : 'Modo oscuro'}>
      {dark ? '☀️' : '🌙'}
    </button>
  )
}
