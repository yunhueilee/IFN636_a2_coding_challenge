function Forbidden({ onHome }) {
  return (
    <div>
      <h1 className="login-title">403</h1>
      <p className="note">Forbidden</p>
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

export default Forbidden
