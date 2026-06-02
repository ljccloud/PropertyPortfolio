import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const ROOT_FOLDER_NAME = 'Portfolio App';
const DATA_FOLDER_NAME = 'data';

let driveClient: ReturnType<typeof google.drive> | null = null;

export function getDriveClient(accessToken: string) {
  const auth = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth });
}

// ─── Folder helpers ───────────────────────────────────────────────────────────

export async function findOrCreateFolder(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId?: string
): Promise<string> {
  const query = parentId
    ? `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
    : `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const res = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    },
    fields: 'id',
  });

  return folder.data.id!;
}

export async function getRootFolderId(
  drive: ReturnType<typeof google.drive>
): Promise<string> {
  return findOrCreateFolder(drive, ROOT_FOLDER_NAME);
}

export async function getDataFolderId(
  drive: ReturnType<typeof google.drive>
): Promise<string> {
  const rootId = await getRootFolderId(drive);
  return findOrCreateFolder(drive, DATA_FOLDER_NAME, rootId);
}

export async function getPropertyFolderId(
  drive: ReturnType<typeof google.drive>,
  propertyAddress: string
): Promise<string> {
  const rootId = await getRootFolderId(drive);
  const folderName = propertyAddress.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
  return findOrCreateFolder(drive, folderName, rootId);
}

// ─── File naming convention ────────────────────────────────────────────────
// Format: FirstWordAddress_YYMM_Category_FirstWordDescription

export function buildFileName(
  propertyAddress: string,
  category: string,
  description: string,
  documentDate: string,
  originalExtension: string
): string {
  const firstWordAddress = propertyAddress.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
  const date = new Date(documentDate);
  const yymm = `${String(date.getFullYear()).slice(2)}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const cat = category.replace(/\s+/g, '');
  const firstWordDesc = description.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
  return `${firstWordAddress}_${yymm}_${cat}_${firstWordDesc}${originalExtension}`;
}

// ─── JSON data helpers ────────────────────────────────────────────────────────

export async function readJsonFile<T>(
  drive: ReturnType<typeof google.drive>,
  fileName: string,
  folderId: string
): Promise<T | null> {
  const res = await drive.files.list({
    q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id)',
  });

  if (!res.data.files || res.data.files.length === 0) return null;

  const fileId = res.data.files[0].id!;
  const content = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'text' }
  );

  return JSON.parse(content.data as string) as T;
}

export async function writeJsonFile<T>(
  drive: ReturnType<typeof google.drive>,
  fileName: string,
  folderId: string,
  data: T
): Promise<void> {
  // Check if file exists
  const res = await drive.files.list({
    q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id)',
  });

  const content = JSON.stringify(data, null, 2);
  const media = {
    mimeType: 'application/json',
    body: content,
  };

  if (res.data.files && res.data.files.length > 0) {
    // Update existing
    await drive.files.update({
      fileId: res.data.files[0].id!,
      media,
    });
  } else {
    // Create new
    await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
        mimeType: 'application/json',
      },
      media,
    });
  }
}

// ─── Upload a real file ────────────────────────────────────────────────────

export async function uploadFile(
  drive: ReturnType<typeof google.drive>,
  fileName: string,
  folderId: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<{ id: string; viewLink: string }> {
  const { Readable } = require('stream');
  const stream = Readable.from(fileBuffer);

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, webViewLink',
  });

  // Make it viewable by anyone with the link
  await drive.permissions.create({
    fileId: res.data.id!,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  return {
    id: res.data.id!,
    viewLink: res.data.webViewLink || `https://drive.google.com/file/d/${res.data.id}/view`,
  };
}

export async function deleteFile(
  drive: ReturnType<typeof google.drive>,
  fileId: string
): Promise<void> {
  await drive.files.delete({ fileId });
}
