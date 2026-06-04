import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AppShellPage() {
  const session = await auth();
  if (!session) redirect('/login');
  return null; // shell is rendered client-side below
}
