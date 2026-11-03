import { definePwaApp } from '@alcariss/pwa-kit/vite';

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

export default definePwaApp({
  name: 'Hlášky',
  description: 'Sledování a ukládání nezapomenutelných citátů',
  lang: 'cs-CZ',
  themeColor: '#667eea',
  backgroundColor: '#f8f9fa',
  icons: ICON_SIZES.map((size) => ({
    src: `icon-${size}x${size}.png`,
    sizes: `${size}x${size}`,
    type: 'image/png',
    purpose: size >= 192 ? 'any maskable' : 'any'
  })),
  includeAssets: ICON_SIZES.map((size) => `icon-${size}x${size}.png`)
});
