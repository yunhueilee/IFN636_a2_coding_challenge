import { useState } from 'react'

function Login({ onLogin }) {
  const [loginName, setLoginName] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  const handleLogin = async (event) => {
    event.preventDefault()
    setMessage('')

    try {
      // call the admin login API
      const response = await fetch('/api/auth/login', {
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
        setMessage(data.message || 'Invalid email or password')
        return
      }

      // login ok, go to dashboard
      // also tell App if remember me is ticked
      onLogin(data.token, rememberMe, data.user.username, data.user.role)
    } catch (error) {
      setMessage('Cannot connect to server')
    }
  }

  return (
    <div>
      <h1 className="login-title">Coding Challenge Platform Admin Portal</h1>

      <form className="login-box" onSubmit={handleLogin}>
        <h2>Admin Login</h2>

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
            {/* this box is remember me */}
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

        <p className="note">Only authorised Admin accounts can log in.</p>
      </form>
    </div>
  )
}

export default Login
