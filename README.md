# Privacy Cleaner

Privacy Cleaner combines the former photo, screenshot, and PDF privacy tools into one static product for cleaning files before sharing.

## What It Includes

- Task-based workflows for photos, screenshots, and PDFs
- Presets for common sharing jobs
- Simple mode first, with advanced options hidden until needed
- Batch-friendly result list with filtering, sorting, warnings, and download actions
- Light, dark, and system themes with local preference persistence
- Privacy-first trust copy, FAQ content, favicon, social preview, robots.txt, sitemap.xml, and JSON-LD metadata
- No login, ads, tracking, backend, or storage assumptions

## Development

```bash
npm install
npm run dev
```

## Checks

```bash
npm run lint
npm run build
```

## Deploy

The app is a Vite static frontend and works well on Cloudflare Pages or any static host.

For Cloudflare Pages:

- Build command: `npm run build`
- Output directory: `dist`
- Node version: current LTS

## Notes

This implementation models the complete product shell and safe local-first UX. Production file cleaning can be added behind the existing task modules with browser APIs, WebAssembly libraries, or optional worker-based processing for cases that cannot be handled safely in the browser alone.
