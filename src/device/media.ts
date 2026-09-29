import { Dirs, FileSystem } from 'react-native-file-access';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
} from 'react-native-image-picker';
import type { DraftPhoto } from '../domain';

const mediaRoot = `${Dirs.DocumentDir}/ForestLog/media`;

export class MediaPermissionError extends Error {}

function createLocalId(): string {
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
}

function extension(asset: Asset): string {
  const fromName = asset.fileName?.match(/\.[a-zA-Z0-9]+$/)?.[0];
  if (fromName) {
    return fromName.toLowerCase();
  }
  return asset.type === 'image/png' ? '.png' : '.jpg';
}

async function persistAssets(
  patrolId: string,
  assets: Asset[],
): Promise<DraftPhoto[]> {
  const directory = `${mediaRoot}/${patrolId}`;
  if (!(await FileSystem.exists(directory))) {
    await FileSystem.mkdir(directory);
  }
  const photos: DraftPhoto[] = [];
  try {
    for (const [position, asset] of assets.entries()) {
      if (!asset.uri) {
        continue;
      }
      const id = createLocalId();
      const path = `${directory}/${id}${extension(asset)}`;
      await FileSystem.cp(asset.uri, path);
      photos.push({
        id,
        localUri: `file://${path}`,
        position,
        createdAt: new Date().toISOString(),
      });
    }
    return photos;
  } catch (error) {
    await removeMediaFiles(photos.map(photo => photo.localUri));
    throw error;
  }
}

function pickerError(response: {
  errorCode?: string;
  errorMessage?: string;
}): Error {
  const message = response.errorMessage || 'Không thể mở ảnh trên thiết bị.';
  return response.errorCode === 'permission'
    ? new MediaPermissionError(message)
    : new Error(message);
}

export async function takePhoto(patrolId: string): Promise<DraftPhoto[]> {
  const response = await launchCamera({ mediaType: 'photo', quality: 0.8 });
  if (response.didCancel) {
    return [];
  }
  if (response.errorCode) {
    throw pickerError(response);
  }
  return persistAssets(patrolId, response.assets ?? []);
}

export async function choosePhotos(patrolId: string): Promise<DraftPhoto[]> {
  const response = await launchImageLibrary({
    mediaType: 'photo',
    quality: 0.8,
    selectionLimit: 0,
  });
  if (response.didCancel) {
    return [];
  }
  if (response.errorCode) {
    throw pickerError(response);
  }
  return persistAssets(patrolId, response.assets ?? []);
}

export async function removeMediaFiles(uris: string[]): Promise<void> {
  await Promise.all(
    uris.map(async uri => {
      const path = uri.replace(/^file:\/\//, '');
      if (await FileSystem.exists(path)) {
        await FileSystem.unlink(path);
      }
    }),
  );
}

export async function cleanupPatrolMedia(
  patrolId: string,
  referencedUris: string[],
): Promise<void> {
  const directory = `${mediaRoot}/${patrolId}`;
  if (!(await FileSystem.exists(directory))) {
    return;
  }
  const referencedPaths = new Set(
    referencedUris.map(uri => uri.replace(/^file:\/\//, '')),
  );
  const files = await FileSystem.ls(directory);
  await removeMediaFiles(
    files
      .map(file => `file://${directory}/${file}`)
      .filter(uri => !referencedPaths.has(uri.replace(/^file:\/\//, ''))),
  );
}
