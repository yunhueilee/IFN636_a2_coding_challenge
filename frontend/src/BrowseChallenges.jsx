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
  const [sortBy, setSortBy] = useState('newest')
  const [typeFilter, setTypeFilter] = useState('')


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

  function sortAtoZ(challenges) {
    return challenges.slice().sort((a, b) => {
      return a.title.localeCompare(b.title)
    })
  }

  function sortNewestFirst(challenges) {
    return challenges.slice().sort((a, b) => {
      return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
    })
  }

  // function sortAttempts(challenges) {
  //   return challenges.slice().sort((a, b) => {
  //     return (b.attemptCount || 0) - (a.attemptCount || 0)
  //   })
  // }

  function sortDifficulty91(challenges) {
    return challenges.slice().sort((a, b) => {
      return Number(b.tier || 0) - Number(a.tier || 0)
    })
  }

  function sortDifficulty19(challenges) {
    return challenges.slice().sort((a, b) => {
      return Number(a.tier || 0) - Number(b.tier || 0)
    })
  }

  const filteredChallenges = typeFilter
    ? challenges.filter((challenge) => challenge.type === typeFilter)
    : challenges



  const sortedChallenges =
    sortBy === 'alphabetical'
      ? sortAtoZ(filteredChallenges)
      // : sortBy === 'attempts'
      //   ? sortAttempts(filteredChallenges)
        : sortBy === 'Difficulty91'
          ? sortDifficulty91(filteredChallenges)
          : sortBy === 'Difficulty19'
            ? sortDifficulty19(filteredChallenges)
            : sortNewestFirst(filteredChallenges)



  return (
    <div>
      <h1 className="page-title">Challenges</h1>

      {message && <p className="form-message">{message}</p>}

      <div className="challenge-sort-controls">
        <button type="button" onClick={() => setSortBy('newest')}>Newest</button>
        {/* <button type="button" onClick={() => setSortBy('attempts')}>Most attempts</button> */}
        <button type="button" onClick={() => setSortBy('alphabetical')}>A-Z</button>
        <button type="button" onClick={() => setSortBy('Difficulty19')}>Difficulty: Easiet to Hardest</button>
        <button type="button" onClick={() => setSortBy('Difficulty91')}>Difficulty: Hardest to Easiet</button>
        <label htmlFor="challenge-type-filter">Filter type: </label>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          <option value="">All</option>
          <option value="Debugging">Debugging</option>
          <option value="Feature">Feature</option>
          <option value="Refactoring">Refactoring</option>
          <option value="Security">Security</option>
        </select>
      </div>

      {sortedChallenges.length === 0 && !message ? (
        <p className="list-empty">No published challenges yet</p>
      ) : null}

      {sortedChallenges.length > 0 && (
        <div className="challenge-cards">
          {sortedChallenges.map((item) => (
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
