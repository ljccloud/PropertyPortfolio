import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const ROOT_FOLDER_NAME = 'PropertyPortfolio';
const DATA_FOLDER_NAME = 'data';

// Module-level cache — persists across requests within the same function instance
// Keyed by token prefix + label to handle multiple users safely
const _cache = new Map<string, string>();

function ck(token: string, label: string) {
  return `${token.slice(0, 24)}:${label}`;
}

export function getDriveClient(accessToken: string) {
  const auth = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth });
}

// ─── Folder helpers ───────────────────────────────────────────────────────────

async function findFolder(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId?: string
): Promise<string | null> {
  const q = parentId
    ? `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
    : `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const res = await drive.files.list({ q, fields: 'files(id)', spaces: 'drive', pageSize: 10 });

  if (!res.data.files || res.data.files.length === 0) return null;

  // Auto-cleanup duplicate folders from previous race conditions
  if (res.data.files.length > 1) {
    for (let i = 1; i < res.data.files.length; i++) {
      try {
        await drive.files.update({ fileId: res.data.files[i].id!, requestBody: { trashed: true } });
      } catch { /* ignore */ }
    }
  }

  return res.data.files[0].id!;
}

async function ensureFolder(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId?: string,
  token?: string,
  cacheLabel?: string
): Promise<string> {
  // Check cache
  if (token && cacheLabel) {
    const cached = _cache.get(ck(token, cacheLabel));
    if (cached) return cached;
  }

  const existing = await findFolder(drive, name, parentId);
  const id = existing ?? (await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: parentId ? [parentId] : undefined },
    fields: 'id',
  })).data.id!;

  if (token && cacheLabel) _cache.set(ck(token, cacheLabel), id);
  return id;
}

export async function getRootFolderId(
  drive: ReturnType<typeof google.drive>,
  token?: string
): Promise<string> {
  return ensureFolder(drive, ROOT_FOLDER_NAME, undefined, token, 'root');
}

export async function getDataFolderId(
  drive: ReturnType<typeof google.drive>,
  token?: string
): Promise<string> {
  const rootId = await getRootFolderId(drive, token);
  return ensureFolder(drive, DATA_FOLDER_NAME, rootId, token, 'data');
}

export async function getPropertyFolderId(
  drive: ReturnType<typeof google.drive>,
  propertyAddress: string,
  token?: string
): Promise<string> {
  const rootId = await getRootFolderId(drive, token);
  const words = propertyAddress.replace(/[^a-zA-Z0-9 ]/g, '').trim().split(/\s+/);
  const name = words.find(w => isNaN(Number(w))) || words[0] || 'Property';
  return ensureFolder(drive, name, rootId, token, `prop:${name}`);
}

// ─── File naming ──────────────────────────────────────────────────────────────

export function buildFileName(
  propertyAddress: string,
  category: string,
  description: string,
  documentDate: string,
  ext: string
): string {
  const words = propertyAddress.replace(/[^a-zA-Z0-9 ]/g, '').split(/\s+/);
  const first = words.find(w => isNaN(Number(w))) || words[0] || 'Property';
  const d = new Date(documentDate + 'T00:00:00');
  const yymm = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const cat = category.replace(/\s+/g, '');
  const desc = description.trim().split(/\s+/)[0].replace(/[^a-zA-Z0-9]/g, '');
  return `${first}_${yymm}_${cat}_${desc}${ext}`;
}

// ─── JSON helpers ─────────────────────────────────────────────────────────────

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
  if (!res.data.files?.length) return null;

  const content = await drive.files.get(
    { fileId: res.data.files[0].id!, alt: 'media' },
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

  const body = JSON.stringify(data, null, 2);
  const media = { mimeType: 'application/json', body };

  if (res.data.files?.length) {
    await drive.files.update({ fileId: res.data.files[0].id!, media });
  } else {
    await drive.files.create({
      requestBody: { name: fileName, parents: [folderId], mimeType: 'application/json' },
      media,
    });
  }
}

// ─── File upload ──────────────────────────────────────────────────────────────

export async function uploadFile(
  drive: ReturnType<typeof google.drive>,
  fileName: string,
  folderId: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ id: string; viewLink: string }> {
  const { Readable } = require('stream');
  const res = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType, body: Readable.from(buffer) },
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
