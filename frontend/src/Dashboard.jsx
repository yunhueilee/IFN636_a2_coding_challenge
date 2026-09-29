function Dashboard({ onLogout, onOpenList, onOpenReview, canManageChallenges, canReviewQueue }) {
  return (
    <div>
      {/* top menu */}
      <div className="nav">
        <span className="nav-logo">Coding Challenge Platform</span>
        <div className="nav-links">
          <span>Dashboard</span>
          {canManageChallenges && (
            <button type="button" className="nav-link" onClick={onOpenList}>
              Challenge Management
            </button>
          )}
          {canReviewQueue && (
            <button type="button" className="nav-link" onClick={onOpenReview}>
              Review Queue
            </button>
          )}
          {/* logout button, click to go back to login */}
          <button type="button" className="nav-logout" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
      <h1 className="page-title">Dashboard</h1>
    </div>
  )
}

export default Dashboard
