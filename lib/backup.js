const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Pastas de metadados/sistema criadas pelo SO em discos e que apps comuns
// não têm permissão (ou motivo) de ler.
const IGNORED_DIR_NAMES = new Set([
  '.Spotlight-V100',
  '.Trashes',
  '.fseventsd',
  '.DocumentRevisions-V100',
  '.TemporaryItems',
  '.apdisk',
  '$RECYCLE.BIN',
  'System Volume Information',
]);

function isPermissionError(err) {
  return err.code === 'EPERM' || err.code === 'EACCES';
}

function hashFile(absPath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(absPath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function walkDir(rootPath, onFileFound) {
  const files = [];

  async function walk(currentDir) {
    let entries;
    try {
      entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
    } catch (err) {
      if (isPermissionError(err)) return;
      throw err;
    }

    for (const entry of entries) {
      if (entry.isDirectory() && IGNORED_DIR_NAMES.has(entry.name)) continue;

      const absPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(absPath);
      } else if (entry.isFile()) {
        let stat;
        try {
          stat = await fs.promises.stat(absPath);
        } catch (err) {
          if (isPermissionError(err)) continue;
          throw err;
        }
        files.push({
          relPath: path.relative(rootPath, absPath),
          absPath,
          size: stat.size,
          mtimeMs: stat.mtimeMs,
        });
        if (onFileFound) onFileFound(files.length);
      }
    }
  }

  await walk(rootPath);
  return files;
}

async function diffTrees(sourceFiles, targetRoot, onProgress) {
  const pending = [];
  const total = sourceFiles.length;

  for (let i = 0; i < total; i++) {
    const file = sourceFiles[i];
    const targetAbsPath = path.join(targetRoot, file.relPath);
    let targetStat = null;
    try {
      targetStat = await fs.promises.stat(targetAbsPath);
    } catch (err) {
      if (err.code !== 'ENOENT' && !isPermissionError(err)) throw err;
    }

    let isDifferent;
    if (!targetStat) {
      isDifferent = true;
    } else if (targetStat.size !== file.size) {
      // Tamanhos diferentes já garantem conteúdo diferente, sem precisar de hash.
      isDifferent = true;
    } else {
      const [sourceHash, targetHash] = await Promise.all([
        hashFile(file.absPath),
        hashFile(targetAbsPath),
      ]);
      isDifferent = sourceHash !== targetHash;
    }

    if (isDifferent) pending.push(file);
    if (onProgress) onProgress({ done: i + 1, total });
  }

  return pending;
}

async function copyFiles(pendingFiles, sourceRoot, targetRoot, onProgress) {
  const summary = { copied: 0, failed: 0, errors: [] };
  const total = pendingFiles.length;

  for (let i = 0; i < total; i++) {
    const file = pendingFiles[i];
    const destPath = path.join(targetRoot, file.relPath);

    try {
      await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
      await fs.promises.copyFile(file.absPath, destPath);
      const stat = await fs.promises.stat(file.absPath);
      await fs.promises.utimes(destPath, stat.atime, stat.mtime);
      summary.copied++;
    } catch (err) {
      summary.failed++;
      summary.errors.push({ relPath: file.relPath, message: err.message });
    }

    if (onProgress) {
      onProgress({ done: i + 1, total, currentFile: file.relPath });
    }
  }

  return summary;
}

module.exports = { walkDir, diffTrees, copyFiles };
