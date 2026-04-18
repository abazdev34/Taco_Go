import type { UserRole } from '../types/profile'

export function getRedirectPath(role: UserRole | null): string {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'cashier':
      return '/cashier'
    case 'kitchen':
      return '/kitchen'
    case 'hall':
      return '/monitor'
    case 'assembly':
      return '/assembly'
    case 'history':
      return '/history'
    default:
      return '/'
  }
}