import { useState } from 'react'

function isStrongPassword(password) {
  return (
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  )
}

function Register({ onLogin }) {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [gender, setGender] = useState('')
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')

  const emailOk = Boolean(email.trim())
  const usernameOk = Boolean(username.trim())
  const passwordOk = isStrongPassword(password)
  const canSubmit = emailOk && usernameOk && passwordOk

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage('')

    const nextErrors = {}

    if (!emailOk) {
      nextErrors.email = 'This field is required'
    }

    if (!usernameOk) {
      nextErrors.username = 'This field is required'
    }

    if (!password) {
      nextErrors.password = 'This field is required'
    } else if (!passwordOk) {
      nextErrors.password =
        'Password must include uppercase, lowercase, a number and a symbol'
    }

    setErrors(nextErrors)

    if (!canSubmit) {
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          username: username.trim(),
          password,
          gender: gender || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrors({
          email: data.email,
          username: data.username,
          password: data.password,
        })
        setMessage(data.message || '')
        return
      }

      onLogin(data.token, false, data.user.username, data.user.role)
    } catch (error) {
      setMessage('Cannot connect to server')
    }
  }

  return (
    <div>
      <h1 className="login-title">Coding Challenge Platform</h1>

      <form className="login-box register-box" onSubmit={handleSubmit}>
        <h2>Create Account</h2>

        <div className="field">
          <label>Email:</label>
          <input
            type="text"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setErrors({ ...errors, email: '' })
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
              setErrors({ ...errors, username: '' })
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
              setErrors({ ...errors, password: '' })
            }}
            className={errors.password || (password && !passwordOk) ? 'input-error' : ''}
          />
          {(errors.password || (password && !passwordOk)) && (
            <p className="field-error">
              {errors.password ||
                'Password must include uppercase, lowercase, a number and a symbol'}
            </p>
          )}
        </div>

        <div className="field">
          <label>Gender:</label>
          <select value={gender} onChange={(event) => setGender(event.target.value)}>
            <option value="">Prefer not to say</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <button type="submit" disabled={!canSubmit}>
          Submit
        </button>

        {message && <p className="message">{message}</p>}

        <p className="note">
          Already have an account?{' '}
          <a className="link" href="/login">
            Login
          </a>
        </p>
      </form>
    </div>
  )
}

export default Register
