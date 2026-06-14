import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDriveClient, getDataFolderId, readJsonFile, writeJsonFile } from '@/lib/drive';
import { Transaction } from '@/types';
import { v4 as uuid } from 'uuid';

async function getSession() {
  const session = await getServerSession(authOptions);
  return session as (typeof session & { accessToken?: string }) | null;
}

async function getTransactions(accessToken: string): Promise<Transaction[]> {
  const drive = getDriveClient(accessToken);
  const folderId = await getDataFolderId(drive, accessToken);
  const data = await readJsonFile<Transaction[]>(drive, 'transactions.json', folderId, session.accessToken);
  return data || [];
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const transactions = await getTransactions(session.accessToken);
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('propertyId');
    const filtered = propertyId ? transactions.filter(t => t.propertyId === propertyId) : transactions;
    return NextResponse.json({ data: filtered });
  } catch (e: any) {
    console.error('GET /api/finance error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const drive = getDriveClient(session.accessToken);
    const folderId = await getDataFolderId(drive, session.accessToken);
    const transactions = await getTransactions(session.accessToken);
    const newTx: Transaction = {
      id: uuid(), ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    transactions.push(newTx);
    await writeJsonFile(drive, 'transactions.json', folderId, transactions, session.accessToken);
    return NextResponse.json({ data: newTx });
  } catch (e: any) {
    console.error('POST /api/finance error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    const drive = getDriveClient(session.accessToken);
    const folderId = await getDataFolderId(drive, session.accessToken);
    const transactions = await getTransactions(session.accessToken);
    const idx = transactions.findIndex(t => t.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    transactions[idx] = { ...transactions[idx], ...updates, id, updatedAt: new Date().toISOString() };
    await writeJsonFile(drive, 'transactions.json', folderId, transactions, session.accessToken);
    return NextResponse.json({ data: transactions[idx] });
  } catch (e: any) {
    console.error('PUT /api/finance error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await req.json();
    const drive = getDriveClient(session.accessToken);
    const folderId = await getDataFolderId(drive, session.accessToken);
    const transactions = await getTransactions(session.accessToken);
    const filtered = transactions.filter(t => t.id !== id);
    await writeJsonFile(drive, 'transactions.json', folderId, filtered, session.accessToken);
    return NextResponse.json({ data: { deleted: true } });
  } catch (e: any) {
    console.error('DELETE /api/finance error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
