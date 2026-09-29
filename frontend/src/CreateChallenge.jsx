import { useState } from 'react'

const emptyForm = {
  title: '',
  type: '',
  tier: '',
  keywords: [],
  description: '',
  testExample: '',
  expectedResult: '',
  starterRepo: '',
  reviewCriteria: '',
}

const requiredFields = [
  'title',
  'type',
  'tier',
  'description',
  'testExample',
  'expectedResult',
  'starterRepo',
  'reviewCriteria',
]

function formFromChallenge(challenge) {
  if (!challenge) {
    return emptyForm
  }

  return {
    title: challenge.title || '',
    type: challenge.type || '',
    tier: challenge.tier ? String(challenge.tier) : '',
    keywords: challenge.keywords || [],
    description: challenge.description || '',
    testExample: challenge.testExample || '',
    expectedResult: challenge.expectedResult || '',
    starterRepo: challenge.starterRepo || '',
    reviewCriteria: challenge.reviewCriteria || '',
  }
}

function CreateChallenge({ onLogout, onBack, onOpenDashboard, onOpenList, onOpenReview, challenge, onForbidden, onUnauthorized }) {
  const [form, setForm] = useState(() => formFromChallenge(challenge))
  const [errors, setErrors] = useState({})
  const [keywordText, setKeywordText] = useState('')
  const [message, setMessage] = useState('')
  const [savedId, setSavedId] = useState(challenge?._id || '')
  const [challengeNumber, setChallengeNumber] = useState(challenge?.challengeNumber || 'Auto')
  const [status, setStatus] = useState(challenge?.status || 'DRAFT')
  const [publishedAt, setPublishedAt] = useState(challenge?.publishedAt || '')
  const publisher =
    challenge?.createdBy?.username ||
    localStorage.getItem('username') ||
    sessionStorage.getItem('username') ||
    ''
  const formatDay = (value) => {
    if (!value) {
      return ''
    }

    return new Date(value).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const createdDate = formatDay(challenge?.createdAt || Date.now())
  const publishedDate = formatDay(publishedAt)

  const updateField = (name, value) => {
    setForm({ ...form, [name]: value })
  }

  const addKeyword = () => {
    const word = keywordText.trim()

    if (!word) {
      return
    }

    if (form.keywords.includes(word)) {
      setKeywordText('')
      return
    }

    setForm({ ...form, keywords: [...form.keywords, word] })
    setKeywordText('')
  }

  const removeKeyword = (word) => {
    setForm({
      ...form,
      keywords: form.keywords.filter((item) => item !== word),
    })
  }

  const handleApiError = (response, data, fallback) => {
    if (response.status === 403) {
      onForbidden()
      return true
    }

    if (response.status === 401) {
      onUnauthorized()
      return true
    }

    if (!response.ok) {
      setMessage(data.message || fallback)
      return true
    }

    return false
  }

  const saveChallenge = async () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    const body = {
      keywords: form.keywords,
    }

    requiredFields.forEach((name) => {
      if (String(form[name]).trim()) {
        body[name] = name === 'tier' ? Number(form.tier) : form[name].trim()
      }
    })

    const isEdit = Boolean(savedId)
    const url = isEdit
      ? '/api/challenges/' + savedId
      : '/api/challenges'

    const response = await fetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (handleApiError(response, data, 'Cannot create challenge')) {
      return null
    }

    return data
  }

  const updateStatus = async (id, nextStatus) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    const response = await fetch('/api/challenges/' + id + '/status', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({ status: nextStatus }),
    })

    const data = await response.json()

    if (handleApiError(response, data, 'Cannot update status')) {
      return null
    }

    return data
  }

  // only publish needs every box filled
  const handlePublish = async () => {
    const nextErrors = {}

    requiredFields.forEach((name) => {
      if (!String(form[name]).trim()) {
        nextErrors[name] = true
      }
    })

    if (form.keywords.length === 0) {
      nextErrors.keywords = true
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setMessage('')

    try {
      const saved = await saveChallenge()

      if (!saved) {
        return
      }

      setSavedId(saved._id)
      setChallengeNumber(saved.challengeNumber)

      const data = await updateStatus(saved._id, 'PUBLISHED')

      if (!data) {
        return
      }

      setStatus(data.status)
      setPublishedAt(data.publishedAt)
      setMessage('Challenge published')
    } catch (error) {
      setMessage('Cannot connect to server')
    }
  }

  const handleClose = async () => {
    if (status !== 'PUBLISHED' || !savedId) {
      setMessage('Only a published challenge can be closed')
      return
    }

    setErrors({})
    setMessage('')

    try {
      const data = await updateStatus(savedId, 'CLOSED')

      if (!data) {
        return
      }

      setStatus(data.status)
      setMessage('Challenge closed')
    } catch (error) {
      setMessage('Cannot connect to server')
    }
  }

  const handleDiscard = async () => {
    if (status !== 'DRAFT') {
      return
    }

    if (!savedId) {
      onBack()
      return
    }

    setMessage('')

    const token = localStorage.getItem('token') || sessionStorage.getItem('token')

    try {
      const response = await fetch('/api/challenges/' + savedId, {
        method: 'DELETE',
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
        setMessage(data.message || 'Cannot discard draft')
        return
      }

      setSavedId('')
      setChallengeNumber('Auto')
      onBack()
    } catch (error) {
      setMessage('Cannot connect to server')
    }
  }

  const saveDraft = async () => {
    setErrors({})
    setMessage('')

    try {
      const data = await saveChallenge()

      if (!data) {
        return
      }

      setSavedId(data._id)
      setChallengeNumber(data.challengeNumber)
      setStatus(data.status)
      setMessage('Draft saved')
    } catch (error) {
      setMessage('Cannot connect to server')
    }
  }

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
          <button type="button" className="nav-link" onClick={onOpenReview}>
            Review Queue
          </button>
          <button type="button" className="nav-logout" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      <h1 className="create-title">Create Challenge</h1>

      <div className="form-panels">
        <div className="form-panel">
          <div className="field">
            {/* we do not type this, the server makes CCP-CH-001, 002, ... */}
            <input type="text" value={'Challenge Number: ' + challengeNumber} disabled />
          </div>

          <div className="field">
            <input
              type="text"
              placeholder="Title *"
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
              className={errors.title ? 'input-error' : ''}
            />
            {errors.title && <p className="field-error">This field is required</p>}
          </div>

          <div className="field">
            <select
              value={form.type}
              onChange={(event) => updateField('type', event.target.value)}
              className={errors.type ? 'input-error' : ''}
            >
              <option value="">Challenge Type *</option>
              <option value="Debugging">Debugging</option>
              <option value="Feature">Feature</option>
              <option value="Refactoring">Refactoring</option>
              <option value="Security">Security</option>
            </select>
            {errors.type && <p className="field-error">This field is required</p>}
          </div>

          <div className="field">
            <input
              type="text"
              placeholder="Difficulty Tier *"
              value={form.tier}
              onChange={(event) => updateField('tier', event.target.value)}
              className={errors.tier ? 'input-error' : ''}
            />
            {errors.tier && <p className="field-error">This field is required</p>}
          </div>

          <div className="field">
            {/* type a word, click Add, repeat */}
            <div className="keyword-row">
              <input
                type="text"
                placeholder="Keywords *"
                value={keywordText}
                onChange={(event) => setKeywordText(event.target.value)}
                className={errors.keywords ? 'input-error' : ''}
              />
              <button type="button" className="keyword-add" onClick={addKeyword}>
                Add
              </button>
            </div>
            <div className="keyword-list">
              {form.keywords.map((word) => (
                <button
                  key={word}
                  type="button"
                  className="keyword-tag"
                  onClick={() => removeKeyword(word)}
                >
                  {word} ×
                </button>
              ))}
            </div>
            {errors.keywords && <p className="field-error">This field is required</p>}
          </div>

          <div className="field">
            <textarea
              className={errors.description ? 'box-tall input-error' : 'box-tall'}
              placeholder="Description *"
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
            />
            {errors.description && <p className="field-error">This field is required</p>}
          </div>
        </div>

        <div className="form-panel">
          <div className="field">
            <textarea
              className={errors.testExample ? 'box-medium input-error' : 'box-medium'}
              placeholder="Test Example *"
              value={form.testExample}
              onChange={(event) => updateField('testExample', event.target.value)}
            />
            {errors.testExample && <p className="field-error">This field is required</p>}
          </div>

          <div className="field">
            <textarea
              className={errors.expectedResult ? 'box-medium input-error' : 'box-medium'}
              placeholder="Expected Result Example *"
              value={form.expectedResult}
              onChange={(event) => updateField('expectedResult', event.target.value)}
            />
            {errors.expectedResult && <p className="field-error">This field is required</p>}
          </div>

          <div className="field">
            {/* github repo the learner clones to start the task */}
            <input
              type="text"
              placeholder="Starter Repository Link *"
              value={form.starterRepo}
              onChange={(event) => updateField('starterRepo', event.target.value)}
              className={errors.starterRepo ? 'input-error' : ''}
            />
            {errors.starterRepo && <p className="field-error">This field is required</p>}
          </div>

          <div className="field">
            {/* how a reviewer should mark the learner's code */}
            <textarea
              className={errors.reviewCriteria ? 'box-medium input-error' : 'box-medium'}
              placeholder="Review Criteria *"
              value={form.reviewCriteria}
              onChange={(event) => updateField('reviewCriteria', event.target.value)}
            />
            {errors.reviewCriteria && <p className="field-error">This field is required</p>}
          </div>

          <div className="field">
            {/* this unit only uses Python 3, admin cannot change it */}
            <input type="text" value="Environment: Python 3" disabled />
          </div>

          <div className="field">
            {/* taken from the person who logged in */}
            <input
              type="text"
              value={'Publisher: ' + (publisher || 'Unknown')}
              disabled
            />
          </div>

          <div className="field">
            {/* shown as today; the database also stores createdAt */}
            <input
              type="text"
              value={publishedDate ? 'Published: ' + publishedDate : 'Date: ' + createdDate}
              disabled
            />
          </div>
        </div>
      </div>

      <div className="form-actions">
        {status === 'DRAFT' && (
          <button type="button" className="btn-secondary" onClick={saveDraft}>
            Save Draft
          </button>
        )}
        {status === 'DRAFT' && (
          <button type="button" className="btn-cancel" onClick={handleDiscard}>
            Discard Draft
          </button>
        )}
        {status === 'DRAFT' && (
          <button type="button" className="btn-primary" onClick={handlePublish}>
            Publish Challenge
          </button>
        )}
        {status === 'PUBLISHED' && (
          <button type="button" className="btn-cancel" onClick={handleClose}>
            Close Challenge
          </button>
        )}
        <button type="button" className="btn-cancel" onClick={onBack}>
          Cancel
        </button>
      </div>

      {message && <p className="form-message">{message}</p>}
    </div>
  )
}

export default CreateChallenge
