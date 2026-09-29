import { useEffect, useState } from 'react'

function formatTime(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusLabel(status) {
  if (status === 'PASSED') {
    return 'Passed'
  }

  if (status === 'FAILED') {
    return 'Failed'
  }

  if (status === 'CANCELLED') {
    return 'Cancelled'
  }

  if (status === 'UNDER_REVIEW') {
    return 'Under Review'
  }

  if (status === 'ACCEPTED') {
    return 'Accepted'
  }

  if (status === 'REVISION_REQUIRED') {
    return 'Revision Required'
  }

  if (status === 'FINAL_FAILED') {
    return 'Final Failed'
  }

  return 'Pending'
}

function AttemptHistory({ challengeId, showChallenge, refreshKey, onOpenAttempt, onUnauthorized }) {
  // cancelled attempts stay here, they are not deleted
  const [attempts, setAttempts] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    const loadAttempts = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      let url = '/api/submissions'

      if (challengeId) {
        url += '?challengeId=' + challengeId
      }

      try {
        const response = await fetch(url, {
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
          setMessage(data.message || 'Cannot load attempts')
          return
        }

        setAttempts(data)
      } catch (error) {
        setMessage('Cannot connect to server')
      }
    }

    loadAttempts()
  }, [challengeId, refreshKey])

  return (
    <div>
      <h2 className={challengeId ? 'section-title' : 'page-title'}>My Attempts</h2>

      {message && <p className="form-message">{message}</p>}

      {attempts.length === 0 && !message ? (
        <p className="list-empty">No attempts yet</p>
      ) : null}

      {attempts.length > 0 && (
        <table className="challenge-table">
          <thead>
            <tr>
              {showChallenge ? <th>Challenge</th> : null}
              <th>Attempt</th>
              <th>Submitted Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((item) => (
              <tr key={item._id} className={item.selectedForReview ? 'attempt-latest' : ''}>
                {showChallenge ? (
                  <td>{item.challenge?.challengeNumber || item.challenge?.title || '-'}</td>
                ) : null}
                <td>
                  <button type="button" className="table-link" onClick={() => onOpenAttempt(item._id)}>
                    Attempt {item.attemptNumber}
                  </button>
                  {item.selectedForReview ? <span className="latest-tag">Latest</span> : null}
                </td>
                <td>{formatTime(item.submittedAt)}</td>
                <td>{statusLabel(item.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default AttemptHistory
