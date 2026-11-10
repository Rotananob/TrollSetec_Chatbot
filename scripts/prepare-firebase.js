// scripts/prepare-firebase.js
// Packages the pre-rendered Next.js output for ultra-fast, zero-cloud-function Firebase Hosting

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'dist-firebase');
const nextDir = path.join(rootDir, '.next');
const serverAppDir = path.join(nextDir, 'server', 'app');
const nextStaticDir = path.join(nextDir, 'static');
const publicDir = path.join(rootDir, 'public');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(child => {
      copyRecursive(path.join(src, child), path.join(dest, child));
    });
  } else {
    const parent = path.dirname(dest);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

console.log('🚀 Preparing static distribution for Firebase Hosting...');

// 1. Clean output directory
if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(outDir, { recursive: true });

// 2. Copy all public assets (images, icons, audio, manifest)
console.log('📁 Copying public assets...');
copyRecursive(publicDir, outDir);

// 3. Copy Next.js static chunks (_next/static/...)
console.log('⚡ Copying Next.js CSS & JS chunks...');
copyRecursive(nextStaticDir, path.join(outDir, '_next', 'static'));

// 4. Copy pre-rendered static HTML pages
console.log('📄 Copying pre-rendered HTML routes...');
// Home page
if (fs.existsSync(path.join(serverAppDir, 'index.html'))) {
  fs.copyFileSync(path.join(serverAppDir, 'index.html'), path.join(outDir, 'index.html'));
}

// KonBong route (Both PascalCase and lowercase support)
if (fs.existsSync(path.join(serverAppDir, 'KonBong.html'))) {
  fs.copyFileSync(path.join(serverAppDir, 'KonBong.html'), path.join(outDir, 'KonBong.html'));
  fs.copyFileSync(path.join(serverAppDir, 'KonBong.html'), path.join(outDir, 'konbong.html'));
  const konBongDir = path.join(outDir, 'KonBong');
  if (!fs.existsSync(konBongDir)) fs.mkdirSync(konBongDir, { recursive: true });
  fs.copyFileSync(path.join(serverAppDir, 'KonBong.html'), path.join(konBongDir, 'index.html'));
  const konBongLowerDir = path.join(outDir, 'konbong');
  if (!fs.existsSync(konBongLowerDir)) fs.mkdirSync(konBongLowerDir, { recursive: true });
  fs.copyFileSync(path.join(serverAppDir, 'KonBong.html'), path.join(konBongLowerDir, 'index.html'));
}

// KonPov route (Both PascalCase and lowercase support)
if (fs.existsSync(path.join(serverAppDir, 'KonPov.html'))) {
  fs.copyFileSync(path.join(serverAppDir, 'KonPov.html'), path.join(outDir, 'KonPov.html'));
  fs.copyFileSync(path.join(serverAppDir, 'KonPov.html'), path.join(outDir, 'konpov.html'));
  const konPovDir = path.join(outDir, 'KonPov');
  if (!fs.existsSync(konPovDir)) fs.mkdirSync(konPovDir, { recursive: true });
  fs.copyFileSync(path.join(serverAppDir, 'KonPov.html'), path.join(konPovDir, 'index.html'));
  const konPovLowerDir = path.join(outDir, 'konpov');
  if (!fs.existsSync(konPovLowerDir)) fs.mkdirSync(konPovLowerDir, { recursive: true });
  fs.copyFileSync(path.join(serverAppDir, 'KonPov.html'), path.join(konPovLowerDir, 'index.html'));
}

// KonKandal route (Both PascalCase and lowercase support)
if (fs.existsSync(path.join(serverAppDir, 'KonKandal.html'))) {
  fs.copyFileSync(path.join(serverAppDir, 'KonKandal.html'), path.join(outDir, 'KonKandal.html'));
  fs.copyFileSync(path.join(serverAppDir, 'KonKandal.html'), path.join(outDir, 'konkandal.html'));
  const konKandalDir = path.join(outDir, 'KonKandal');
  if (!fs.existsSync(konKandalDir)) fs.mkdirSync(konKandalDir, { recursive: true });
  fs.copyFileSync(path.join(serverAppDir, 'KonKandal.html'), path.join(konKandalDir, 'index.html'));
  const konKandalLowerDir = path.join(outDir, 'konkandal');
  if (!fs.existsSync(konKandalLowerDir)) fs.mkdirSync(konKandalLowerDir, { recursive: true });
  fs.copyFileSync(path.join(serverAppDir, 'KonKandal.html'), path.join(konKandalLowerDir, 'index.html'));
}

// jam-tic-kapea-1-sin route (Admin Control Panel)
if (fs.existsSync(path.join(serverAppDir, 'jam-tic-kapea-1-sin.html'))) {
  fs.copyFileSync(path.join(serverAppDir, 'jam-tic-kapea-1-sin.html'), path.join(outDir, 'jam-tic-kapea-1-sin.html'));
  const adminDir = path.join(outDir, 'jam-tic-kapea-1-sin');
  if (!fs.existsSync(adminDir)) fs.mkdirSync(adminDir, { recursive: true });
  fs.copyFileSync(path.join(serverAppDir, 'jam-tic-kapea-1-sin.html'), path.join(adminDir, 'index.html'));
}

// announcement route (AI Testing Playground Notice)
if (fs.existsSync(path.join(serverAppDir, 'announcement.html'))) {
  fs.copyFileSync(path.join(serverAppDir, 'announcement.html'), path.join(outDir, 'announcement.html'));
  const annDir = path.join(outDir, 'announcement');
  if (!fs.existsSync(annDir)) fs.mkdirSync(annDir, { recursive: true });
  fs.copyFileSync(path.join(serverAppDir, 'announcement.html'), path.join(annDir, 'index.html'));
}

// privacy route (Privacy and Policy)
if (fs.existsSync(path.join(serverAppDir, 'privacy.html'))) {
  fs.copyFileSync(path.join(serverAppDir, 'privacy.html'), path.join(outDir, 'privacy.html'));
  const privDir = path.join(outDir, 'privacy');
  if (!fs.existsSync(privDir)) fs.mkdirSync(privDir, { recursive: true });
  fs.copyFileSync(path.join(serverAppDir, 'privacy.html'), path.join(privDir, 'index.html'));
}

// 404 page
if (fs.existsSync(path.join(serverAppDir, '_not-found.html'))) {
  fs.copyFileSync(path.join(serverAppDir, '_not-found.html'), path.join(outDir, '404.html'));
}

// 5. Generate version.json for Real-Time PWA Auto-Update Detection
const buildTime = Date.now();
const versionData = JSON.stringify({
  version: '1.0.' + Math.floor(buildTime / 1000),
  buildTime,
  date: new Date().toISOString()
}, null, 2);

fs.writeFileSync(path.join(publicDir, 'version.json'), versionData);
fs.writeFileSync(path.join(outDir, 'version.json'), versionData);
console.log('📌 Generated version.json with build timestamp:', buildTime);

console.log('✅ Firebase distribution successfully prepared in dist-firebase/');
