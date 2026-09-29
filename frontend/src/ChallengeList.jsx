import { useEffect, useState } from 'react'

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

function ChallengeList({ onLogout, onOpenDashboard, onOpenReview, onCreate, onOpenChallenge, onForbidden, onUnauthorized }) {
  const [challenges, setChallenges] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    const loadList = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')

      try {
        const response = await fetch('/api/challenges', {
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
          setMessage(data.message || 'Cannot load challenges')
          return
        }

        setChallenges(data)
      } catch (error) {
        setMessage('Cannot connect to server')
      }
    }

    loadList()
  }, [])

  return (
    <div>
      <div className="nav">
        <span className="nav-logo">Coding Challenge Platform</span>
        <div className="nav-links">
          <button type="button" className="nav-link" onClick={onOpenDashboard}>
            Dashboard
          </button>
          <span>Challenge Management</span>
          <button type="button" className="nav-link" onClick={onOpenReview}>
            Review Queue
          </button>
          <button type="button" className="nav-logout" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="list-header">
        <h1 className="page-title">Challenge Management</h1>
        <button type="button" className="btn-primary" onClick={onCreate}>
          Create Challenge
        </button>
      </div>

      {message && <p className="form-message">{message}</p>}

      {challenges.length === 0 && !message ? (
        <p className="list-empty">No challenges yet</p>
      ) : null}

      {challenges.length > 0 && (
        <table className="challenge-table">
          <thead>
            <tr>
              <th>Number</th>
              <th>Title</th>
              <th>Type</th>
              <th>Status</th>
              <th>Publisher</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {challenges.map((item) => (
              <tr key={item._id}>
                <td>{item.challengeNumber || '-'}</td>
                <td>
                  <button
                    type="button"
                    className="table-link"
                    onClick={() => onOpenChallenge(item)}
                  >
                    {item.title || '(no title)'}
                  </button>
                </td>
                <td>{item.type || '-'}</td>
                <td>{item.status}</td>
                <td>{item.createdBy?.username || '-'}</td>
                <td>{formatDate(item.publishedAt || item.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default ChallengeList
