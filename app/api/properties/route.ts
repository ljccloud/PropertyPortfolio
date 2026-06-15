import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDriveClient, getDataFolderId, readJsonFile, writeJsonFile } from '@/lib/drive';
import { Property } from '@/types';
import { v4 as uuid } from 'uuid';

async function getSession() {
  const session = await getServerSession(authOptions);
  return session as (typeof session & { accessToken?: string }) | null;
}

async function getProperties(accessToken: string): Promise<Property[]> {
  const drive = getDriveClient(accessToken);
  const folderId = await getDataFolderId(drive, accessToken);
  const data = await readJsonFile<Property[]>(drive, 'properties.json', folderId, accessToken);
  return data || [];
}

export async function GET() {
  const session = await getSession();
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized — please sign out and sign in again' }, { status: 401 });
  }
  try {
    const properties = await getProperties(session.accessToken);
    return NextResponse.json({ data: properties });
  } catch (e: any) {
    console.error('GET /api/properties error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized — please sign out and sign in again' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const drive = getDriveClient(session.accessToken);
    const folderId = await getDataFolderId(drive, session.accessToken);
    const properties = await readJsonFile<Property[]>(drive, 'properties.json', folderId, session.accessToken) || [];

    const newProperty: Property = {
      id: uuid(),
      address: body.address,
      shortName: body.shortName || undefined,
      reference: body.reference,
      purchasePrice: body.purchasePrice,
      purchaseDate: body.purchaseDate,
      currentValue: body.currentValue,
      owners: (body.owners || []).map((o: any) => ({ id: o.id, name: o.name, percentage: o.percentage })),
      tenant: body.tenant,
      lettingAgent: body.lettingAgent,
      rentHistory: body.rentHistory || [],
      keyContacts: body.keyContacts || [],
      renovations: body.renovations || [],
      appliances: body.appliances || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    properties.push(newProperty);
    await writeJsonFile(drive, 'properties.json', folderId, properties, session.accessToken);
    return NextResponse.json({ data: newProperty });
  } catch (e: any) {
    console.error('POST /api/properties error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
