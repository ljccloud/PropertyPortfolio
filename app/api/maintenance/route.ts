import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDriveClient, getDataFolderId, readJsonFile, writeJsonFile } from '@/lib/drive';
import { MaintenanceIssue } from '@/types';
import { v4 as uuid } from 'uuid';

async function getSession() {
  const session = await getServerSession(authOptions);
  return session as (typeof session & { accessToken?: string }) | null;
}

async function getIssues(accessToken: string): Promise<MaintenanceIssue[]> {
  const drive = getDriveClient(accessToken);
  const folderId = await getDataFolderId(drive, accessToken);
  const data = await readJsonFile<MaintenanceIssue[]>(drive, 'maintenance.json', folderId, accessToken);
  return data || [];
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const issues = await getIssues(session.accessToken);
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('propertyId');
    const filtered = propertyId ? issues.filter(i => i.propertyId === propertyId) : issues;
    return NextResponse.json({ data: filtered });
  } catch (e: any) {
    console.error('GET /api/maintenance error:', e.message);
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
    const issues = await getIssues(session.accessToken);
    const newIssue: MaintenanceIssue = {
      id: uuid(), ...body,
      status: body.dateResolved ? 'Closed' : 'Open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    issues.push(newIssue);
    await writeJsonFile(drive, 'maintenance.json', folderId, issues, session.accessToken);
    return NextResponse.json({ data: newIssue });
  } catch (e: any) {
    console.error('POST /api/maintenance error:', e.message);
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
    const issues = await getIssues(session.accessToken);
    const idx = issues.findIndex(i => i.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const updated = {
      ...issues[idx], ...updates, id,
      status: (updates.dateResolved || issues[idx].dateResolved) ? 'Closed' : 'Open' as any,
      updatedAt: new Date().toISOString(),
    };
    issues[idx] = updated;
    await writeJsonFile(drive, 'maintenance.json', folderId, issues, session.accessToken);
    return NextResponse.json({ data: updated });
  } catch (e: any) {
    console.error('PUT /api/maintenance error:', e.message);
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
    const issues = await getIssues(session.accessToken);
    const filtered = issues.filter(i => i.id !== id);
    await writeJsonFile(drive, 'maintenance.json', folderId, filtered, session.accessToken);
    return NextResponse.json({ data: { deleted: true } });
  } catch (e: any) {
    console.error('DELETE /api/maintenance error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
