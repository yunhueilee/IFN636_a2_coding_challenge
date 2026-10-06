import { useEffect, useState } from 'react'

// edit username, gender and password. email cannot be changed
function EditProfile({ onUnauthorized, onSaved }) {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [gender, setGender] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const loadProfile = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')

      try {
        const response = await fetch('/api/auth/profile', {
          headers: {
            Authorization: 'Bearer ' + token,
          },
        })

        const data = await response.json()

        if (response.status === 401) {
          onUnauthorized()
          return
        }

        if (!response.ok) {
          setMessage(data.message || 'Cannot load profile')
          return
        }

        setEmail(data.email)
        setUsername(data.username)
        setGender(data.gender || '')
        setLoaded(true)
      } catch (error) {
        setMessage('Cannot connect to server')
      }
    }

    loadProfile()
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage('')

    if (newPassword && newPassword !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' })
      return
    }

    setErrors({})

    const token = localStorage.getItem('token') || sessionStorage.getItem('token')

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          username: username.trim(),
          gender: gender || null,
          currentPassword,
          newPassword,
        }),
      })

      const data = await response.json()

      if (response.status === 401) {
        onUnauthorized()
        return
      }

      if (!response.ok) {
        setErrors({
          username: data.username,
          gender: data.gender,
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        })
        setMessage(data.message || '')
        return
      }

      setUsername(data.username)
      setGender(data.gender || '')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setMessage('Profile updated')
      onSaved(data)
    } catch (error) {
      setMessage('Cannot connect to server')
    }
  }

  return (
    <div>
      <h1 className="page-title">Edit Profile</h1>

      <form className="login-box register-box" onSubmit={handleSubmit}>
        <div className="field">
          <label>Email:</label>
          <input type="text" value={email} disabled />
        </div>

        <div className="field">
          <label>Username:</label>
          <input
            type="text"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value)
              setErrors({ ...errors, username: '' })
            }}
            className={errors.username ? 'input-error' : ''}
          />
          {errors.username && <p className="field-error">{errors.username}</p>}
        </div>

        <div className="field">
          <label>Gender:</label>
          <select
            value={gender}
            onChange={(event) => {
              setGender(event.target.value)
              setErrors({ ...errors, gender: '' })
            }}
          >
            <option value="">Prefer not to say</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          {errors.gender && <p className="field-error">{errors.gender}</p>}
        </div>

        <div className="field">
          <label>Current Password:</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => {
              setCurrentPassword(event.target.value)
              setErrors({ ...errors, currentPassword: '' })
            }}
            className={errors.currentPassword ? 'input-error' : ''}
          />
          {errors.currentPassword && <p className="field-error">{errors.currentPassword}</p>}
        </div>

        <div className="field">
          <label>New Password:</label>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value)
              setErrors({ ...errors, newPassword: '' })
            }}
            className={errors.newPassword ? 'input-error' : ''}
          />
          {errors.newPassword && <p className="field-error">{errors.newPassword}</p>}
        </div>

        <div className="field">
          <label>Confirm New Password:</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value)
              setErrors({ ...errors, confirmPassword: '' })
            }}
            className={errors.confirmPassword ? 'input-error' : ''}
          />
          {errors.confirmPassword && <p className="field-error">{errors.confirmPassword}</p>}
        </div>

        <button type="submit" disabled={!loaded}>
          Save Changes
        </button>

        {message && <p className="message">{message}</p>}

        <p className="note">Leave the password fields empty to keep your current password.</p>
      </form>
    </div>
  )
}

export default EditProfile
