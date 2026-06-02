import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDriveClient, getDataFolderId, readJsonFile, writeJsonFile } from '@/lib/drive';
import { Property } from '@/types';
import { v4 as uuid } from 'uuid';

async function getProperties(accessToken: string): Promise<Property[]> {
  const drive = getDriveClient(accessToken);
  const folderId = await getDataFolderId(drive);
  const data = await readJsonFile<Property[]>(drive, 'properties.json', folderId);
  return data || [];
}

export async function GET() {
  const session = await auth();
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const properties = await getProperties(session.accessToken);
    return NextResponse.json({ data: properties });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const drive = getDriveClient(session.accessToken);
    const folderId = await getDataFolderId(drive);
    const properties = await getProperties(session.accessToken);

    const newProperty: Property = {
      id: uuid(),
      ...body,
      rentHistory: body.rentHistory || [],
      keyContacts: body.keyContacts || [],
      owners: body.owners || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    properties.push(newProperty);
    await writeJsonFile(drive, 'properties.json', folderId, properties);
    return NextResponse.json({ data: newProperty });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
