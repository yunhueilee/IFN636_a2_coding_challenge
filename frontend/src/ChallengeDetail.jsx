import { useEffect, useState } from 'react'
import SubmitSolution from './SubmitSolution.jsx'
import AttemptHistory from './AttemptHistory.jsx'

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

function ChallengeDetail({ challengeId, onBack, onUnauthorized, onNotFound, onOpenAttempt }) {
  // opening a challenge does not change progress, only submit does
  const [challenge, setChallenge] = useState(null)
  const [message, setMessage] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const loadDetail = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')

      try {
        const response = await fetch(
          '/api/challenges/published/' + challengeId,
          {
            headers: {
              Authorization: 'Bearer ' + token,
            },
          }
        )

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
          setMessage(data.message || 'Cannot load challenge')
          return
        }

        setChallenge(data)
      } catch (error) {
        setMessage('Cannot connect to server')
      }
    }

    loadDetail()
  }, [challengeId])

  return (
    <div>
      <h1 className="page-title">Challenge Details</h1>

      <p className="list-empty">
        <button type="button" className="link" onClick={onBack}>
          Back to Challenges
        </button>
      </p>

      {message && <p className="form-message">{message}</p>}

      {challenge && (
        <div className="detail-box">
          <p>Number: {challenge.challengeNumber || '-'}</p>
          <h2>{challenge.title || '(no title)'}</h2>
          <p>Type: {challenge.type || '-'}</p>
          <p>Difficulty: {challenge.tier || '-'}</p>
          <p>Published: {formatDate(challenge.publishedAt)}</p>
          <p>Description: {challenge.description || '-'}</p>
          <p>Test Example: {challenge.testExample || '-'}</p>
          <p>Expected Result: {challenge.expectedResult || '-'}</p>
          <p>Starter Repository: {challenge.starterRepo || '-'}</p>
          <p>Environment: {challenge.environment || 'Python 3'}</p>
        </div>
      )}

      {challenge && (
        <AttemptHistory
          challengeId={challenge._id}
          refreshKey={refreshKey}
          onUnauthorized={onUnauthorized}
          onOpenAttempt={onOpenAttempt}
        />
      )}

      {challenge && (
        <SubmitSolution
          challengeId={challenge._id}
          refreshKey={refreshKey}
          onUnauthorized={onUnauthorized}
          onSubmitted={() => setRefreshKey(refreshKey + 1)} // reload my attempts after a new submit
        />
      )}
    </div>
  )
}

export default ChallengeDetail
