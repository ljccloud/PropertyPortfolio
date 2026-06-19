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
    console.log('[upload] step 1: resolving data folder');
    const dataFolderId = await getDataFolderId(drive, session.accessToken);
    console.log('[upload] step 1 done: dataFolderId=', dataFolderId);

    console.log('[upload] step 2: resolving property folder for', metadata.propertyAddress, metadata.shortName);
    const propFolderId = await getPropertyFolderId(drive, metadata.propertyAddress, session.accessToken, metadata.shortName);
    console.log('[upload] step 2 done: propFolderId=', propFolderId);

    const ext = '.' + (file.name.split('.').pop() || 'pdf');
    const fileName = buildFileName(
      metadata.propertyAddress,
      metadata.category,
      metadata.description,
      metadata.documentDate,
      ext,
      metadata.shortName
    );
    console.log('[upload] step 3: built filename=', fileName);

    console.log('[upload] step 4: reading buffer + existing docs.json');
    const [buffer, existingDocs] = await Promise.all([
      file.arrayBuffer().then(ab => Buffer.from(ab)),
      readJsonFile<Document[]>(drive, 'documents.json', dataFolderId, session.accessToken).then(d => d || []),
    ]);
    console.log('[upload] step 4 done: bufferBytes=', buffer.length, 'existingDocs=', existingDocs.length);

    console.log('[upload] step 5: uploading file to Drive');
    const { id: driveFileId, viewLink } = await uploadFile(
      drive, fileName, propFolderId, buffer, file.type || 'application/octet-stream'
    );
    console.log('[upload] step 5 done: driveFileId=', driveFileId);

    const docs = existingDocs;
    const newDoc: Document = {
      id: uuid(),
      driveFileId,
      driveFileName: fileName,
      driveViewLink: viewLink,
      uploadedAt: new Date().toISOString(),
      ...metadata,
    };
    docs.push(newDoc);
    console.log('[upload] step 6: writing documents.json with', docs.length, 'docs');
    await writeJsonFile(drive, 'documents.json', dataFolderId, docs, session.accessToken);
    console.log('[upload] step 6 done — upload complete');
    return NextResponse.json({ data: newDoc });
  } catch (e: any) {
    console.error('[upload] FAILED at error:', {
      message: e?.message,
      name: e?.name,
      status: e?.response?.status ?? e?.status ?? e?.code,
      cause: e?.cause ? { message: e.cause.message, code: e.cause.code } : undefined,
      stack: e?.stack?.split('\n').slice(0, 3).join(' | '),
    });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
