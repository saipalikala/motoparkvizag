/**
 * cloudinaryUrl — inject delivery transforms into a Cloudinary URL so we serve
 * auto-format (WebP/AVIF), auto-quality, right-sized images instead of the full
 * original. Non-Cloudinary URLs (or empty) pass through untouched.
 *
 * e.g. .../image/upload/v123/x.jpg → .../image/upload/f_auto,q_auto,w_400,dpr_auto/v123/x.jpg
 */
export function cloudinaryUrl(url, { w, dpr = 'auto' } = {}) {
  if (!url || typeof url !== 'string' || !url.includes('/image/upload/')) return url;
  const parts = ['f_auto', 'q_auto', w ? `w_${w}` : null, dpr ? `dpr_${dpr}` : null].filter(Boolean);
  return url.replace('/image/upload/', `/image/upload/${parts.join(',')}/`);
}
