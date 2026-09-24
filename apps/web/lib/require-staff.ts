import 'server-only';
import { redirect } from 'next/navigation';
import { getCurrentUser, type CurrentUser } from './api-server';

export async function requireStaff(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.role === 'user') redirect('/login');
  return user;
}
