// services/zipService.native.ts
// Used on Android / iOS
import JSZip from 'jszip';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

interface FileEntry {
  path: string;
  content: string;
}

export async function createZipFromFiles(
  files: FileEntry[],
  outputPath: string
): Promise<string> {
  const zip = new JSZip();
  for (const file of files) zip.file(file.path, file.content);

  const base64 = await zip.generateAsync({ type: 'base64' });
  await FileSystem.writeAsStringAsync(outputPath, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return outputPath;
}

export async function pickAndExtractZipArchive(): Promise<{
  projectId: string;
  projectDir: string;
  files: string[];
} | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/zip',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.length) return null;

  const zipUri = result.assets[0].uri;
  const projectId = `imported_${Date.now()}`;
  const projectDir = `${FileSystem.documentDirectory}projects/${projectId}/`;

  await FileSystem.makeDirectoryAsync(projectDir, { intermediates: true });

  const base64 = await FileSystem.readAsStringAsync(zipUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const zip = await JSZip.loadAsync(base64, { base64: true });
  const filePaths: string[] = [];
  const entries = Object.values(zip.files).filter((e) => !e.dir);

  for (const entry of entries) {
    const content = await entry.async('string');
    const safePath = entry.name.replace(/^\/+/, '');
    const fullPath = `${projectDir}${safePath}`;

    const folder = safePath.split('/').slice(0, -1).join('/');
    if (folder) {
      await FileSystem.makeDirectoryAsync(`${projectDir}${folder}`, {
        intermediates: true,
      }).catch(() => {});
    }

    await FileSystem.writeAsStringAsync(fullPath, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    filePaths.push(safePath);
  }

  return { projectId, projectDir, files: filePaths };
}
