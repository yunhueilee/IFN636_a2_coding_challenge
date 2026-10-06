import { useEffect, useState } from 'react'
import Login from './Login.jsx'
import LearnerLogin from './LearnerLogin.jsx'
import Register from './Register.jsx'
import Dashboard from './Dashboard.jsx'
import ChallengeList from './ChallengeList.jsx'
import CreateChallenge from './CreateChallenge.jsx'
import Challenges from './Challenges.jsx'
import ReviewQueue from './ReviewQueue.jsx'
import StaffAccounts from './StaffAccounts.jsx'
import ProfilePage from './ProfilePage.jsx'
import NotFound from './NotFound.jsx'
import Forbidden from './Forbidden.jsx'
import { can } from './permissions.js'

function getSavedToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token')
}

function getSavedRole() {
  return localStorage.getItem('role') || sessionStorage.getItem('role') || ''
}

function getSavedUser() {
  return {
    username: localStorage.getItem('username') || sessionStorage.getItem('username') || '',
    email: localStorage.getItem('email') || sessionStorage.getItem('email') || '',
    role: getSavedRole(),
  }
}

function isLearnerRole(role) {
  return role === 'LEARNER'
}

function App() {
  const savedToken = getSavedToken()
  const [isLoggedIn, setIsLoggedIn] = useState(!!savedToken)
  const [role, setRole] = useState(getSavedRole())
  const [path, setPath] = useState(window.location.pathname)
  const [editingChallenge, setEditingChallenge] = useState(null)
  const [errorPage, setErrorPage] = useState('')
  const [user, setUser] = useState(getSavedUser)
  // user info is only shown while logged in
  const currentUser = isLoggedIn ? user : null

  const navigate = (next) => {
    if (window.location.pathname !== next) {
      window.history.pushState({}, '', next)
    }
    setPath(next)
    setErrorPage('')
  }

  useEffect(() => {
    const onPopState = () => {
      setPath(window.location.pathname)
      setErrorPage('')
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (!isLoggedIn) {
      if (path === '/') {
        window.history.replaceState({}, '', '/login')
        setPath('/login')
        return
      }

      if (path.startsWith('/admin/')) {
        window.history.replaceState({}, '', '/admin')
        setPath('/admin')
      }
      return
    }

    if (isLearnerRole(role)) {
      if (path === '/login' || path === '/register') {
        window.history.replaceState({}, '', '/')
        setPath('/')
      }
      return
    }

    if (path === '/admin' || path === '/' || path === '/login' || path === '/register') {
      window.history.replaceState({}, '', '/admin/dashboard')
      setPath('/admin/dashboard')
    }
  }, [isLoggedIn, role, path])

  const handleLogin = (token, rememberMe, username, userRole, email = '') => {
    if (rememberMe) {
      localStorage.setItem('token', token)
      localStorage.setItem('username', username)
      localStorage.setItem('role', userRole)
      localStorage.setItem('email', email)
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('username')
      sessionStorage.removeItem('role')
      sessionStorage.removeItem('email')
    } else {
      sessionStorage.setItem('token', token)
      sessionStorage.setItem('username', username)
      sessionStorage.setItem('role', userRole)
      sessionStorage.setItem('email', email)
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      localStorage.removeItem('role')
      localStorage.removeItem('email')
    }

    setRole(userRole)
    setUser({ username, email, role: userRole })
    setIsLoggedIn(true)
    navigate(isLearnerRole(userRole) ? '/' : '/admin/dashboard')
  }

  const handleLogout = () => {
    const logoutPath = isLearnerRole(role) ? '/login' : '/admin'
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    localStorage.removeItem('role')
    localStorage.removeItem('email')
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('username')
    sessionStorage.removeItem('role')
    sessionStorage.removeItem('email')
    setEditingChallenge(null)
    setErrorPage('')
    setRole('')
    setUser({ username: '', email: '', role: '' })
    setIsLoggedIn(false)
    navigate(logoutPath)
  }

  // keep the header name in step with a saved username
  const handleProfileSaved = (saved) => {
    const storage = localStorage.getItem('token') ? localStorage : sessionStorage
    storage.setItem('username', saved.username)
    setUser((current) => ({ ...current, username: saved.username }))
  }

  const goAdminHome = () => {
    setEditingChallenge(null)
    navigate('/admin/dashboard')
  }

  if (isLoggedIn && isLearnerRole(role)) {
    if (path.startsWith('/admin')) {
      return <NotFound onHome={() => navigate('/')} />
    }

    const learnerPages = {
      '/': 'challenges',
      '/login': 'challenges',
      '/register': 'challenges',
      '/progress': 'progress',
      '/history': 'history',
      '/reviews': 'reviews',
      '/browsing-history': 'browsing',
      '/profile': 'profile',
    }

    const challengeId = path.startsWith('/challenges/') ? path.slice('/challenges/'.length) : ''
    const attemptId = path.startsWith('/attempts/') ? path.slice('/attempts/'.length) : ''

    if (learnerPages[path] || challengeId || attemptId) {
      return (
        <Challenges
          user={currentUser}
          onOpenProfile={() => navigate('/profile')}
          onLogout={handleLogout}
          onUnauthorized={handleLogout}
          page={attemptId ? 'attempt' : challengeId ? 'detail' : learnerPages[path]}
          challengeId={challengeId}
          attemptId={attemptId}
          onProfileSaved={handleProfileSaved}
          onOpenPage={(name, id) => {
            const urls = {
              challenges: '/',
              progress: '/progress',
              history: '/history',
              reviews: '/reviews',
              browsing: '/browsing-history',
              detail: '/challenges/' + id,
              attempt: '/attempts/' + id,
            }
            navigate(urls[name])
          }}
        />
      )
    }

    return <NotFound onHome={() => navigate('/')} />
  }

  if (isLoggedIn) {
    if (errorPage === '403') {
      return <Forbidden onHome={goAdminHome} />
    }

    if (errorPage === '404') {
      return <NotFound onHome={goAdminHome} />
    }

    const canManageChallenges = can(role, 'challengeManagement')
    const canReviewQueue = can(role, 'reviewQueue')
    // /admin/review-queue or /admin/review-queue/:id
    const reviewAttemptId = path.startsWith('/admin/review-queue/')
      ? path.slice('/admin/review-queue/'.length)
      : ''

    if (path === '/profile') {
      return (
        <ProfilePage
          user={currentUser}
          onLogout={handleLogout}
          onUnauthorized={handleLogout}
          onProfileSaved={handleProfileSaved}
          onOpenDashboard={() => navigate('/admin/dashboard')}
          onOpenList={() => navigate('/admin/challenges')}
          onOpenReview={() => navigate('/admin/review-queue')}
          onOpenStaff={() => navigate('/admin/staff')}
          canManageChallenges={canManageChallenges}
          canReviewQueue={canReviewQueue}
          canManageStaff={can(role, 'staffManagement')}
        />
      )
    }

    if (path === '/admin/review-queue' || reviewAttemptId) {
      if (!canReviewQueue) {
        return <Forbidden onHome={goAdminHome} />
      }

      return (
        <ReviewQueue
          attemptId={reviewAttemptId}
          user={currentUser}
          onOpenProfile={() => navigate('/profile')}
          onLogout={handleLogout}
          onForbidden={() => setErrorPage('403')}
          onUnauthorized={handleLogout}
          onNotFound={() => setErrorPage('404')}
          onOpenDashboard={() => navigate('/admin/dashboard')}
          onOpenList={() => navigate('/admin/challenges')}
          onOpenQueue={() => navigate('/admin/review-queue')}
          onOpenAttempt={(id) => navigate('/admin/review-queue/' + id)}
        />
      )
    }

    if (path === '/admin/staff') {
      if (!can(role, 'staffManagement')) {
        return <Forbidden onHome={goAdminHome} />
      }

      return (
        <StaffAccounts
          user={currentUser}
          onOpenProfile={() => navigate('/profile')}
          onLogout={handleLogout}
          onForbidden={() => setErrorPage('403')}
          onUnauthorized={handleLogout}
          onOpenDashboard={() => navigate('/admin/dashboard')}
        />
      )
    }

    if (path === '/admin/create') {
      if (!canManageChallenges) {
        return <Forbidden onHome={goAdminHome} />
      }

      return (
        <CreateChallenge
          key={editingChallenge ? editingChallenge._id : 'new'}
          challenge={editingChallenge}
          user={currentUser}
          onOpenProfile={() => navigate('/profile')}
          onLogout={handleLogout}
          onForbidden={() => setErrorPage('403')}
          onUnauthorized={handleLogout}
          onBack={() => {
            setEditingChallenge(null)
            navigate('/admin/challenges')
          }}
          onOpenDashboard={() => {
            setEditingChallenge(null)
            navigate('/admin/dashboard')
          }}
          onOpenList={() => {
            setEditingChallenge(null)
            navigate('/admin/challenges')
          }}
          onOpenReview={() => {
            setEditingChallenge(null)
            navigate('/admin/review-queue')
          }}
        />
      )
    }

    if (path === '/admin/challenges') {
      if (!canManageChallenges) {
        return <Forbidden onHome={goAdminHome} />
      }

      return (
        <ChallengeList
          user={currentUser}
          onOpenProfile={() => navigate('/profile')}
          onLogout={handleLogout}
          onForbidden={() => setErrorPage('403')}
          onUnauthorized={handleLogout}
          onOpenDashboard={() => navigate('/admin/dashboard')}
          onOpenReview={() => navigate('/admin/review-queue')}
          onCreate={() => {
            setEditingChallenge(null)
            navigate('/admin/create')
          }}
          onOpenChallenge={(item) => {
            setEditingChallenge(item)
            navigate('/admin/create')
          }}
        />
      )
    }

    if (path === '/admin/dashboard' || path === '/admin' || path === '/' || path === '/login' || path === '/register') {
      return (
        <Dashboard
          user={currentUser}
          onOpenProfile={() => navigate('/profile')}
          onLogout={handleLogout}
          canManageChallenges={canManageChallenges}
          canReviewQueue={canReviewQueue}
          canManageStaff={can(role, 'staffManagement')}
          onOpenList={() => navigate('/admin/challenges')}
          onOpenReview={() => navigate('/admin/review-queue')}
          onOpenStaff={() => navigate('/admin/staff')}
        />
      )
    }

    return <NotFound onHome={goAdminHome} />
  }

  if (path === '/register') {
    return <Register onLogin={handleLogin} />
  }

  if (path === '/admin' || path.startsWith('/admin/')) {
    return <Login onLogin={handleLogin} />
  }

  return <LearnerLogin onLogin={handleLogin} />
}

export default App
