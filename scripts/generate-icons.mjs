import { readFile, writeFile } from 'node:fs/promises';
import pngToIco from 'png-to-ico';
import sharp from 'sharp';

const source = await readFile(new URL('../assets/icon.svg', import.meta.url));
const png = await sharp(source).resize(512, 512).png().toBuffer();
const windowsPng = await sharp(source).resize(256, 256).png().toBuffer();

await Promise.all([
  writeFile(new URL('../assets/icon.png', import.meta.url), png),
  pngToIco(windowsPng).then((icon) =>
    writeFile(new URL('../assets/icon.ico', import.meta.url), icon),
  ),
]);

console.log('Generated assets/icon.png and assets/icon.ico');
