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
  if (status === 'UNDER_REVIEW') {
    return 'Under Review'
  }

  if (status === 'ACCEPTED' || status === 'PASSED') {
    return 'Accepted'
  }

  if (status === 'REVISION_REQUIRED') {
    return 'Revision Required'
  }

  if (status === 'FINAL_FAILED' || status === 'FAILED') {
    return 'Final Failed'
  }

  return 'Pending'
}

function getSaved(name) {
  return localStorage.getItem(name) || sessionStorage.getItem(name) || ''
}

// Super Admin cannot open this page, App already checks the role
function ReviewQueue({
  attemptId,
  onLogout,
  onOpenDashboard,
  onOpenList,
  onOpenQueue,
  onOpenAttempt,
  onForbidden,
  onUnauthorized,
  onNotFound,
}) {
  const [attempts, setAttempts] = useState([])
  const [attempt, setAttempt] = useState(null)
  const [reviewers, setReviewers] = useState([])
  const [nextReviewerId, setNextReviewerId] = useState('')
  const [decision, setDecision] = useState('PASS')
  const [feedback, setFeedback] = useState('')
  const [feedbackError, setFeedbackError] = useState('')
  const [commentText, setCommentText] = useState('')
  const [commentError, setCommentError] = useState('')
  const [reviewed, setReviewed] = useState([])
  const [message, setMessage] = useState('')
  const username = getSaved('username')
  const role = getSaved('role')

  const handleAuth = (response) => {
    if (response.status === 403) {
      onForbidden()
      return true
    }

    if (response.status === 401) {
      onUnauthorized()
      return true
    }

    return false
  }

  const loadAttempt = async () => {
    const token = getSaved('token')

    try {
      const response = await fetch(
        '/api/submissions/review-queue/' + attemptId,
        {
          headers: {
            Authorization: 'Bearer ' + token,
          },
        }
      )

      const data = await response.json()

      if (handleAuth(response)) {
        return
      }

      if (response.status === 404) {
        onNotFound()
        return
      }

      if (!response.ok) {
        setMessage(data.message || 'Cannot load attempt')
        return
      }

      setAttempt(data)
    } catch (error) {
      setMessage('Cannot connect to server')
    }
  }

  useEffect(() => {
    const token = getSaved('token')

    const loadQueue = async () => {
      try {
        const response = await fetch('/api/submissions/review-queue', {
          headers: {
            Authorization: 'Bearer ' + token,
          },
        })

        const data = await response.json()

        if (handleAuth(response)) {
          return
        }

        if (!response.ok) {
          setMessage(data.message || 'Cannot load review queue')
          return
        }

        setAttempts(data)
      } catch (error) {
        setMessage('Cannot connect to server')
      }
    }

    const loadReviewed = async () => {
      try {
        const response = await fetch('/api/submissions/reviewed', {
          headers: {
            Authorization: 'Bearer ' + token,
          },
        })

        const data = await response.json()

        if (response.ok) {
          setReviewed(data)
        }
      } catch (error) {
        setReviewed([])
      }
    }

    const loadReviewers = async () => {
      try {
        const response = await fetch('/api/submissions/reviewers', {
          headers: {
            Authorization: 'Bearer ' + token,
          },
        })

        const data = await response.json()

        if (response.ok) {
          setReviewers(data)
        }
      } catch (error) {
        setReviewers([])
      }
    }

    setMessage('')

    if (attemptId) {
      loadAttempt()
      loadReviewers()
    } else {
      setAttempt(null)
      loadQueue()
      loadReviewed()
    }
  }, [attemptId])

  // claim, release, reassign, or submit the first decision
  const sendAction = async (path, body) => {
    const token = getSaved('token')
    setMessage('')

    try {
      const response = await fetch('/api/submissions/' + path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify(body || {}),
      })

      const data = await response.json()

      if (handleAuth(response)) {
        return
      }

      if (!response.ok) {
        if (data.feedback) {
          setFeedbackError(data.feedback)
          return
        }

        setMessage(data.message || 'Cannot update review')
        return
      }

      setAttempt(data)
    } catch (error) {
      setMessage('Cannot connect to server')
    }
  }

  const isReviewer = attempt && attempt.reviewer && attempt.reviewer.username === username
  const canReassign = role === 'ADMIN_MANAGER' && attempt && attempt.status === 'UNDER_REVIEW'

  return (
    <div>
      <div className="nav">
        <span className="nav-logo">Coding Challenge Platform</span>
        <div className="nav-links">
          <button type="button" className="nav-link" onClick={onOpenDashboard}>
            Dashboard
          </button>
          <button type="button" className="nav-link" onClick={onOpenList}>
            Challenge Management
          </button>
          <span>Review Queue</span>
          <button type="button" className="nav-logout" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      <h1 className="page-title">Review Queue</h1>

      {message && <p className="form-message">{message}</p>}

      {attemptId && attempt ? (
        <div>
          <p className="list-empty">
            <button type="button" className="link" onClick={onOpenQueue}>
              Back to Review Queue
            </button>
          </p>
          <div className="detail-box">
            <p>Challenge Number: {attempt.challenge?.challengeNumber || '-'}</p>
            <p>Title: {attempt.challenge?.title || '-'}</p>
            <p>Learner: {attempt.learner?.username || '-'}</p>
            <p>Attempt: {attempt.attemptNumber}</p>
            <p>Submitted Time: {formatTime(attempt.submittedAt)}</p>
            <p>Status: {statusLabel(attempt.status)}</p>
            <p>Reviewer: {attempt.reviewer?.username || '-'}</p>
            <p>Repository Link: {attempt.repoUrl}</p>
            <p>Commit Link: {attempt.commitUrl}</p>
            <p>Explanation: {attempt.explanation}</p>
            <p>Test Evidence: {attempt.testEvidence}</p>
            {attempt.decision ? (
              <div>
                <p>Review Time: {formatTime(attempt.reviewedAt)}</p>
                <p>Decision: {attempt.decision === 'PASS' ? 'PASS' : 'REVISION REQUIRED'}</p>
                <p>Feedback: {attempt.feedback}</p>
                {(attempt.comments || []).map((item) => (
                  <p key={item._id}>
                    Admin comment ({item.createdBy?.username || 'Admin'}): {item.text}
                  </p>
                ))}
              </div>
            ) : null}
          </div>

          {attempt.status === 'SUBMITTED' ? (
            <div className="form-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => sendAction('review-queue/' + attempt._id + '/claim')}
              >
                Start Review
              </button>
            </div>
          ) : null}

          {attempt.status === 'UNDER_REVIEW' && isReviewer && !attempt.decision ? (
            <div>
              <form
                className="submit-box"
                onSubmit={(event) => {
                  event.preventDefault()
                  setFeedbackError('')

                  if (!feedback.trim()) {
                    setFeedbackError('This field is required')
                    return
                  }

                  sendAction('review-queue/' + attempt._id + '/decision', {
                    decision,
                    feedback: feedback.trim(),
                  })
                }}
              >
                <h2>Submit Review</h2>
                <div className="field">
                  <label>Decision:</label>
                  <select value={decision} onChange={(event) => setDecision(event.target.value)}>
                    <option value="PASS">PASS</option>
                    <option value="REVISION_REQUIRED">REVISION REQUIRED</option>
                  </select>
                </div>
                <div className="field">
                  <label>Feedback:</label>
                  <textarea
                    className={feedbackError ? 'box-medium input-error' : 'box-medium'}
                    value={feedback}
                    onChange={(event) => {
                      setFeedback(event.target.value)
                      setFeedbackError('')
                    }}
                  />
                  {feedbackError ? <p className="field-error">{feedbackError}</p> : null}
                </div>
                <button type="submit" className="btn-primary">
                  Submit Decision
                </button>
              </form>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => sendAction('review-queue/' + attempt._id + '/release')}
                >
                  Release Review
                </button>
              </div>
            </div>
          ) : null}

          {attempt.status === 'UNDER_REVIEW' && !isReviewer ? (
            <p className="list-empty">
              Locked by {attempt.reviewer?.username || 'another admin'}
            </p>
          ) : null}

          {attempt.decision ? (
            <form
              className="submit-box"
              onSubmit={async (event) => {
                event.preventDefault()
                setCommentError('')
                setMessage('')

                if (!commentText.trim()) {
                  setCommentError('This field is required')
                  return
                }

                const token = getSaved('token')

                try {
                  const response = await fetch(
                    '/api/submissions/review-queue/' +
                      attempt._id +
                      '/comments',
                    {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer ' + token,
                      },
                      body: JSON.stringify({ text: commentText.trim() }),
                    }
                  )

                  const data = await response.json()

                  if (handleAuth(response)) {
                    return
                  }

                  if (!response.ok) {
                    if (data.text) {
                      setCommentError(data.text)
                      return
                    }

                    setMessage(data.message || 'Cannot add comment')
                    return
                  }

                  setAttempt(data)
                  setCommentText('')
                } catch (error) {
                  setMessage('Cannot connect to server')
                }
              }}
            >
              <h2>Add Comment</h2>
              <div className="field">
                <label>Comment:</label>
                <textarea
                  className={commentError ? 'box-medium input-error' : 'box-medium'}
                  value={commentText}
                  onChange={(event) => {
                    setCommentText(event.target.value)
                    setCommentError('')
                  }}
                />
                {commentError ? <p className="field-error">{commentError}</p> : null}
              </div>
              <button type="submit" className="btn-primary">
                Add Comment
              </button>
            </form>
          ) : null}

          {canReassign ? (
            <div className="submit-box">
              <h2>Reassign Review</h2>
              <div className="field">
                <label>Reviewer:</label>
                <select
                  value={nextReviewerId}
                  onChange={(event) => setNextReviewerId(event.target.value)}
                >
                  <option value="">Select reviewer</option>
                  {reviewers.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.username}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  sendAction('review-queue/' + attempt._id + '/reassign', {
                    reviewerId: nextReviewerId,
                  })
                }
              >
                Reassign
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {!attemptId && attempts.length === 0 && !message ? (
        <p className="list-empty">No attempts waiting for review</p>
      ) : null}

      {!attemptId && attempts.length > 0 ? (
        <table className="challenge-table">
          <thead>
            <tr>
              <th>Challenge Number</th>
              <th>Title</th>
              <th>Learner</th>
              <th>Attempt</th>
              <th>Submitted Time</th>
              <th>Status</th>
              <th>Reviewer</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((item) => (
              <tr key={item._id} className={item.selectedForReview ? 'attempt-latest' : ''}>
                <td>{item.challenge?.challengeNumber || '-'}</td>
                <td>{item.challenge?.title || '-'}</td>
                <td>{item.learner?.username || '-'}</td>
                <td>
                  <button type="button" className="table-link" onClick={() => onOpenAttempt(item._id)}>
                    Attempt {item.attemptNumber}
                  </button>
                  {item.selectedForReview ? <span className="latest-tag">Latest</span> : null}
                </td>
                <td>{formatTime(item.submittedAt)}</td>
                <td>{statusLabel(item.status)}</td>
                <td>{item.reviewer?.username || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {!attemptId && reviewed.length > 0 ? (
        <div>
          <h2 className="section-title">Reviewed Attempts</h2>
          <table className="challenge-table">
            <thead>
              <tr>
                <th>Challenge Number</th>
                <th>Title</th>
                <th>Learner</th>
                <th>Attempt</th>
                <th>Review Time</th>
                <th>Decision</th>
              </tr>
            </thead>
            <tbody>
              {reviewed.map((item) => (
                <tr key={item._id}>
                  <td>{item.challenge?.challengeNumber || '-'}</td>
                  <td>{item.challenge?.title || '-'}</td>
                  <td>{item.learner?.username || '-'}</td>
                  <td>
                    <button type="button" className="table-link" onClick={() => onOpenAttempt(item._id)}>
                      Attempt {item.attemptNumber}
                    </button>
                  </td>
                  <td>{formatTime(item.reviewedAt)}</td>
                  <td>{item.decision === 'PASS' ? 'PASS' : 'REVISION REQUIRED'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

export default ReviewQueue
