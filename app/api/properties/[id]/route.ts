import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDriveClient, getDataFolderId, readJsonFile, writeJsonFile } from '@/lib/drive';
import { Property } from '@/types';

type Params = { params: Promise<{ id: string }> };

async function getSession() {
  const session = await getServerSession(authOptions);
  return session as (typeof session & { accessToken?: string }) | null;
}

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const drive = getDriveClient(session.accessToken);
    const folderId = await getDataFolderId(drive, session.accessToken);
    const properties = await readJsonFile<Property[]>(drive, 'properties.json', folderId, session.accessToken) || [];
    const property = properties.find(p => p.id === id);
    if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: property });
  } catch (e: any) {
    console.error(`GET /api/properties/${id} error:`, e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const drive = getDriveClient(session.accessToken);
    const folderId = await getDataFolderId(drive, session.accessToken);
    console.log(`PUT /api/properties/${id}: resolved folderId=${folderId}`);
    const properties = await readJsonFile<Property[]>(drive, 'properties.json', folderId, session.accessToken) || [];
    console.log(`PUT /api/properties/${id}: loaded ${properties.length} properties`);
    const idx = properties.findIndex(p => p.id === id);
    if (idx === -1) {
      console.error(`PUT /api/properties/${id}: not found among IDs`, properties.map(p => p.id));
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    properties[idx] = { ...properties[idx], ...body, id, updatedAt: new Date().toISOString() };
    await writeJsonFile(drive, 'properties.json', folderId, properties, session.accessToken);
    console.log(`PUT /api/properties/${id} success, returning data for:`, properties[idx].address);
    return NextResponse.json({ data: properties[idx] });
  } catch (e: any) {
    console.error(`PUT /api/properties/${id} error:`, e?.message, e?.response?.status, e?.code);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const drive = getDriveClient(session.accessToken);
    const folderId = await getDataFolderId(drive, session.accessToken);
    const properties = await readJsonFile<Property[]>(drive, 'properties.json', folderId, session.accessToken) || [];
    const filtered = properties.filter(p => p.id !== id);
    await writeJsonFile(drive, 'properties.json', folderId, filtered, session.accessToken);
    return NextResponse.json({ data: { deleted: true } });
  } catch (e: any) {
    console.error(`DELETE /api/properties/${id} error:`, e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
