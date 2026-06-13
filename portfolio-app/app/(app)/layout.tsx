import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import SessionWrapper from '@/components/ui/SessionWrapper';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');
  return (
    <SessionWrapper>
      {children}
    </SessionWrapper>
  );
}
