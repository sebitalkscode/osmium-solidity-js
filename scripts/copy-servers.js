const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const outputFolder = path.join(rootDir, 'vscode', 'dist');

let serversDir;
try {
  serversDir = path.join(rootDir, 'servers');
  const dirs = fs.readdirSync(serversDir, { withFileTypes: true });
  const serverNames = dirs.filter((d) => d.isDirectory()).map((d) => d.name);
  for (const serverDir of serverNames) {
    const targetDir = path.join(serversDir, serverDir, 'target');
    if (!fs.existsSync(targetDir)) continue;
    const profiles = fs.readdirSync(targetDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
    const typeDir = profiles.includes('release') ? 'release' : profiles[0];
    if (!typeDir) continue;
    const binDir = path.join(targetDir, typeDir);
    const files = fs.readdirSync(binDir, { withFileTypes: true }).filter((f) => f.isFile()).map((f) => f.name);
    const binary = files.find((f) => f.endsWith('-server') || f.endsWith('-server.exe'));
    if (binary) {
      fs.copyFileSync(path.join(binDir, binary), path.join(outputFolder, binary));
      console.log('Copying server binary to vscode/dist:', binary);
    }
  }
} catch (err) {
  console.warn('copy-servers (optional):', err.message);
}
