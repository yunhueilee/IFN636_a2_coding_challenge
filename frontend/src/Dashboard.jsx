import UserMenu from './UserMenu.jsx'

function Dashboard({ user, onLogout, onOpenList, onOpenReview, onOpenStaff, canManageChallenges, canReviewQueue, canManageStaff }) {
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
          {canManageStaff && (
            <button type="button" className="nav-link" onClick={onOpenStaff}>
              Staff Accounts
            </button>
          )}
          <UserMenu user={user} onLogout={onLogout} />
        </div>
      </div>
      <h1 className="page-title">Dashboard</h1>
    </div>
  )
}

export default Dashboard
