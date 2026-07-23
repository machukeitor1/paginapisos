export interface ImageSrcSet {
  src: string;
  srcSet: string;
  sizes: string;
  isResponsive: boolean;
}

export function getImageSrcSet(url: string, sizes = '(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px'): ImageSrcSet {
  if (!url) {
    return { src: '', srcSet: '', sizes: '', isResponsive: false };
  }

  // New format: contains _original.webp
  if (url.includes('_original.webp')) {
    const base = url.replace('_original.webp', '');
    return {
      src: `${base}_w800.webp`,
      srcSet: `${base}_w400.webp 400w, ${base}_w800.webp 800w, ${base}_w1200.webp 1200w, ${base}_original.webp 1600w`,
      sizes,
      isResponsive: true,
    };
  }

  // Old format: no variants
  return { src: url, srcSet: '', sizes: '', isResponsive: false };
}
