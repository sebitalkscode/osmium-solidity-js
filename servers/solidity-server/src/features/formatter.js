const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { TextEdit, Range } = require('vscode-languageserver');

function uriToPath(uri) {
  try {
    const decoded = decodeURIComponent(new URL(uri).pathname);
    if (process.platform === 'win32' && decoded.match(/^\/[A-Za-z]:/)) {
      return decoded.slice(1);
    }
    return decoded;
  } catch {
    return uri.replace(/^file:\/\//, '');
  }
}

function findInNodeModules(startDir, relPath) {
  const serverDir = path.resolve(__dirname, '..', '..');
  const roots = [serverDir];
  if (startDir) roots.push(uriToPath(startDir));
  for (const r of roots) {
    let dir = r;
    while (dir) {
      const p = path.join(dir, 'node_modules', relPath);
      if (fs.existsSync(p)) return p;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return null;
}

function findPrettier(root) {
  return findInNodeModules(root, path.join('prettier', 'bin', 'prettier.cjs'));
}

function findPrettierPlugin(root) {
  return findInNodeModules(root, path.join('prettier-plugin-solidity', 'dist', 'index.js'));
}

function formatWithPrettier(content, filePath, prettierPath, pluginPath) {
  return new Promise((resolve, reject) => {
    const args = [
      prettierPath,
      '--stdin-filepath', filePath,
      '--parser', 'slang',
      '--plugin', pluginPath,
    ];
    const proc = spawn('node', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    proc.stdout.on('data', (d) => { out += d.toString(); });
    proc.stderr.on('data', (d) => { err += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0 && out) resolve(out);
      else reject(new Error(err || 'Prettier failed'));
    });
    proc.stdin.write(content);
    proc.stdin.end();
  });
}

function formatWithForge(content, root) {
  return new Promise((resolve, reject) => {
    const cwd = root ? uriToPath(root) : process.cwd();
    const proc = spawn('forge', ['fmt', '--raw', '-'], { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    proc.stdout.on('data', (d) => { out += d.toString(); });
    proc.stderr.on('data', (d) => { err += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0 && out) resolve(out);
      else reject(new Error(err || 'Forge fmt failed'));
    });
    proc.stdin.write(content);
    proc.stdin.end();
  });
}

let connection = null;
let documents = null;
let getWorkspaceRoot = null;

function init(conn, docs, getRoot) {
  connection = conn;
  documents = docs;
  getWorkspaceRoot = getRoot;
}

function formatDocument(params) {
  const uri = params.textDocument.uri;
  const doc = documents.get(uri);
  if (!doc) return Promise.resolve(null);
  const content = doc.getText();
  const filePath = uriToPath(uri);
  const root = getWorkspaceRoot();
  const prettierPath = findPrettier(root);
  const pluginPath = findPrettierPlugin(root);
  if (prettierPath && pluginPath) {
    return formatWithPrettier(content, filePath, prettierPath, pluginPath)
      .then((formatted) => {
        const range = Range.create(0, 0, doc.lineCount, 0);
        return [TextEdit.replace(range, formatted)];
      })
      .catch(() => formatWithForge(content, root)
        .then((formatted) => {
          const range = Range.create(0, 0, doc.lineCount, 0);
          return [TextEdit.replace(range, formatted)];
        })
        .catch(() => null));
  }
  return formatWithForge(content, root)
    .then((formatted) => {
      const range = Range.create(0, 0, doc.lineCount, 0);
      return [TextEdit.replace(range, formatted)];
    })
    .catch(() => null);
}

module.exports = {
  init,
  formatDocument,
};
