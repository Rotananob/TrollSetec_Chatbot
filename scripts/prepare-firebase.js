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

// KonBong route
if (fs.existsSync(path.join(serverAppDir, 'KonBong.html'))) {
  fs.copyFileSync(path.join(serverAppDir, 'KonBong.html'), path.join(outDir, 'KonBong.html'));
  const konBongDir = path.join(outDir, 'KonBong');
  if (!fs.existsSync(konBongDir)) fs.mkdirSync(konBongDir, { recursive: true });
  fs.copyFileSync(path.join(serverAppDir, 'KonBong.html'), path.join(konBongDir, 'index.html'));
}

// KonPov route
if (fs.existsSync(path.join(serverAppDir, 'KonPov.html'))) {
  fs.copyFileSync(path.join(serverAppDir, 'KonPov.html'), path.join(outDir, 'KonPov.html'));
  const konPovDir = path.join(outDir, 'KonPov');
  if (!fs.existsSync(konPovDir)) fs.mkdirSync(konPovDir, { recursive: true });
  fs.copyFileSync(path.join(serverAppDir, 'KonPov.html'), path.join(konPovDir, 'index.html'));
}

// 404 page
if (fs.existsSync(path.join(serverAppDir, '_not-found.html'))) {
  fs.copyFileSync(path.join(serverAppDir, '_not-found.html'), path.join(outDir, '404.html'));
}

console.log('✅ Firebase distribution successfully prepared in dist-firebase/');
