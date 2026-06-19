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

    // Load all data files sequentially using the same folderId.
    // Previously these ran via Promise.all — four concurrent Drive API calls
    // on a cold start increased the chance of hitting a transient rate-limit/
    // connection error, and if any one of the four failed, the whole request
    // failed even though retries existed for each individual call. Running
    // them one after another is barely slower (each is a single small file)
    // and removes that compounding risk.
    const properties = await readJsonFile<Property[]>(drive, 'properties.json', folderId, session.accessToken);
    const transactions = await readJsonFile<Transaction[]>(drive, 'transactions.json', folderId, session.accessToken);
    const maintenance = await readJsonFile<MaintenanceIssue[]>(drive, 'maintenance.json', folderId, session.accessToken);
    const documents = await readJsonFile<Document[]>(drive, 'documents.json', folderId, session.accessToken);

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
