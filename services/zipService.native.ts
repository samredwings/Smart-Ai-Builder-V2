import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import JSZip from 'jszip';

export interface ExtractedFile {
  path: string;
  content: string;
  isDirectory: boolean;
  sizeBytes: number;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const createZipFromFiles = async (
  files: { path: string; content: string }[],
  filename: string
): Promise<string> => {
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.path, file.content);
  }
  const base64 = await zip.generateAsync({ type: 'base64' });
  const dest = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(dest, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return dest;
};

export const pickAndExtractZipArchive = async (): Promise<ExtractedFile[]> => {
  const pickerResult = await DocumentPicker.getDocumentAsync({
    type: ['application/zip', 'application/x-zip-compressed'],
    copyToCacheDirectory: true,
  });

  if (pickerResult.canceled || !pickerResult.assets?.[0]) {
    return [];
  }

  const selectedFile = pickerResult.assets[0];

  const base64Data = await FileSystem.readAsStringAsync(selectedFile.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const binaryBuffer = base64ToUint8Array(base64Data);
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(binaryBuffer);

  const extractedFiles: ExtractedFile[] = [];

  for (const [relativePath, zipEntry] of Object.entries(loadedZip.files)) {
    if (zipEntry.dir) {
      extractedFiles.push({ path: relativePath, content: '', isDirectory: true, sizeBytes: 0 });
    } else {
      const fileText = await zipEntry.async('string');
      extractedFiles.push({ path: relativePath, content: fileText, isDirectory: false, sizeBytes: fileText.length });
    }
  }

  return extractedFiles;
};
