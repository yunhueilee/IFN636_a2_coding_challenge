import { useState } from 'react'

function LearnerLogin({ onLogin }) {
  const [loginName, setLoginName] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  const handleLogin = async (event) => {
    event.preventDefault()
    setMessage('')

    try {
      const response = await fetch('/api/auth/learner-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginName,
          password: password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.message || 'Email/username or password is incorrect.')
        return
      }

      onLogin(data.token, rememberMe, data.user.username, data.user.role)
    } catch (error) {
      setMessage('Cannot connect to server')
    }
  }

  return (
    <div>
      <h1 className="login-title">Coding Challenge Platform</h1>

      <form className="login-box" onSubmit={handleLogin}>
        <h2>Learner Login</h2>

        <label>Email or Username:</label>
        <input
          type="text"
          value={loginName}
          onChange={(event) => setLoginName(event.target.value)}
          required
        />

        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <div className="row">
          <label>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            Remember Me
          </label>
          <button type="button" className="link">Forgot Password?</button>
        </div>

        <button type="submit">Login</button>

        {message && <p className="message">{message}</p>}

        <p className="note">
          Do not have an account?{' '}
          <a className="link" href="/register">
            Create Account
          </a>
        </p>
      </form>
    </div>
  )
}

export default LearnerLogin
