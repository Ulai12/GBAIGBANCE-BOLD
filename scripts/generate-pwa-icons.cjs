const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function render(publicDir, source, target, size) {
  await sharp(path.join(publicDir, source)).resize(size, size).png().toFile(path.join(publicDir, target));
}

async function generate(publicDir = path.join(__dirname, '../public')) {
  await Promise.all([
    render(publicDir, 'icon.svg', 'pwa-192x192.png', 192),
    render(publicDir, 'icon.svg', 'pwa-512x512.png', 512),
    render(publicDir, 'icon-maskable.svg', 'pwa-maskable-512x512.png', 512),
    render(publicDir, 'icon-dark.svg', 'pwa-dark-512x512.png', 512),
    render(publicDir, 'icon-maskable-dark.svg', 'pwa-maskable-dark-512x512.png', 512),
    render(publicDir, 'icon.svg', 'apple-touch-icon.png', 180),
    render(publicDir, 'icon-dark.svg', 'apple-touch-icon-dark.png', 180),
    render(publicDir, 'icon.svg', 'favicon-32x32.png', 32),
    render(publicDir, 'icon.svg', 'favicon.ico', 64),
  ]);
  console.log('GBAIGBANCE light/dark Liquid Glass icons generated successfully.');
}

module.exports = { generate };
