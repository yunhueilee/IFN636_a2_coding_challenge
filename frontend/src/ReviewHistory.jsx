import { useEffect, useState } from 'react'

// learner review list: only their own results from the API

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

function decisionLabel(decision) {
  if (decision === 'PASS') {
    return 'PASS'
  }

  if (decision === 'REVISION_REQUIRED') {
    return 'REVISION REQUIRED'
  }

  return '-'
}

function ReviewHistory({ onOpenAttempt, onUnauthorized }) {
  const [reviews, setReviews] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    const loadReviews = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')

      try {
        const response = await fetch('/api/submissions/reviews', {
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
          setMessage(data.message || 'Cannot load review history')
          return
        }

        setReviews(data)
      } catch (error) {
        setMessage('Cannot connect to server')
      }
    }

    loadReviews()
  }, [])

  return (
    <div>
      <h1 className="page-title">Review History</h1>

      {message && <p className="form-message">{message}</p>}

      {reviews.length === 0 && !message ? (
        <p className="list-empty">No review history yet</p>
      ) : null}

      {reviews.length > 0 ? (
        <table className="challenge-table">
          <thead>
            <tr>
              <th>Challenge</th>
              <th>Attempt</th>
              <th>Review Time</th>
              <th>Decision</th>
              <th>Feedback</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((item) => (
              <tr key={item._id}>
                <td>{item.challenge?.challengeNumber || item.challenge?.title || '-'}</td>
                <td>
                  <button type="button" className="table-link" onClick={() => onOpenAttempt(item._id)}>
                    Attempt {item.attemptNumber}
                  </button>
                </td>
                <td>{formatTime(item.reviewedAt)}</td>
                <td>{decisionLabel(item.decision)}</td>
                <td>
                  <p>{item.feedback || '-'}</p>
                  {(item.comments || []).map((comment) => (
                    <p key={comment._id}>
                      Admin comment ({comment.createdBy?.username || 'Admin'}): {comment.text}
                    </p>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  )
}

export default ReviewHistory
