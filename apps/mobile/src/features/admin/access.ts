export type AdminAccess = 'staff' | 'admin';

export const hasAccess = (role: string | undefined, access: AdminAccess): boolean =>
  access === 'admin' ? role === 'admin' : role === 'maintainer' || role === 'admin';
