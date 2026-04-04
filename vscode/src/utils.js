const fs = require('fs');
const toml = require('toml');

function getNonce() {
  let nonce = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    nonce += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return nonce;
}

function getTomlValue(filePath, key) {
  if (!filePath || !fs.existsSync(filePath)) {
    return undefined;
  }
  try {
    const tomlContent = fs.readFileSync(filePath, 'utf8');
    const parsed = toml.parse(tomlContent);
    const profile = parsed && parsed.profile && parsed.profile.default;
    return profile && profile[key] != null ? String(profile[key]) : undefined;
  } catch (e) {
    return undefined;
  }
}

module.exports = {
  getNonce,
  getTomlValue,
};
