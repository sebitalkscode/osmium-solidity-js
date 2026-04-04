const fs = require('fs');
const path = require('path');
const { Location, Position, Range, Hover, MarkupKind } = require('vscode-languageserver');

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

function pathToUri(filePath) {
  const normalized = path.resolve(filePath).replace(/\\/g, '/');
  return 'file://' + (normalized.startsWith('/') ? '' : '/') + normalized;
}

function parseSymbols(content, filePath) {
  const symbols = [];
  const lines = content.split('\n');
  let currentContract = null;
  const contractRegex = /^\s*(?:abstract\s+)?(?:contract|interface|library)\s+(\w+)/;
  const functionRegex = /^\s*(?:function|modifier)\s+(\w+)\s*\(/;
  const eventRegex = /^\s*event\s+(\w+)\s*\(/;
  const structRegex = /^\s*struct\s+(\w+)\s*\{/;
  const enumRegex = /^\s*enum\s+(\w+)\s*\{/;
  const stateVarRegex = /^\s*(?:uint|int|bool|address|bytes|string|mapping)\s*(?:<[^>]+>)?\s*(?:public|private|internal)?\s*(\w+)\s*[;=]/;
  const stateVarRegex2 = /^\s*(\w+)\s+(?:public|private|internal)?\s*(\w+)\s*[;=]/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const col = line.search(/\S/);
    if (col < 0) continue;

    let m = line.match(contractRegex);
    if (m) {
      currentContract = m[1];
      const endCol = col + m[0].length;
      symbols.push({ name: m[1], kind: 'contract', line: i, col, endCol, filePath, parent: null });
      continue;
    }

    m = line.match(functionRegex);
    if (m) {
      const endCol = line.indexOf('(', col) + 1;
      symbols.push({ name: m[1], kind: 'function', line: i, col, endCol, filePath, parent: currentContract });
      continue;
    }

    m = line.match(eventRegex);
    if (m) {
      const endCol = line.indexOf('(', col) + 1;
      symbols.push({ name: m[1], kind: 'event', line: i, col, endCol, filePath, parent: currentContract });
      continue;
    }

    m = line.match(structRegex);
    if (m) {
      const endCol = col + m[0].indexOf('{') + 1;
      symbols.push({ name: m[1], kind: 'struct', line: i, col, endCol, filePath, parent: currentContract });
      continue;
    }

    m = line.match(enumRegex);
    if (m) {
      const endCol = col + m[0].indexOf('{') + 1;
      symbols.push({ name: m[1], kind: 'enum', line: i, col, endCol, filePath, parent: currentContract });
      continue;
    }

    m = line.match(stateVarRegex);
    if (m) {
      const nameStart = line.indexOf(m[1], col);
      symbols.push({ name: m[1], kind: 'variable', line: i, col: nameStart, endCol: nameStart + m[1].length, filePath, parent: currentContract });
      continue;
    }

    m = line.match(stateVarRegex2);
    if (m && ['uint', 'int', 'bool', 'address', 'bytes', 'string', 'mapping', 'Contract'].some(t => line.includes(t))) {
      const nameStart = line.indexOf(m[2], col);
      symbols.push({ name: m[2], kind: 'variable', line: i, col: nameStart, endCol: nameStart + m[2].length, filePath, parent: currentContract });
    }
  }
  return symbols;
}

function findReferences(content, symbolName) {
  const results = [];
  const lines = content.split('\n');
  const wordBoundary = new RegExp('\\b' + symbolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
  for (let i = 0; i < lines.length; i++) {
    let m;
    wordBoundary.lastIndex = 0;
    while ((m = wordBoundary.exec(lines[i])) !== null) {
      results.push({ line: i, col: m.index, endCol: m.index + symbolName.length });
    }
  }
  return results;
}

function extractNatSpec(content, symbolLine) {
  const lines = content.split('\n');
  const natspec = { notice: [], dev: [], param: {}, return: [], author: [], title: [] };
  for (let i = symbolLine - 1; i >= 0; i--) {
    const line = lines[i];
    if (line.trim().startsWith('///') || line.trim().startsWith('/**') || line.trim().startsWith('*')) {
      const m = line.match(/@(\w+)\s+(.*)/);
      if (m) {
        const [, tag, val] = m;
        const v = val.replace(/\*\//, '').trim();
        if (tag === 'param' && v.includes(' ')) {
          const [pname, pdesc] = v.split(/\s+/, 2);
          natspec.param[pname] = pdesc || '';
        } else if (['notice', 'dev', 'return', 'author', 'title'].includes(tag)) {
          natspec[tag].push(v);
        }
      }
    } else if (line.trim() && !line.trim().startsWith('*') && !line.trim().startsWith('/')) {
      break;
    }
  }
  return natspec;
}

function getAllSolFiles(dir, root, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules' && e.name !== '.git') {
      getAllSolFiles(full, root, acc);
    } else if (e.isFile() && e.name.endsWith('.sol')) {
      acc.push(full);
    }
  }
  return acc;
}

function getSymbolAtPosition(symbols, line, character) {
  for (const s of symbols) {
    if (s.line === line && character >= s.col && character <= s.endCol) return s;
  }
  return null;
}

function buildHoverMarkdown(symbol, content, natspec) {
  const lines = content.split('\n');
  const sig = lines[symbol.line]?.trim() || '';
  const parts = [];
  parts.push(`**${symbol.kind}** \`${symbol.name}\``);
  if (symbol.parent) parts.push(`*${symbol.parent}*`);
  parts.push('```solidity\n' + sig + '\n```');
  if (natspec.title?.length) parts.push('**Title:** ' + natspec.title.join(' '));
  if (natspec.notice?.length) parts.push('**Notice:** ' + natspec.notice.join(' '));
  if (natspec.dev?.length) parts.push('**Dev:** ' + natspec.dev.join(' '));
  if (Object.keys(natspec.param).length) {
    parts.push('**Params:** ' + Object.entries(natspec.param).map(([k, v]) => `${k}: ${v}`).join(', '));
  }
  if (natspec.return?.length) parts.push('**Returns:** ' + natspec.return.join(' '));
  if (natspec.author?.length) parts.push('**Author:** ' + natspec.author.join(' '));
  return parts.join('\n\n');
}

let connection = null;
let documents = null;
let getWorkspaceRoot = null;

function init(conn, docs, getRoot) {
  connection = conn;
  documents = docs;
  getWorkspaceRoot = getRoot;
}

function onDefinition(params) {
  const root = getWorkspaceRoot();
  if (!root) return Promise.resolve(null);
  const uri = params.textDocument.uri;
  const pos = params.position;
  const doc = documents.get(uri);
  if (!doc) return Promise.resolve(null);
  const filePath = uriToPath(uri);
  const symbols = parseSymbols(doc.getText(), filePath);
  const sym = getSymbolAtPosition(symbols, pos.line, pos.character);
  if (!sym) return Promise.resolve(null);
  const rootPath = uriToPath(root);
  const solFiles = getAllSolFiles(rootPath, rootPath);
  for (const f of solFiles) {
    const content = fs.readFileSync(f, 'utf8');
    const allSymbols = parseSymbols(content, f);
    const def = allSymbols.find(s => s.name === sym.name && s.kind === sym.kind);
    if (def) {
      return Promise.resolve(Location.create(pathToUri(f), Range.create(def.line, def.col, def.line, def.endCol)));
    }
  }
  return Promise.resolve(null);
}

function onReferences(params) {
  const root = getWorkspaceRoot();
  if (!root) return Promise.resolve(null);
  const uri = params.textDocument.uri;
  const pos = params.position;
  const doc = documents.get(uri);
  if (!doc) return Promise.resolve(null);
  const filePath = uriToPath(uri);
  const symbols = parseSymbols(doc.getText(), filePath);
  const sym = getSymbolAtPosition(symbols, pos.line, pos.character);
  if (!sym) return Promise.resolve(null);
  const rootPath = uriToPath(root);
  const solFiles = getAllSolFiles(rootPath, rootPath);
  const locations = [];
  for (const f of solFiles) {
    const content = fs.readFileSync(f, 'utf8');
    const refs = findReferences(content, sym.name);
    const uri2 = pathToUri(f);
    for (const r of refs) {
      locations.push(Location.create(uri2, Range.create(r.line, r.col, r.line, r.endCol)));
    }
  }
  return Promise.resolve(locations);
}

function onHover(params) {
  const uri = params.textDocument.uri;
  const pos = params.position;
  const doc = documents.get(uri);
  if (!doc) return Promise.resolve(null);
  const filePath = uriToPath(uri);
  const content = doc.getText();
  const symbols = parseSymbols(content, filePath);
  const sym = getSymbolAtPosition(symbols, pos.line, pos.character);
  if (!sym) return Promise.resolve(null);
  const natspec = extractNatSpec(content, sym.line);
  const markdown = buildHoverMarkdown(sym, content, natspec);
  return Promise.resolve({ contents: { kind: MarkupKind.Markdown, value: markdown } });
}

module.exports = {
  init,
  onDefinition,
  onReferences,
  onHover,
  parseSymbols,
  findReferences,
};
