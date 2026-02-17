const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const outputFolder = path.join(rootDir, 'vscode', 'dist');

// In recode, sidebar is in servers/sidebar; env-panel and docs-panel at root
const projectPaths = {
  sidebar: path.join(rootDir, 'servers', 'sidebar'),
  'env-panel': path.join(rootDir, 'env-panel'),
  'docs-panel': path.join(rootDir, 'docs-panel'),
};

for (const [name, projectDir] of Object.entries(projectPaths)) {
  const distDir = path.join(projectDir, 'dist');
  if (!fs.existsSync(distDir)) {
    console.warn(`Skipping ${name}: no dist folder at ${distDir}`);
    continue;
  }
  const entries = fs.readdirSync(distDir, { withFileTypes: true });
  const files = entries
    .filter((f) => f.isFile() && f.name !== 'index.html')
    .map((f) => f.name);

  for (const file of files) {
    const src = path.join(distDir, file);
    const dest = path.join(outputFolder, file);
    try {
      fs.copyFileSync(src, dest);
      console.log('Copying to vscode/dist:', file);
    } catch (err) {
      console.error('Copy failed:', file, err.message);
    }
  }
}
