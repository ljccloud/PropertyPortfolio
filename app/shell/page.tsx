import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SessionWrapper from '@/components/ui/SessionWrapper';
import AppShell from './AppShell';

export default async function ShellPage() {
  const session = await auth();
  if (!session) redirect('/login');
  return (
    <SessionWrapper>
      <AppShell />
    </SessionWrapper>
  );
}
