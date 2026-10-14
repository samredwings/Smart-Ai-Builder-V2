// Web stub — file picking uses browser File API instead of expo-document-picker

export interface ExtractedFile {
  path: string;
  content: string;
  isDirectory: boolean;
  sizeBytes: number;
}

export const createZipFromFiles = async (
  files: { path: string; content: string }[],
  filename: string
): Promise<string> => {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.path, file.content);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  return url;
};

export const pickAndExtractZipArchive = async (): Promise<ExtractedFile[]> => {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,application/zip';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { resolve([]); return; }

      try {
        const JSZip = (await import('jszip')).default;
        const arrayBuffer = await file.arrayBuffer();
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(arrayBuffer);

        const extractedFiles: ExtractedFile[] = [];
        for (const [relativePath, zipEntry] of Object.entries(loadedZip.files)) {
          if ((zipEntry as any).dir) {
            extractedFiles.push({ path: relativePath, content: '', isDirectory: true, sizeBytes: 0 });
          } else {
            const fileText = await (zipEntry as any).async('string');
            extractedFiles.push({ path: relativePath, content: fileText, isDirectory: false, sizeBytes: fileText.length });
          }
        }
        resolve(extractedFiles);
      } catch {
        resolve([]);
      }
    };
    input.click();
  });
};
