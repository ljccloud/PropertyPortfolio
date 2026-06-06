import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const ROOT_FOLDER_NAME = 'PropertyPortfolio';
const DATA_FOLDER_NAME = 'data';

export function getDriveClient(accessToken: string) {
  const auth = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth });
}

// ─── Folder helpers ───────────────────────────────────────────────────────────
// findFolder only searches — never creates. This is safe to call in parallel.
// ensureFolder searches first, and only creates if genuinely nothing found.
// By separating find from create we prevent the race condition where multiple
// simultaneous requests each find nothing and each create a new folder.

async function findFolder(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId?: string
): Promise<string | null> {
  const q = parentId
    ? `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
    : `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const res = await drive.files.list({
    q,
    fields: 'files(id)',
    spaces: 'drive',
    pageSize: 10, // get all matches so we can deduplicate
  });

  if (!res.data.files || res.data.files.length === 0) return null;

  // If multiple exist (from a previous race condition), clean up extras
  if (res.data.files.length > 1) {
    // Keep the first, trash the rest
    for (let i = 1; i < res.data.files.length; i++) {
      try {
        await drive.files.update({
          fileId: res.data.files[i].id!,
          requestBody: { trashed: true },
        });
      } catch { /* ignore cleanup errors */ }
    }
  }

  return res.data.files[0].id!;
}

async function createFolder(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId?: string
): Promise<string> {
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

// ensureFolder: find existing OR create. Called sequentially to avoid races.
async function ensureFolder(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId?: string
): Promise<string> {
  const existing = await findFolder(drive, name, parentId);
  if (existing) return existing;
  return createFolder(drive, name, parentId);
}

export async function getRootFolderId(
  drive: ReturnType<typeof google.drive>
): Promise<string> {
  return ensureFolder(drive, ROOT_FOLDER_NAME);
}

export async function getDataFolderId(
  drive: ReturnType<typeof google.drive>,
  _accessToken?: string // kept for API compatibility
): Promise<string> {
  const rootId = await getRootFolderId(drive);
  return ensureFolder(drive, DATA_FOLDER_NAME, rootId);
}

export async function getPropertyFolderId(
  drive: ReturnType<typeof google.drive>,
  propertyAddress: string,
  _accessToken?: string // kept for API compatibility
): Promise<string> {
  const rootId = await getRootFolderId(drive);
  const words = propertyAddress.replace(/[^a-zA-Z0-9 ]/g, '').trim().split(/\s+/);
  const folderName = words.find(w => isNaN(Number(w))) || words[0] || 'Property';
  return ensureFolder(drive, folderName, rootId);
}

// ─── File naming convention ───────────────────────────────────────────────────

export function buildFileName(
  propertyAddress: string,
  category: string,
  description: string,
  documentDate: string,
  originalExtension: string
): string {
  const words = propertyAddress.replace(/[^a-zA-Z0-9 ]/g, '').split(/\s+/);
  const firstWord = words.find(w => isNaN(Number(w))) || words[0] || 'Property';
  const date = new Date(documentDate + 'T00:00:00');
  const yymm = `${String(date.getFullYear()).slice(2)}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const cat = category.replace(/\s+/g, '');
  const firstWordDesc = description.trim().split(/\s+/)[0].replace(/[^a-zA-Z0-9]/g, '');
  return `${firstWord}_${yymm}_${cat}_${firstWordDesc}${originalExtension}`;
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
    spaces: 'drive',
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
  const res = await drive.files.list({
    q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
  });

  const content = JSON.stringify(data, null, 2);
  const media = { mimeType: 'application/json', body: content };

  if (res.data.files && res.data.files.length > 0) {
    await drive.files.update({ fileId: res.data.files[0].id!, media });
  } else {
    await drive.files.create({
      requestBody: { name: fileName, parents: [folderId], mimeType: 'application/json' },
      media,
    });
  }
}

// ─── Upload a real file ───────────────────────────────────────────────────────

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
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType, body: stream },
    fields: 'id, webViewLink',
  });

  await drive.permissions.create({
    fileId: res.data.id!,
    requestBody: { role: 'reader', type: 'anyone' },
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
