'use strict';

const esbuild = require('esbuild');
const { listWorkspaceFiles, readWorkspaceFile } = require('./workspace-files.cjs');
const MAX_DIAGNOSTIC_FILES = 200;
const MAX_DIAGNOSTIC_FILE_BYTES = 512 * 1024;
const MAX_DIAGNOSTIC_BYTES = 24 * 1024 * 1024;

function sourceLocation(error, file) {
  const esbuildLocation = error && error.errors && error.errors[0] && error.errors[0].location;
  if (esbuildLocation) return { line: esbuildLocation.line || 1, column: (esbuildLocation.column || 0) + 1 };
  const positionMatch = String(error && error.message || '').match(/position (\d+)/i);
  if (positionMatch) {
    const position = Number(positionMatch[1]);
    const prefix = file.slice(0, position);
    const lines = prefix.split('\n');
    return { line: lines.length, column: lines[lines.length - 1].length + 1 };
  }
  const stack = String(error && error.stack || '');
  const locationMatch = stack.match(/:(\d+)(?::(\d+))?\)?(?:\n|$)/);
  return locationMatch ? { line: Number(locationMatch[1]), column: Number(locationMatch[2]) || 1 } : { line: 1, column: 1 };
}

function diagnoseWorkspace(folder) {
  const files = listWorkspaceFiles(folder);
  const candidates = files.filter((file) => /\.(?:js|cjs|mjs|jsx|ts|tsx|json)$/i.test(file));
  const diagnostics = [];
  let checked = 0;
  let totalBytes = 0;
  let truncated = candidates.length > MAX_DIAGNOSTIC_FILES;

  for (const filePath of candidates) {
    if (checked >= MAX_DIAGNOSTIC_FILES) { truncated = true; break; }
    let content;
    try { content = readWorkspaceFile(folder, filePath); }
    catch { continue; }
    const fileBytes = Buffer.byteLength(content, 'utf8');
    if (fileBytes > MAX_DIAGNOSTIC_FILE_BYTES || totalBytes + fileBytes > MAX_DIAGNOSTIC_BYTES) {
      truncated = true;
      continue;
    }
    totalBytes += fileBytes;
    checked++;
    try {
      if (/\.json$/i.test(filePath)) JSON.parse(content);
      else {
        const extension = filePath.split('.').pop().toLowerCase();
        const loader = { cjs: 'js', mjs: 'js', jsx: 'jsx', ts: 'ts', tsx: 'tsx' }[extension] || 'js';
        esbuild.transformSync(content, { loader, sourcefile: filePath, format: 'esm', target: 'esnext', logLevel: 'silent' });
      }
    } catch (error) {
      diagnostics.push({
        file: filePath,
        severity: 'error',
        message: String(error.errors && error.errors[0] && error.errors[0].text || error.message || 'Syntax error').split('\n')[0].slice(0, 300),
        ...sourceLocation(error, content)
      });
    }
  }

  return {
    checked,
    truncated,
    diagnostics,
    analyzers: ['JavaScript', 'CommonJS', 'ES modules', 'JSX', 'TypeScript', 'TSX', 'JSON']
  };
}

module.exports = { diagnoseWorkspace };
