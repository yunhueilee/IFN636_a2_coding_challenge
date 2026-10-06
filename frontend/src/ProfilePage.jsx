import EditProfile from './EditProfile.jsx'
import UserMenu from './UserMenu.jsx'

// admin version of the profile page, with the same top menu as the admin pages
function ProfilePage({
  user,
  onLogout,
  onUnauthorized,
  onProfileSaved,
  onOpenDashboard,
  onOpenList,
  onOpenReview,
  onOpenStaff,
  canManageChallenges,
  canReviewQueue,
  canManageStaff,
}) {
  return (
    <div>
      <div className="nav">
        <span className="nav-logo">Coding Challenge Platform</span>
        <div className="nav-links">
          <button type="button" className="nav-link" onClick={onOpenDashboard}>
            Dashboard
          </button>
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

      <EditProfile onUnauthorized={onUnauthorized} onSaved={onProfileSaved} />
    </div>
  )
}

export default ProfilePage
