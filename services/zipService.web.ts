// services/zipService.web.ts
// Only used for Expo web preview; not needed for Android builds
import JSZip from 'jszip';

interface FileEntry {
  path: string;
  content: string;
}

export async function createZipFromFiles(
  files: FileEntry[],
  outputPath?: string
): Promise<string> {
  const zip = new JSZip();
  for (const file of files) zip.file(file.path, file.content);

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = outputPath?.split('/').pop() || 'project.zip';
  a.click();

  URL.revokeObjectURL(url);
  return outputPath || 'project.zip';
}

export async function pickAndExtractZipArchive(): Promise<{
  projectId: string;
  projectDir: string;
  files: string[];
} | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,application/zip';

    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return resolve(null);

      const reader = new FileReader();
      reader.onload = async (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        if (!arrayBuffer) return resolve(null);

        const zip = await JSZip.loadAsync(arrayBuffer);
        const projectId = `imported_${Date.now()}`;
        const filePaths: string[] = [];
        const entries = Object.values(zip.files).filter((e) => !e.dir);

        for (const entry of entries) {
          const safePath = entry.name.replace(/^\/+/, '');
          filePaths.push(safePath);
        }

        resolve({ projectId, projectDir: `memory://${projectId}/`, files: filePaths });
      };
      reader.readAsArrayBuffer(file);
    };

    input.click();
  });
}
