import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getCurrentUser } from '@/lib/api-server';

export async function AuthPage({ children }: { children: ReactNode }) {
  if (await getCurrentUser()) redirect('/');
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      {children}
    </main>
  );
}
