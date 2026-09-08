const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generate() {
  const publicDir = path.join(__dirname, '../public');
  const iconSvg = fs.readFileSync(path.join(publicDir, 'icon.svg'));
  const maskableSvg = fs.readFileSync(path.join(publicDir, 'icon-maskable.svg'));

  console.log('Rendering pwa-192x192.png...');
  await sharp(iconSvg)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  console.log('Rendering pwa-512x512.png...');
  await sharp(iconSvg)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  console.log('Rendering pwa-maskable-512x512.png...');
  await sharp(maskableSvg)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  console.log('Rendering apple-touch-icon.png (180x180)...');
  await sharp(iconSvg)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  console.log('Rendering favicon-32x32.png...');
  await sharp(iconSvg)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));

  console.log('Rendering favicon.ico (as PNG container)...');
  await sharp(iconSvg)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  console.log('All PWA icons generated successfully!');
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
