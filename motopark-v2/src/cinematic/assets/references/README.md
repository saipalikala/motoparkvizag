# Reference Images

Place your two reference images here:

- `tunnel-start.png`   — The first-person tunnel entrance (start of the ride)
- `motopark-arrival.png` — The MotoPark storefront (end of the ride)

## How these are used

These images are **not imported by Vite**. They are served statically at:

```
/cinematic/references/tunnel-start.png
/cinematic/references/motopark-arrival.png
```

So the files must also be placed in:

```
public/cinematic/references/
├── tunnel-start.png
└── motopark-arrival.png
```

> The `src/cinematic/assets/references/` folder (this folder) is for **source
> storage and documentation**. The actual runtime path is `public/cinematic/references/`.

## To update the fallback image

Edit `SEQUENCE_CONFIG.fallbackImageUrl` in `src/cinematic/about/aboutConfig.js`.
