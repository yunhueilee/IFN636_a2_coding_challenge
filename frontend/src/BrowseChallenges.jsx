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

function BrowseChallenges({ onUnauthorized, onOpenChallenge }) {
  // published cards only, newest at the front
  const [challenges, setChallenges] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    const loadList = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')

      try {
        const response = await fetch('/api/challenges/published', {
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
          setMessage(data.message || 'Cannot load challenges')
          return
        }

        const newestFirst = data.slice().sort((a, b) => {
          return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
        })
        setChallenges(newestFirst)
      } catch (error) {
        setMessage('Cannot connect to server')
      }
    }

    loadList()
  }, [])

  return (
    <div>
      <h1 className="page-title">Challenges</h1>

      {message && <p className="form-message">{message}</p>}

      {challenges.length === 0 && !message ? (
        <p className="list-empty">No published challenges yet</p>
      ) : null}

      {challenges.length > 0 && (
        <div className="challenge-cards">
          {challenges.map((item) => (
            <button
              key={item._id}
              type="button"
              className="challenge-card"
              onClick={() => onOpenChallenge(item._id)}
            >
              <p>{item.challengeNumber || '-'}</p>
              <h2>{item.title || '(no title)'}</h2>
              <p>Type: {item.type || '-'}</p>
              <p>Difficulty: {item.tier || '-'}</p>
              <p>Published: {formatDate(item.publishedAt)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default BrowseChallenges
