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

function AttemptDetail({ attemptId, onBack, onUnauthorized, onNotFound }) {
  // this page is read only, a submitted attempt cannot be edited
  const [attempt, setAttempt] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const loadAttempt = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')

      try {
        const response = await fetch('/api/submissions/' + attemptId, {
          headers: {
            Authorization: 'Bearer ' + token,
          },
        })

        const data = await response.json()

        if (response.status === 401) {
          onUnauthorized()
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

    loadAttempt()
  }, [attemptId])

  return (
    <div>
      <h1 className="page-title">Attempt Details</h1>

      <p className="list-empty">
        <button type="button" className="link" onClick={onBack}>
          Back
        </button>
      </p>

      {message && <p className="form-message">{message}</p>}

      {attempt && (
        <div className="detail-box">
          <p>Challenge: {attempt.challenge?.challengeNumber || attempt.challenge?.title || '-'}</p>
          <p>
            Attempt: {attempt.attemptNumber}{' '}
            {attempt.selectedForReview ? <span className="latest-tag">Latest</span> : null}
          </p>
          <p>Submitted Time: {formatTime(attempt.submittedAt)}</p>
          <p>Status: {statusLabel(attempt.status)}</p>
          <p>Repository Link: {attempt.repoUrl}</p>
          <p>Commit Link: {attempt.commitUrl}</p>
          <p>Explanation: {attempt.explanation}</p>
          <p>Test Evidence: {attempt.testEvidence}</p>
          {attempt.decision ? (
            <div>
              {/* extra admin comments sit under the first feedback */}
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
          {attempt.status === 'UNDER_REVIEW' ? (
            <p>This attempt is under review. You cannot submit or cancel it.</p>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default AttemptDetail
