import { useEffect, useState } from 'react'
import UserMenu from './UserMenu.jsx'

const roleOptions = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'ADMIN_MANAGER', label: 'Admin Manager' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
]

function formatDate(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function isStrongPassword(password) {
  return (
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  )
}

function StaffAccounts({ user, onLogout, onOpenProfile, onOpenDashboard, onForbidden, onUnauthorized }) {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('')
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [staffList, setStaffList] = useState([])
  const [listMessage, setListMessage] = useState('')

  const clearError = (field) => {
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  const loadStaff = async () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')

    try {
      const response = await fetch('/api/staff', {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      })

      const data = await response.json()

      if (response.status === 403) {
        onForbidden()
        return
      }

      if (response.status === 401) {
        onUnauthorized()
        return
      }

      if (!response.ok) {
        setListMessage(data.message || 'Cannot load staff accounts')
        return
      }

      setStaffList(data)
    } catch (error) {
      setListMessage('Cannot connect to server')
    }
  }

  useEffect(() => {
    loadStaff()
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage('')

    const nextErrors = {}

    if (!email.trim()) {
      nextErrors.email = 'This field is required'
    }

    if (!username.trim()) {
      nextErrors.username = 'This field is required'
    }

    if (!password) {
      nextErrors.password = 'This field is required'
    } else if (!isStrongPassword(password)) {
      nextErrors.password = 'Password must include uppercase, lowercase, a number and a symbol'
    }

    if (!role) {
      nextErrors.role = 'This field is required'
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          email: email.trim(),
          username: username.trim(),
          password,
          role,
        }),
      })

      const data = await response.json()

      if (response.status === 403) {
        onForbidden()
        return
      }

      if (response.status === 401) {
        onUnauthorized()
        return
      }

      if (!response.ok) {
        setErrors({
          email: data.email,
          username: data.username,
          password: data.password,
          role: data.role,
        })
        setMessage(data.message || '')
        return
      }

      const roleLabel = roleOptions.find((item) => item.value === data.role)?.label
      setMessage(`Account created for ${data.username} (${roleLabel})`)
      setEmail('')
      setUsername('')
      setPassword('')
      setRole('')
      loadStaff()
    } catch (error) {
      setMessage('Cannot connect to server')
    }
  }

  return (
    <div>
      <div className="nav">
        <span className="nav-logo">Coding Challenge Platform</span>
        <div className="nav-links">
          <button type="button" className="nav-link" onClick={onOpenDashboard}>
            Dashboard
          </button>
          <span>Staff Accounts</span>
          <UserMenu user={user} onLogout={onLogout} onEditProfile={onOpenProfile} />
        </div>
      </div>

      <h1 className="page-title">Staff Accounts</h1>

      <div className="form-panels">
        <form className="form-panel" onSubmit={handleSubmit}>
          <div className="field">
            <label>Email:</label>
            <input
              type="text"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                clearError('email')
              }}
              className={errors.email ? 'input-error' : ''}
            />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>

          <div className="field">
            <label>Username:</label>
            <input
              type="text"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value)
                clearError('username')
              }}
              className={errors.username ? 'input-error' : ''}
            />
            {errors.username && <p className="field-error">{errors.username}</p>}
          </div>

          <div className="field">
            <label>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                clearError('password')
              }}
              className={errors.password || (password && !isStrongPassword(password)) ? 'input-error' : ''}
            />
            {(errors.password || (password && !isStrongPassword(password))) && (
              <p className="field-error">
                {errors.password ||
                  'Password must include uppercase, lowercase, a number and a symbol'}
              </p>
            )}
          </div>

          <div className="field">
            <label>Role:</label>
            <select
              value={role}
              onChange={(event) => {
                setRole(event.target.value)
                clearError('role')
              }}
              className={errors.role ? 'input-error' : ''}
            >
              <option value="">Select a role</option>
              {roleOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            {errors.role && <p className="field-error">{errors.role}</p>}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              Create Account
            </button>
          </div>
        </form>
      </div>

      {message && <p className="form-message">{message}</p>}

      {listMessage && <p className="form-message">{listMessage}</p>}

      {staffList.length === 0 && !listMessage ? (
        <p className="list-empty">No staff accounts yet</p>
      ) : null}

      {staffList.length > 0 && (
        <table className="challenge-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map((item) => (
              <tr key={item._id}>
                <td>{item.username}</td>
                <td>{item.email}</td>
                <td>{roleOptions.find((option) => option.value === item.role)?.label || item.role}</td>
                <td>{formatDate(item.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default StaffAccounts
