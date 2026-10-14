// services/gitService.ts
// React Native bridge for isomorphic-git using expo-file-system
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import * as FileSystem from 'expo-file-system';

const fsLike = {
  promises: {
    readFile: async (path: string, encoding?: string): Promise<string> => {
      const enc =
        encoding === 'base64'
          ? FileSystem.EncodingType.Base64
          : FileSystem.EncodingType.UTF8;
      return FileSystem.readAsStringAsync(path, { encoding: enc });
    },
    writeFile: async (path: string, data: string, encoding?: string): Promise<void> => {
      const enc =
        encoding === 'base64'
          ? FileSystem.EncodingType.Base64
          : FileSystem.EncodingType.UTF8;
      await FileSystem.writeAsStringAsync(path, data, { encoding: enc });
    },
    mkdir: async (path: string, _opts?: { recursive?: boolean }): Promise<void> => {
      await FileSystem.makeDirectoryAsync(path, { intermediates: true });
    },
    readdir: async (path: string): Promise<string[]> => {
      return FileSystem.readDirectoryAsync(path);
    },
    stat: async (path: string): Promise<any> => {
      const info = await FileSystem.getInfoAsync(path, { size: true });
      if (!info.exists) {
        const err: any = new Error(`ENOENT: no such file or directory, stat '${path}'`);
        err.code = 'ENOENT';
        err.errno = -2;
        throw err;
      }
      return {
        dev: 1,
        ino: 1,
        mode: 0o777,
        nlink: 1,
        uid: 1,
        gid: 1,
        rdev: 0,
        size: info.size ?? 0,
        blksize: 4096,
        blocks: 0,
        mtimeMs: info.modificationTime ? info.modificationTime * 1000 : Date.now(),
        ctimeMs: info.modificationTime ? info.modificationTime * 1000 : Date.now(),
        isFile: () => !info.isDirectory,
        isDirectory: () => info.isDirectory,
        isSymbolicLink: () => false,
      };
    },
    lstat: async (path: string): Promise<any> => fsLike.promises.stat(path),
    unlink: async (path: string): Promise<void> => {
      await FileSystem.deleteAsync(path, { idempotent: true });
    },
    rmdir: async (path: string, _opts?: { recursive?: boolean }): Promise<void> => {
      await FileSystem.deleteAsync(path, { idempotent: true });
    },
  },
};

export async function initRepo(dir: string): Promise<void> {
  await git.init({ fs: fsLike, dir, defaultBranch: 'main' });
}

export async function addAllAndCommit(
  dir: string,
  message: string,
  author: { name: string; email: string }
): Promise<string> {
  const matrix = await git.statusMatrix({ fs: fsLike, dir });
  for (const [filepath, _head, workdir] of matrix) {
    if (workdir === 2) {
      await git.add({ fs: fsLike, dir, filepath });
    }
  }

  const oid = await git.commit({
    fs: fsLike,
    dir,
    message,
    author: {
      name: author.name,
      email: author.email,
      timestamp: Math.floor(Date.now() / 1000),
      timezoneOffset: new Date().getTimezoneOffset(),
    },
  });
  return oid;
}

export async function setupRemote(dir: string, url: string): Promise<void> {
  try {
    await git.deleteRemote({ fs: fsLike, dir, remote: 'origin' });
  } catch {}
  await git.addRemote({ fs: fsLike, dir, remote: 'origin', url });
}

export async function pushRepo(dir: string, token: string): Promise<void> {
  await git.push({
    fs: fsLike,
    http,
    dir,
    remote: 'origin',
    ref: 'main',
    onAuth: () => ({ username: token, password: 'x-oauth-basic' }),
  });
}

export async function hasRepo(dir: string): Promise<boolean> {
  try {
    await git.resolveRef({ fs: fsLike, dir, ref: 'main' });
    return true;
  } catch {
    return false;
  }
}
