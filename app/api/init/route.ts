import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDriveClient, getDataFolderId, readJsonFile } from '@/lib/drive';
import { Property, Transaction, MaintenanceIssue, Document } from '@/types';

async function getSession() {
  const session = await getServerSession(authOptions);
  return session as (typeof session & { accessToken?: string }) | null;
}

// Single endpoint that loads all data sequentially through ONE Drive connection.
// This prevents the race condition where parallel API calls each try to create
// the data folder simultaneously, resulting in duplicate folders.

export async function GET() {
  const session = await getSession();
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const drive = getDriveClient(session.accessToken);

    // Get data folder ID ONCE — all subsequent reads reuse this ID
    const folderId = await getDataFolderId(drive, session.accessToken);

    // Load all data files sequentially using the same folderId
    const [properties, transactions, maintenance, documents] = await Promise.all([
      readJsonFile<Property[]>(drive, 'properties.json', folderId, accessToken),
      readJsonFile<Transaction[]>(drive, 'transactions.json', folderId, accessToken),
      readJsonFile<MaintenanceIssue[]>(drive, 'maintenance.json', folderId, accessToken),
      readJsonFile<Document[]>(drive, 'documents.json', folderId, accessToken),
    ]);

    return NextResponse.json({
      data: {
        properties: properties || [],
        transactions: transactions || [],
        maintenance: maintenance || [],
        documents: documents || [],
      }
    });
  } catch (e: any) {
    console.error('GET /api/init error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
