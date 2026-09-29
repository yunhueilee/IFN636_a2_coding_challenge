function NotFound({ onHome }) {
  return (
    <div>
      <h1 className="login-title">404</h1>
      <p className="note">Page not found</p>
      {onHome && (
        <p className="note">
          <button type="button" className="link" onClick={onHome}>
            Go back
          </button>
        </p>
      )}
    </div>
  )
}

export default NotFound
