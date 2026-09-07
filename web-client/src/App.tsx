function App() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl items-center px-4 py-16">
      <div className="ds-surface w-full p-8">
        <p className="ds-label">Friend on Campus</p>
        <h1 className="mt-3">Web client</h1>
        <p className="mt-4 text-muted">
          No views are implemented yet. The design tokens and base styles are in
          place, so components written from here on pick up the right colours,
          type, shape and spacing on their own.
        </p>
        <p className="mt-4 text-sm text-muted">
          See DESIGN.md, and open design-system.html in a browser for the full
          set of tokens and patterns.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" className="ds-btn ds-btn--primary">
            Primary action
          </button>
          <button type="button" className="ds-btn ds-btn--glass">
            Secondary
          </button>
        </div>
      </div>
    </main>
  )
}

export default App
