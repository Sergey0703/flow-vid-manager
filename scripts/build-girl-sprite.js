// Build girl-sprite.png — 6 frames, hw=360, FACE_H=610, FRAME=500
// Preston Blair viseme order (matches cat-sprite.png mapping):
//   0: sil   → SAD    (col6 row2)
//   1: PP/nn → BMP    (col1 row2)
//   2: E/I   → AEI    (col0 row1)
//   3: aa    → O      (col2 row1)
//   4: O/CH  → CHJ    (col0 row2)
//   5: TH/FF → TH     (col1 row1)

import { Jimp } from 'jimp';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function buildSprite() {
  const src = await Jimp.read(path.join(__dirname, '../public/lipsync.jpg'));
  console.log(`Source: ${src.width}×${src.height}`);

  const hw     = 360;   // half-width of crop
  const FACE_H = 610;   // crop height (from hairline)
  const FRAME  = 500;   // output frame size (square)

  // Each entry: cx = face center x, y = row hairline y
  const frames = [
    { cx: 6540, y: 1564, label: 'SAD  (sil)'    },  // 0
    { cx: 3077, y: 1564, label: 'BMP  (PP/nn)'  },  // 1
    { cx: 2384, y:  686, label: 'AEI  (E/I/SS)' },  // 2
    { cx: 3769, y:  686, label: 'O    (aa/DD)'  },  // 3
    { cx: 2384, y: 1564, label: 'CHJ  (O/RR/CH)'},  // 4
    { cx: 3077, y:  686, label: 'TH   (TH/FF)'  },  // 5
  ];

  const sprite = new Jimp({ width: FRAME * frames.length, height: FRAME, color: 0xFFFFFFFF });

  for (let i = 0; i < frames.length; i++) {
    const { cx, y, label } = frames[i];
    const frame = src.clone()
      .crop({ x: cx - hw, y, w: hw * 2, h: FACE_H })
      .resize({ w: FRAME, h: FRAME });
    sprite.composite(frame, i * FRAME, 0);
    console.log(`  frame ${i}: ${label}  (crop x=${cx - hw}–${cx + hw}, y=${y}–${y + FACE_H})`);
  }

  const out = path.join(__dirname, '../public/girl-sprite.png');
  await sprite.write(out);
  console.log(`\nSaved: ${out}  (${FRAME * frames.length}×${FRAME})`);
}

buildSprite().catch(console.error);
