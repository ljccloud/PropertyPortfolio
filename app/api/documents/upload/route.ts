import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getDriveClient,
  getDataFolderId,
  getPropertyFolderId,
  readJsonFile,
  writeJsonFile,
  uploadFile,
  buildFileName,
} from '@/lib/drive';
import { Document } from '@/types';
import { v4 as uuid } from 'uuid';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const metadata = JSON.parse(formData.get('metadata') as string);

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const drive = getDriveClient(session.accessToken);
    const dataFolderId = await getDataFolderId(drive);
    const propFolderId = await getPropertyFolderId(drive, metadata.propertyAddress);

    // Build the standardised filename
    const ext = '.' + file.name.split('.').pop();
    const fileName = buildFileName(
      metadata.propertyAddress,
      metadata.category,
      metadata.description,
      metadata.documentDate,
      ext
    );

    // Upload the actual file
    const buffer = Buffer.from(await file.arrayBuffer());
    const { id: driveFileId, viewLink } = await uploadFile(
      drive,
      fileName,
      propFolderId,
      buffer,
      file.type
    );

    // Save document record
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
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
