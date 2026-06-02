import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import SessionWrapper from '@/components/ui/SessionWrapper';
import BottomNav from '@/components/ui/BottomNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <SessionWrapper>
      <div className="flex flex-col h-screen bg-[#0f1117]">
        <main className="flex-1 overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))]">
          {children}
        </main>
        <BottomNav />
      </div>
    </SessionWrapper>
  );
}
