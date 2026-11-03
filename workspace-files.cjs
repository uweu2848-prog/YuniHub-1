'use strict';

const fs = require('fs');
const path = require('path');

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_FILES = 3000;
const IGNORED_DIRECTORIES = new Set([
  '.git', '.vs', '.idea', '.cache', '.next', '.turbo', '.expo', '.gradle', '.dart_tool',
  'node_modules', 'vendor', 'packages', 'Pods', 'dist', 'build', 'out', 'release',
  'coverage', 'target', 'bin', 'obj', '.venv', 'venv', '__pycache__'
]);

function workspaceRoot(folder) {
  if (typeof folder !== 'string' || !folder.trim()) throw new Error('Choose a project folder first.');
  const root = fs.realpathSync(path.resolve(folder));
  if (!fs.statSync(root).isDirectory()) throw new Error('The selected workspace is not a folder.');
  return root;
}

function isInside(root, target) {
  const relative = path.relative(root, target);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function resolveWorkspacePath(root, relativePath) {
  if (typeof relativePath !== 'string' || !relativePath.trim() || relativePath.includes('\0')) {
    throw new Error('Enter a relative file path inside the selected workspace.');
  }
  const normalized = relativePath.replace(/\\/g, '/');
  if (path.isAbsolute(normalized) || path.win32.isAbsolute(normalized) || /^[a-z]:/i.test(normalized)) {
    throw new Error('File paths must stay inside the selected workspace.');
  }
  const target = path.resolve(root, ...normalized.split('/'));
  if (!isInside(root, target)) throw new Error('File paths must stay inside the selected workspace.');
  return target;
}

function assertRealPathInside(root, target, allowRoot = false) {
  const real = fs.realpathSync(target);
  if (!isInside(root, real) && !(allowRoot && real === root)) throw new Error('File paths must stay inside the selected workspace.');
  return real;
}

function listWorkspaceFiles(folder) {
  const root = workspaceRoot(folder);
  const files = [];
  const visit = (directory, depth) => {
    if (depth > 8 || files.length >= MAX_FILES) return;
    const entries = fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (files.length >= MAX_FILES) break;
      if (entry.isSymbolicLink()) continue;
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name.toLowerCase())) visit(fullPath, depth + 1);
      } else if (entry.isFile()) {
        const stat = fs.statSync(fullPath);
        if (stat.size <= MAX_FILE_BYTES) files.push(path.relative(root, fullPath).split(path.sep).join('/'));
      }
    }
  };
  visit(root, 0);
  return files;
}

function readWorkspaceFile(folder, relativePath) {
  const root = workspaceRoot(folder);
  const target = resolveWorkspacePath(root, relativePath);
  const real = assertRealPathInside(root, target);
  const stat = fs.statSync(real);
  if (!stat.isFile()) throw new Error('That workspace item is not a file.');
  if (stat.size > MAX_FILE_BYTES) throw new Error('Files larger than 2 MB cannot be opened in the Studio editor.');
  const content = fs.readFileSync(real);
  if (content.includes(0)) throw new Error('Binary files cannot be opened in the Studio editor.');
  return content.toString('utf8');
}

function writeWorkspaceFile(folder, relativePath, content, create = false) {
  const root = workspaceRoot(folder);
  const target = resolveWorkspacePath(root, relativePath);
  if (typeof content !== 'string' || Buffer.byteLength(content, 'utf8') > MAX_FILE_BYTES || content.includes('\0')) {
    throw new Error('Text files must be smaller than 2 MB.');
  }
  const parent = assertRealPathInside(root, path.dirname(target), true);
  if (!fs.statSync(parent).isDirectory()) throw new Error('The parent folder does not exist.');

  if (create) {
    let descriptor;
    try {
      descriptor = fs.openSync(target, 'wx');
      fs.writeFileSync(descriptor, content, 'utf8');
    } catch (error) {
      if (error.code === 'EEXIST') throw new Error('A file with that path already exists.');
      throw error;
    } finally {
      if (descriptor !== undefined) fs.closeSync(descriptor);
    }
  } else {
    const real = assertRealPathInside(root, target);
    if (!fs.statSync(real).isFile()) throw new Error('That workspace item is not a file.');
    fs.writeFileSync(real, content, 'utf8');
  }
  return path.relative(root, target).split(path.sep).join('/');
}

module.exports = { createWorkspaceFile: (folder, relativePath, content) => writeWorkspaceFile(folder, relativePath, content, true), listWorkspaceFiles, readWorkspaceFile, writeWorkspaceFile };
