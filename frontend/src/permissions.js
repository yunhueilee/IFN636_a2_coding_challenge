// who can open which part of the app
export const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN_MANAGER', 'ADMIN']

export const permissions = {
  adminDashboard: ADMIN_ROLES,
  challengeManagement: ['ADMIN', 'ADMIN_MANAGER'],
  reviewQueue: ['ADMIN', 'ADMIN_MANAGER'],
  userList: ADMIN_ROLES,
  dataStatistics: ADMIN_ROLES,
  challengeUpload: ['ADMIN', 'ADMIN_MANAGER'],
  websiteNotification: ADMIN_ROLES,
  learnerChallenges: ['LEARNER'],
}

export function can(role, page) {
  return (permissions[page] || []).includes(role)
}
