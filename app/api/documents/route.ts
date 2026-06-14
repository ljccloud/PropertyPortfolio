import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDriveClient, getDataFolderId, readJsonFile, writeJsonFile, deleteFile } from '@/lib/drive';
import { Document } from '@/types';

async function getSession() {
  const session = await getServerSession(authOptions);
  return session as (typeof session & { accessToken?: string }) | null;
}

async function getDocuments(accessToken: string): Promise<Document[]> {
  const drive = getDriveClient(accessToken);
  const folderId = await getDataFolderId(drive, accessToken);
  const data = await readJsonFile<Document[]>(drive, 'documents.json', folderId, session.accessToken);
  return data || [];
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const docs = await getDocuments(session.accessToken);
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('propertyId');
    const filtered = propertyId ? docs.filter(d => d.propertyId === propertyId) : docs;
    return NextResponse.json({ data: filtered });
  } catch (e: any) {
    console.error('GET /api/documents error:', e.message);
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
    const docs = await getDocuments(session.accessToken);
    const doc = docs.find(d => d.id === id);
    if (doc?.driveFileId) {
      try { await deleteFile(drive, doc.driveFileId); } catch {}
    }
    const filtered = docs.filter(d => d.id !== id);
    await writeJsonFile(drive, 'documents.json', folderId, filtered, session.accessToken);
    return NextResponse.json({ data: { deleted: true } });
  } catch (e: any) {
    console.error('DELETE /api/documents error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
