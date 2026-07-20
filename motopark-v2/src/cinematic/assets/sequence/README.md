# Frame Sequence

Place your WebP frame sequence here for documentation/source storage.

## Naming convention

```
frame0001.webp
frame0002.webp
...
frame0250.webp   (or however many frames you have)
```

## ⚠️ Runtime location

Frames are loaded via URL at runtime (not bundled by Vite).

**The frames must be placed in:**

```
public/cinematic/sequence/
├── frame0001.webp
├── frame0002.webp
└── ...
```

Vite serves `public/` as static files at the root. A frame at
`public/cinematic/sequence/frame0001.webp` is accessible at
`/cinematic/sequence/frame0001.webp`.

## After adding frames

Update `src/cinematic/about/aboutConfig.js`:

```js
export const SEQUENCE_CONFIG = {
  totalFrames: 250,   // ← set to your actual frame count
  hasFrames:   true,  // ← set to true
  // ...
};
```

## Performance

- **Format**: WebP (lossy, ~70–80% quality). AVIF if browser support is acceptable.
- **Resolution**: Match the canvas display resolution. 1280×720 is a good target.
- **Size per frame**: Target ≤ 30 KB/frame. 250 × 30 KB = ~7.5 MB total (in-memory).
- **Preloading**: Frames 1 and 250 load first (priority). Remaining load in
  idle-time batches of 15. The canvas shows `tunnel-start.png` until frame 1 loads.
