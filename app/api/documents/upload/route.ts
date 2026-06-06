import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getDriveClient, getDataFolderId, getPropertyFolderId,
  readJsonFile, writeJsonFile, uploadFile, buildFileName,
} from '@/lib/drive';
import { Document } from '@/types';
import { v4 as uuid } from 'uuid';

async function getSession() {
  const session = await getServerSession(authOptions);
  return session as (typeof session & { accessToken?: string }) | null;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const metadata = JSON.parse(formData.get('metadata') as string);
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const drive = getDriveClient(session.accessToken);
    const dataFolderId = await getDataFolderId(drive, session.accessToken);
    const propFolderId = await getPropertyFolderId(drive, metadata.propertyAddress, session.accessToken);

    const ext = '.' + (file.name.split('.').pop() || 'pdf');
    const fileName = buildFileName(
      metadata.propertyAddress,
      metadata.category,
      metadata.description,
      metadata.documentDate,
      ext
    );

    const buffer = Buffer.from(await file.arrayBuffer());
    const { id: driveFileId, viewLink } = await uploadFile(
      drive, fileName, propFolderId, buffer, file.type || 'application/octet-stream'
    );

    const docs = await readJsonFile<Document[]>(drive, 'documents.json', dataFolderId) || [];
    const newDoc: Document = {
      id: uuid(),
      driveFileId,
      driveFileName: fileName,
      driveViewLink: viewLink,
      uploadedAt: new Date().toISOString(),
      ...metadata,
    };
    docs.push(newDoc);
    await writeJsonFile(drive, 'documents.json', dataFolderId, docs);
    return NextResponse.json({ data: newDoc });
  } catch (e: any) {
    console.error('POST /api/documents/upload error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
