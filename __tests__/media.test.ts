import { FileSystem } from 'react-native-file-access';
import { launchCamera } from 'react-native-image-picker';
import { takePhoto } from '../src/device/media';

jest.mock('react-native-file-access', () => ({
  Dirs: { DocumentDir: '/documents' },
  FileSystem: {
    cp: jest.fn(async () => undefined),
    exists: jest.fn(async () => true),
    ls: jest.fn(async () => []),
    mkdir: jest.fn(async () => {
      throw new Error('directory already exists');
    }),
    unlink: jest.fn(async () => undefined),
  },
}));

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

test('reuses an existing patrol media directory', async () => {
  jest.mocked(launchCamera).mockResolvedValue({
    assets: [
      {
        fileName: 'capture.jpg',
        type: 'image/jpeg',
        uri: 'file:///cache/capture.jpg',
      },
    ],
  });

  await expect(takePhoto('patrol-1')).resolves.toHaveLength(1);
  expect(FileSystem.exists).toHaveBeenCalledWith(
    '/documents/ForestLog/media/patrol-1',
  );
  expect(FileSystem.mkdir).not.toHaveBeenCalled();
  expect(FileSystem.cp).toHaveBeenCalled();
});
