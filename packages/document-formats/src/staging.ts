import { open, rename, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
export async function atomicPublish(path: string, bytes: Buffer): Promise<void> {
  const temporary = `${path}.hsd-${crypto.randomUUID()}.staging`;
  let handle;
  try {
    handle = await open(temporary, 'wx', 0o600);
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temporary, path);
  } catch (error) {
    await handle?.close();
    await rm(temporary, { force: true });
    throw error;
  }
}
export function assertOutputBoundary(output: string, forbiddenRoots: readonly string[]): void {
  const normalized = dirname(output);
  if (forbiddenRoots.some((root) => normalized === root || normalized.startsWith(`${root}/`)))
    throw new Error('Output must be outside Vault/Secure Store/source roots');
}
