const { spawn } = require('child_process');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);
const { Diagnostic, Range, DiagnosticSeverity } = require('vscode-languageserver');

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

function impactToSeverity(impact) {
  switch ((impact || '').toLowerCase()) {
    case 'high': return DiagnosticSeverity.Error;
    case 'medium':
    case 'low': return DiagnosticSeverity.Warning;
    case 'informational': return DiagnosticSeverity.Information;
    case 'optimization': return DiagnosticSeverity.Hint;
    default: return DiagnosticSeverity.Warning;
  }
}

function wikiUrl(check) {
  const slug = (check || '').replace(/_/g, '-').toLowerCase();
  return `https://github.com/crytic/slither/wiki/Detector-Documentation#${slug}`;
}

let connection = null;
let documents = null;
let getWorkspaceRoot = null;

function init(conn, docs, getRoot) {
  connection = conn;
  documents = docs;
  getWorkspaceRoot = getRoot;
}

function runSlitherAnalysis() {
  const root = getWorkspaceRoot();
  if (!root) return Promise.resolve([]);
  const cwd = uriToPath(root);
  const start = Date.now();
  return execAsync('slither --version')
    .catch(() => { throw new Error('slither not installed'); })
    .then(() => new Promise((resolve) => {
    const proc = spawn('slither', ['.', '--json', '-'], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      const elapsed = Date.now() - start;
      const findings = [];
      try {
        const data = JSON.parse(stdout || '{}');
        const detectors = data.results?.detectors || [];
        const byFile = new Map();
        for (const d of detectors) {
          const finding = {
            check: d.check,
            impact: d.impact,
            confidence: d.confidence,
            description: d.description,
            elements: d.elements || [],
          };
          findings.push(finding);
          const firstEl = d.elements?.[0];
          const sm = firstEl?.source_mapping;
          if (sm) {
            const filePath = sm.filename_absolute || sm.filename_relative;
            if (filePath) {
              const absPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
              const uri = pathToUri(absPath);
              const line = (sm.lines?.[0] ?? 1) - 1;
              const startChar = (sm.starting_column ?? 1) - 1;
              const endChar = sm.ending_column ?? startChar + 1;
              const range = Range.create(line, startChar, line, endChar);
              const diag = Diagnostic.create(
                range,
                `[${d.check}] ${d.description}`,
                impactToSeverity(d.impact),
                { value: d.check, target: wikiUrl(d.check) },
                'osmium-slither'
              );
              const related = [];
              for (let i = 1; i < (d.elements?.length || 0); i++) {
                const el = d.elements[i];
                const esm = el?.source_mapping;
                if (esm) {
                  const efp = esm.filename_absolute || esm.filename_relative;
                  if (efp) {
                    const eabs = path.isAbsolute(efp) ? efp : path.join(cwd, efp);
                    const eline = (esm.lines?.[0] ?? 1) - 1;
                    const esc = (esm.starting_column ?? 1) - 1;
                    related.push({
                      location: { uri: pathToUri(eabs), range: Range.create(eline, esc, eline, esc) },
                      message: el.name || d.description,
                    });
                  }
                }
              }
              if (related.length) diag.relatedInformation = related;
              const list = byFile.get(uri) || [];
              list.push(diag);
              byFile.set(uri, list);
            }
          }
        }
        if (connection) {
          for (const [uri, diags] of byFile) {
            connection.sendDiagnostics({ uri, diagnostics: diags });
          }
          connection.sendNotification('osmium/slitherReport', { findings, elapsed });
        }
      } catch (_) {
      }
      resolve(findings);
    });
    proc.on('error', () => {
      resolve([]);
    });
  }))
  .catch(() => []);
}

module.exports = {
  init,
  runSlitherAnalysis,
};
