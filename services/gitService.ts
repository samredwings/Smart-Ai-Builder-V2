import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import * as FileSystem from 'expo-file-system';

const expoFsShim = {
  promises: {
    readFile: async (path: string, options?: any) => {
      const fullPath = `${FileSystem.documentDirectory}git_repos${path}`;
      const encoding = typeof options === 'string' && options === 'utf8' 
        ? FileSystem.EncodingType.UTF8 
        : FileSystem.EncodingType.Base64;
      
      const content = await FileSystem.readAsStringAsync(fullPath, { encoding });
      if (encoding === FileSystem.EncodingType.UTF8) return content;
      
      const binaryStr = atob(content);
      const len = binaryStr.length;
      const u8 = new Uint8Array(len);
      for (let i = 0; i < len; i++) u8[i] = binaryStr.charCodeAt(i);
      return u8;
    },
    writeFile: async (path: string, data: any) => {
      const fullPath = `${FileSystem.documentDirectory}git_repos${path}`;
      let content = data;
      let encoding = FileSystem.EncodingType.UTF8;

      if (data instanceof Uint8Array || typeof data !== 'string') {
        encoding = FileSystem.EncodingType.Base64;
        let binary = '';
        const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        content = btoa(binary);
      }

      await FileSystem.writeAsStringAsync(fullPath, content, { encoding });
    },
    mkdir: async (path: string) => {
      const fullPath = `${FileSystem.documentDirectory}git_repos${path}`;
      await FileSystem.makeDirectoryAsync(fullPath, { intermediates: true });
    },
    unlink: async (path: string) => {
      const fullPath = `${FileSystem.documentDirectory}git_repos${path}`;
      await FileSystem.deleteAsync(fullPath, { idempotent: true });
    },
    stat: async (path: string) => {
      const fullPath = `${FileSystem.documentDirectory}git_repos${path}`;
      const info = await FileSystem.getInfoAsync(fullPath);
      if (!info.exists) throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
      return {
        isFile: () => !info.isDirectory,
        isDirectory: () => info.isDirectory,
        size: info.size || 0,
        mtimeMs: (info.modificationTime || Date.now() / 1000) * 1000,
      };
    },
    readdir: async (path: string) => {
      const fullPath = `${FileSystem.documentDirectory}git_repos${path}`;
      return await FileSystem.readDirectoryAsync(fullPath);
    },
  },
};

export interface GitCredentials {
  dir: string;
  url: string;
  token: string;
}

export const cloneRemoteRepository = async (
  { dir, url, token }: GitCredentials,
  onProgress?: (progress: string) => void
): Promise<void> => {
  await git.clone({
    fs: expoFsShim,
    http,
    dir: `/${dir}`,
    url,
    singleBranch: true,
    depth: 1,
    onProgress: (event) => {
      if (onProgress) onProgress(`${event.phase}: ${event.loaded}/${event.total}`);
    },
    onAuth: () => ({ username: token, password: '' }),
  });
};

export const pushRepositoryChanges = async (
  { dir, token }: { dir: string; token: string },
  commitMessage: string
): Promise<string> => {
  await git.add({ fs: expoFsShim, dir: `/${dir}`, filepath: '.' });
  
  const sha = await git.commit({
    fs: expoFsShim,
    dir: `/${dir}`,
    author: { name: 'Smart AI Builder Mobile', email: 'mobile@smart-ai-builder.internal' },
    message: commitMessage,
  });

  await git.push({
    fs: expoFsShim,
    http,
    dir: `/${dir}`,
    onAuth: () => ({ username: token, password: '' }),
  });

  return sha;
};
          
