'use strict';

const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outputDirectory = path.join(root, 'discord assets');
const previewPath = path.join(outputDirectory, '.asset-preview.html');

async function exportPng(window, svgPath, pngPath) {
  const relativeSource = path.relative(outputDirectory, svgPath).split(path.sep).join('/');
  const background = path.basename(svgPath).includes('berrybaby') ? '#F5C3C2' : '#0a0712';
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{width:512px;height:512px;margin:0;overflow:hidden;background:${background}}img{display:block;width:512px;height:512px}</style></head><body><img src="${relativeSource}"></body></html>`;
  fs.writeFileSync(previewPath, html, 'utf8');
  await window.loadFile(previewPath);
  await window.webContents.executeJavaScript('new Promise((resolve, reject) => { const image = document.querySelector("img"); const done = () => image.naturalWidth ? resolve() : reject(new Error("Image failed to load")); if (image.complete) done(); else { image.onload = done; image.onerror = () => reject(new Error("Image failed to load")); } })');
  const image = await window.webContents.capturePage({ x: 0, y: 0, width: 512, height: 512 });
  if (image.isEmpty()) throw new Error(`Could not render ${svgPath}`);
  fs.writeFileSync(pngPath, image.resize({ width: 512, height: 512, quality: 'best' }).toPNG());
}

app.whenReady().then(async () => {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const window = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    frame: false,
    backgroundColor: '#0a0712',
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  try {
    const force = process.argv.includes('--force');
    const forceBerryBaby = process.argv.includes('--force-berrybaby');
    const assets = [
      [path.join(root, 'build', 'yunihub-icon-dehbify.svg'), path.join(outputDirectory, 'yunihub_dehbify.png')],
      [path.join(outputDirectory, 'workspace_dehbify.svg'), path.join(outputDirectory, 'workspace_dehbify.png')],
      [path.join(root, 'build', 'yunihub-icon-berrybaby.svg'), path.join(outputDirectory, 'yunihub_berrybaby.png')],
      [path.join(outputDirectory, 'workspace_berrybaby.svg'), path.join(outputDirectory, 'workspace_berrybaby.png')]
    ];
    for (const [source, target] of assets) {
      const isBerryBaby = path.basename(target).includes('berrybaby');
      if (!fs.existsSync(source) || (!force && !(forceBerryBaby && isBerryBaby) && fs.existsSync(target))) continue;
      await exportPng(window, source, target);
    }
  } finally {
    window.destroy();
    if (fs.existsSync(previewPath)) fs.unlinkSync(previewPath);
  }
  app.quit();
}).catch((error) => {
  console.error(error);
  app.exit(1);
});
