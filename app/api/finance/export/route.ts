import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDriveClient, getDataFolderId, readJsonFile } from '@/lib/drive';
import { Transaction, PeriodFilter, CustomPeriod } from '@/types';
import { resolvePeriod, exportToCsv } from '@/lib/finance';

async function getSession() {
  const session = await getServerSession(authOptions);
  return session as (typeof session & { accessToken?: string }) | null;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const filter = (searchParams.get('filter') || 'tax-ytd') as PeriodFilter;
    const customFrom = searchParams.get('from') || undefined;
    const customTo = searchParams.get('to') || undefined;
    const custom: CustomPeriod | undefined = customFrom && customTo ? { from: customFrom, to: customTo } : undefined;

    const drive = getDriveClient(session.accessToken);
    const folderId = await getDataFolderId(drive);
    const transactions = await readJsonFile<Transaction[]>(drive, 'transactions.json', folderId) || [];
    const period = resolvePeriod(filter, custom);
    const csv = exportToCsv(transactions, period);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="transactions-${filter}.csv"`,
      },
    });
  } catch (e: any) {
    console.error('GET /api/finance/export error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
