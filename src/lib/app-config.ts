export const appConfig = {
  name: import.meta.env.VITE_APP_NAME || 'Reservi',
  homePath: '/dashboard',
  loginPath: '/login',
  forgotPasswordPath: '/forgot-password',
  passwordRecoveryPath: '/reset-password',
  publicBookPath: '/book',
  adminUsersPath: '/admin/users',
}
