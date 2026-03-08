import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AVATAR_DIR = path.join(__dirname, '../public/avatar');
const OUT_WEBP = path.join(__dirname, '../public/michael-sprite.webp');

// Frame order matches VISEME_MAP in MichaelAvatar.tsx
// 0=sil, 1=PP/nn, 2=E/I, 3=SS, 4=aa, 5=O/RR/CH, 6=FF/TH, 7=U, 8=L, 9=listening, 10=blink, 11=thinking
const FRAMES = [
  'REST.png',    // 0 sil
  'BMP.png',     // 1 PP, nn
  'EI.png',      // 2 E, I
  'SZ.png',      // 3 SS
  'A.png',       // 4 aa, DD, kk
  'WU.png',      // 5 O, RR, CH
  'FV.png',      // 6 FF, TH
  'WU.png',      // 7 U (same pose as WU)
  'L.png',       // 8 L
  'REST.png',    // 9 listening (same as sil)
  'Blink.png',   // 10 blink
  'Thinking.png',// 11 thinking
];

const FRAME_SIZE = 1024;
const TOTAL_FRAMES = FRAMES.length;

async function buildSprite() {
  console.log(`Building sprite: ${TOTAL_FRAMES} frames @ ${FRAME_SIZE}px each`);

  // Load and resize all frames to 1024x1024
  const buffers = await Promise.all(
    FRAMES.map(async (file, i) => {
      const p = path.join(AVATAR_DIR, file);
      const buf = await sharp(p)
        .resize(FRAME_SIZE, FRAME_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      console.log(`  [${i}] ${file} → OK`);
      return { input: buf, left: i * FRAME_SIZE, top: 0 };
    })
  );

  const totalWidth = FRAME_SIZE * TOTAL_FRAMES;

  await sharp({
    create: {
      width: totalWidth,
      height: FRAME_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(buffers)
    .webp({ quality: 90 })
    .toFile(OUT_WEBP);

  console.log(`\nSprite saved: ${OUT_WEBP}`);
  console.log(`Size: ${totalWidth}x${FRAME_SIZE}px, ${TOTAL_FRAMES} frames`);
}

buildSprite().catch(err => { console.error(err); process.exit(1); });
