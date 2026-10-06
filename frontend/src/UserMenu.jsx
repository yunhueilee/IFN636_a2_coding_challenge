import { useEffect, useRef, useState } from 'react'

// user name and email in the top menu, click to open the log out menu
function UserMenu({ user, onLogout, onEditProfile }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) {
      return undefined
    }

    // close when clicking outside the menu or pressing Escape
    const onPointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // only shown when someone is logged in
  if (!user) {
    return null
  }

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        type="button"
        className="user-menu-toggle"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="user-menu-name">{user.username}</span>
        <span className="user-menu-caret" aria-hidden="true">
          {open ? '▴' : '▾'}
        </span>
      </button>

      {open && (
        <div className="user-menu-dropdown">
          <div className="user-menu-info">
            <p className="user-menu-email">{user.email || '-'}</p>
            <p className="user-menu-role">{user.role || '-'}</p>
          </div>
          {onEditProfile && (
            <button
              type="button"
              className="user-menu-item"
              onClick={() => {
                setOpen(false)
                onEditProfile()
              }}
            >
              Edit profile
            </button>
          )}
          <button
            type="button"
            className="user-menu-item"
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  )
}

export default UserMenu
