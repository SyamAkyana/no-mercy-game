/* Generate No Mercy PWA icons (pure Node, no deps — writes PNGs via zlib).
   Design: dark-red felt gradient + gold rounded-square ring + gold center circle. */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/* ---- minimal PNG encoder ---- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // 8-bit RGBA
  // raw scanlines with filter byte 0 per row
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0;
    rgba.copy(raw, y * (1 + w * 4) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

/* ---- drawing helpers (RGBA buffer) ---- */
function distToRoundedRect(px, py, x0, y0, x1, y1, r) {
  const cx = Math.max(x0 + r, Math.min(px, x1 - r));
  const cy = Math.max(y0 + r, Math.min(py, y1 - r));
  return Math.hypot(px - cx, py - cy);
}

function makeIcon(size, scale) {
  const S = size;
  const rgba = Buffer.alloc(S * S * 4);
  // ring square coords (scaled), centered
  const m = S * (0.5 - 0.3 * scale);       // outer box inset
  const M = S * (0.5 + 0.3 * scale);
  const r = S * 0.1 * scale;
  const ringW = Math.max(4, S * 0.045 * scale);      // ring thickness
  const inner = S * 0.018 * scale;
  const circleR = S * 0.22 * scale;
  const cx = S / 2, cy = S / 2;

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      // vertical gradient background: #6a2020 (top) -> #120505 (bottom)
      const t = y / (S - 1);
      let R = Math.round(0x6a * (1 - t) + 0x12 * t);
      let G = Math.round(0x20 * (1 - t) + 0x05 * t);
      let B = Math.round(0x20 * (1 - t) + 0x05 * t);
      let A = 255;

      const d = distToRoundedRect(x + 0.5, y + 0.5, m, m, M, M, r);
      const onRing = d >= ringW - inner && d <= ringW + inner;
      const inBox = d <= ringW; // inside the ring square (fill area is box interior)

      // center circle (gold) drawn on top of box interior
      const dc = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const onCircle = Math.abs(dc - circleR) <= ringW * 0.8;
      const inCircle = dc <= circleR;

      if (onRing || onCircle) {
        R = 0xd4; G = 0xa0; B = 0x17; // gold #d4a017
      } else if (inCircle) {
        R = 0xf0; G = 0xc0; B = 0x40; // bright gold #f0c040
      } else if (inBox) {
        // box interior: slightly lighter felt
        R = Math.round(R * 0.85 + 0x2a * 0.15);
        G = Math.round(G * 0.85 + 0x0a * 0.15);
        B = Math.round(B * 0.85 + 0x0a * 0.15);
      }

      rgba[i] = R; rgba[i + 1] = G; rgba[i + 2] = B; rgba[i + 3] = A;
    }
  }
  return encodePNG(S, S, rgba);
}

const dir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'icon-192.png'), makeIcon(192, 1));
fs.writeFileSync(path.join(dir, 'icon-512.png'), makeIcon(512, 1));
// maskable: content scaled to ~78% inside the safe zone on the dark bg
fs.writeFileSync(path.join(dir, 'maskable-512.png'), makeIcon(512, 0.78));
console.log('icons written to', dir);
