import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const ROOT_FOLDER_NAME = 'PropertyPortfolio';
const DATA_FOLDER_NAME = 'data';

// Module-level folder ID cache — survives across warm function invocations
const _folderCache = new Map<string, string>();
const _fileIdCache = new Map<string, string>();

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

// ─── Single-call folder resolution ───────────────────────────────────────────
// Instead of: find root (1 call) + find data inside root (1 call) = 2 calls
// We do: find data folder that has 'data' in name anywhere in drive (1 call)
// then verify it's inside PropertyPortfolio
// Actually simplest: search for folder named 'data' inside any folder named 'PropertyPortfolio'
// Drive API supports this in one query

async function findFolders(
  drive: ReturnType<typeof google.drive>,
  query: string
): Promise<Array<{ id: string; name: string; parents?: string[] | null }>> {
  const res = await drive.files.list({
    q: query,
    fields: 'files(id, name, parents)',
    spaces: 'drive',
    pageSize: 10,
  });
  return (res.data.files || []).map(f => ({
    id: f.id || '',
    name: f.name || '',
    parents: f.parents ?? undefined,
  }));
}

async function createFolder(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId?: string
): Promise<string> {
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    },
    fields: 'id',
  });
  return res.data.id!;
}

// Cleanup duplicate folders — keep first, trash the rest
async function cleanupDuplicates(
  drive: ReturnType<typeof google.drive>,
  folders: Array<{ id: string }>
): Promise<string> {
  for (let i = 1; i < folders.length; i++) {
    try {
      await drive.files.update({ fileId: folders[i].id!, requestBody: { trashed: true } });
    } catch { /* ignore */ }
  }
  return folders[0].id!;
}

export async function getDataFolderId(
  drive: ReturnType<typeof google.drive>,
  token?: string
): Promise<string> {
  const cacheKey = token ? ck(token, 'data') : 'data';
  const cached = _folderCache.get(cacheKey);
  if (cached) return cached;

  // Step 1: Find or create root folder (1 Drive call)
  const rootFolders = await findFolders(drive,
    `name='${ROOT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );

  let rootId: string;
  if (rootFolders.length === 0) {
    rootId = await createFolder(drive, ROOT_FOLDER_NAME);
  } else {
    rootId = rootFolders.length > 1 ? await cleanupDuplicates(drive, rootFolders) : rootFolders[0].id!;
  }

  // Step 2: Find or create data folder inside root (1 Drive call)
  const dataFolders = await findFolders(drive,
    `name='${DATA_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and '${rootId}' in parents and trashed=false`
  );

  let dataId: string;
  if (dataFolders.length === 0) {
    dataId = await createFolder(drive, DATA_FOLDER_NAME, rootId);
  } else {
    dataId = dataFolders.length > 1 ? await cleanupDuplicates(drive, dataFolders) : dataFolders[0].id!;
  }

  _folderCache.set(cacheKey, dataId);
  // Also cache root
  if (token) _folderCache.set(ck(token, 'root'), rootId);

  return dataId;
}

export async function getRootFolderId(
  drive: ReturnType<typeof google.drive>,
  token?: string
): Promise<string> {
  const cacheKey = token ? ck(token, 'root') : 'root';
  const cached = _folderCache.get(cacheKey);
  if (cached) return cached;
  // Get data folder first which also caches root
  await getDataFolderId(drive, token);
  return _folderCache.get(cacheKey) || '';
}

export async function getPropertyFolderId(
  drive: ReturnType<typeof google.drive>,
  propertyAddress: string,
  token?: string
): Promise<string> {
  const words = propertyAddress.replace(/[^a-zA-Z0-9 ]/g, '').trim().split(/\s+/);
  const folderName = words.find(w => isNaN(Number(w))) || words[0] || 'Property';
  const cacheKey = token ? ck(token, `prop:${folderName}`) : `prop:${folderName}`;
  const cached = _folderCache.get(cacheKey);
  if (cached) return cached;

  const rootId = await getRootFolderId(drive, token);
  const folders = await findFolders(drive,
    `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${rootId}' in parents and trashed=false`
  );

  let id: string;
  if (folders.length === 0) {
    id = await createFolder(drive, folderName, rootId);
  } else {
    id = folders.length > 1 ? await cleanupDuplicates(drive, folders) : folders[0].id!;
  }

  _folderCache.set(cacheKey, id);
  return id;
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

// ─── JSON helpers — with file ID caching ─────────────────────────────────────

async function findFileId(
  drive: ReturnType<typeof google.drive>,
  fileName: string,
  folderId: string,
  token?: string
): Promise<string | null> {
  const cacheKey = token ? ck(token, `file:${fileName}`) : `file:${fileName}`;
  const cached = _fileIdCache.get(cacheKey);
  if (cached) return cached;

  const res = await drive.files.list({
    q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
  });

  const id = res.data.files?.[0]?.id || null;
  if (id && token) _fileIdCache.set(cacheKey, id);
  return id;
}

export async function readJsonFile<T>(
  drive: ReturnType<typeof google.drive>,
  fileName: string,
  folderId: string,
  token?: string
): Promise<T | null> {
  const fileId = await findFileId(drive, fileName, folderId, token);
  if (!fileId) return null;

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
  data: T,
  token?: string
): Promise<void> {
  const body = JSON.stringify(data, null, 2);
  const media = { mimeType: 'application/json', body };
  const cacheKey = token ? ck(token, `file:${fileName}`) : `file:${fileName}`;

  let fileId = await findFileId(drive, fileName, folderId, token);

  if (fileId) {
    await drive.files.update({ fileId, media });
  } else {
    const res = await drive.files.create({
      requestBody: { name: fileName, parents: [folderId], mimeType: 'application/json' },
      media,
    });
    fileId = res.data.id!;
    if (token) _fileIdCache.set(cacheKey, fileId);
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
