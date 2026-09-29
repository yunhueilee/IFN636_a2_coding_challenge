import { useEffect, useState } from 'react'

function isHttpUrl(value) {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch (error) {
    return false
  }
}

function SubmitSolution({ challengeId, onUnauthorized, onSubmitted, refreshKey }) {
  // lock the form while an attempt is under review, passed, or final failed
  const [form, setForm] = useState({
    repoUrl: '',
    commitUrl: '',
    explanation: '',
    testEvidence: '',
  })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [locked, setLocked] = useState(false)
  const [lockMessage, setLockMessage] = useState('')

  useEffect(() => {
    const loadLock = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')

      try {
        const response = await fetch(
          '/api/submissions?challengeId=' + challengeId,
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

        if (response.ok) {
          if (data.some((item) => item.status === 'UNDER_REVIEW')) {
            setLocked(true)
            setLockMessage('This attempt is under review. You cannot submit or cancel it.')
          } else if (data.some((item) => item.status === 'ACCEPTED')) {
            setLocked(true)
            setLockMessage('This challenge is already completed')
          } else if (data.some((item) => item.status === 'FINAL_FAILED')) {
            setLocked(true)
            setLockMessage('No more attempts are allowed')
          } else {
            setLocked(false)
            setLockMessage('')
          }
        }
      } catch (error) {
        setLocked(false)
      }
    }

    loadLock()
  }, [challengeId, refreshKey])

  const updateField = (name, value) => {
    setForm({ ...form, [name]: value })
    setErrors({ ...errors, [name]: '' })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage('')

    if (locked) {
      setMessage(lockMessage)
      return
    }

    const nextErrors = {}

    if (!form.repoUrl.trim()) {
      nextErrors.repoUrl = 'This field is required'
    } else if (!isHttpUrl(form.repoUrl)) {
      nextErrors.repoUrl = 'Please enter a valid URL'
    }

    if (!form.commitUrl.trim()) {
      nextErrors.commitUrl = 'This field is required'
    } else if (!isHttpUrl(form.commitUrl)) {
      nextErrors.commitUrl = 'Please enter a valid URL'
    }

    if (!form.explanation.trim()) {
      nextErrors.explanation = 'This field is required'
    }

    if (!form.testEvidence.trim()) {
      nextErrors.testEvidence = 'This field is required'
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    const token = localStorage.getItem('token') || sessionStorage.getItem('token')

    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          challengeId,
          repoUrl: form.repoUrl.trim(),
          commitUrl: form.commitUrl.trim(),
          explanation: form.explanation.trim(),
          testEvidence: form.testEvidence.trim(),
        }),
      })

      const data = await response.json()

      if (response.status === 401) {
        onUnauthorized()
        return
      }

      if (!response.ok) {
        if (data.repoUrl || data.commitUrl || data.explanation || data.testEvidence) {
          setErrors(data)
          return
        }

        setMessage(data.message || 'Cannot submit solution')
        return
      }

      setMessage('Attempt ' + data.attemptNumber + ' submitted')
      setForm({
        repoUrl: '',
        commitUrl: '',
        explanation: '',
        testEvidence: '',
      })

      if (onSubmitted) {
        onSubmitted()
      }
    } catch (error) {
      setMessage('Cannot connect to server')
    }
  }

  return (
    <form className="submit-box" onSubmit={handleSubmit}>
      <h2>Submit Solution</h2>

      <div className="field">
        <label>Repository Link:</label>
        <input
          type="text"
          value={form.repoUrl}
          onChange={(event) => updateField('repoUrl', event.target.value)}
          className={errors.repoUrl ? 'input-error' : ''}
          disabled={locked}
        />
        {errors.repoUrl && <p className="field-error">{errors.repoUrl}</p>}
      </div>

      <div className="field">
        <label>Commit Link:</label>
        <input
          type="text"
          value={form.commitUrl}
          onChange={(event) => updateField('commitUrl', event.target.value)}
          className={errors.commitUrl ? 'input-error' : ''}
          disabled={locked}
        />
        {errors.commitUrl && <p className="field-error">{errors.commitUrl}</p>}
      </div>

      <div className="field">
        <label>Explanation:</label>
        <textarea
          className={errors.explanation ? 'box-medium input-error' : 'box-medium'}
          value={form.explanation}
          onChange={(event) => updateField('explanation', event.target.value)}
          disabled={locked}
        />
        {errors.explanation && <p className="field-error">{errors.explanation}</p>}
      </div>

      <div className="field">
        <label>Test Evidence:</label>
        <textarea
          className={errors.testEvidence ? 'box-medium input-error' : 'box-medium'}
          value={form.testEvidence}
          onChange={(event) => updateField('testEvidence', event.target.value)}
          disabled={locked}
        />
        {errors.testEvidence && <p className="field-error">{errors.testEvidence}</p>}
      </div>

      <button type="submit" className="btn-primary" disabled={locked}>
        Submit Attempt
      </button>

      {locked && lockMessage ? <p className="form-message">{lockMessage}</p> : null}

      {message && <p className="form-message">{message}</p>}
    </form>
  )
}

export default SubmitSolution
