export interface PreparedImage {
  blob: Blob;
  previewUrl: string;
  dominantHex: string | null;
  width: number;
  height: number;
}

export const WARDROBE_MAX_IMAGE_SIDE = 1280;
export const WARDROBE_MAX_SOURCE_BYTES = 25 * 1024 * 1024;

/**
 * Уменьшает фото до 1280px по длинной стороне, перекодирует в JPEG
 * и вычисляет доминирующий цвет вещи (центр кадра, без фона и бликов).
 */
export async function prepareWardrobeImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Выберите файл изображения');
  }

  if (file.size > WARDROBE_MAX_SOURCE_BYTES) {
    throw new Error('Фото слишком большое');
  }

  const image: HTMLImageElement = await loadImage(file);
  const scale: number = Math.min(1, WARDROBE_MAX_IMAGE_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const width: number = Math.max(1, Math.round(image.naturalWidth * scale));
  const height: number = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas: HTMLCanvasElement = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context: CanvasRenderingContext2D | null = canvas.getContext('2d');
  if (!context) {
    throw new Error('Браузер не поддерживает обработку фото');
  }

  // Белая подложка: у PNG с прозрачностью фон не станет чёрным.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const dominantHex: string | null = extractDominantColor(context, width, height);
  const blob: Blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result: Blob | null) => result ? resolve(result) : reject(new Error('Не удалось обработать фото')),
      'image/jpeg',
      0.86,
    );
  });

  return {
    blob,
    previewUrl: URL.createObjectURL(blob),
    dominantHex,
    width,
    height,
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url: string = URL.createObjectURL(file);
    const image: HTMLImageElement = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось открыть фото. Попробуйте JPEG или PNG'));
    };
    image.src = url;
  });
}

/**
 * Квантует пиксели центральной области в «корзины» (8 уровней на канал) и берёт самую
 * многочисленную; почти белые и прозрачные пиксели фона отбрасываются.
 */
export function extractDominantColor(context: CanvasRenderingContext2D, width: number, height: number): string | null {
  const sampleWidth: number = Math.max(1, Math.round(width * 0.6));
  const sampleHeight: number = Math.max(1, Math.round(height * 0.6));
  const left: number = Math.round((width - sampleWidth) / 2);
  const top: number = Math.round((height - sampleHeight) / 2);
  const data: Uint8ClampedArray = context.getImageData(left, top, sampleWidth, sampleHeight).data;

  const step: number = Math.max(1, Math.floor(Math.sqrt((sampleWidth * sampleHeight) / 6000)));
  const buckets: Map<number, { count: number; r: number; g: number; b: number }> = new Map();
  let total = 0;

  for (let y = 0; y < sampleHeight; y += step) {
    for (let x = 0; x < sampleWidth; x += step) {
      const index: number = (y * sampleWidth + x) * 4;
      const r: number = data[index];
      const g: number = data[index + 1];
      const b: number = data[index + 2];
      const alpha: number = data[index + 3];
      if (alpha < 200 || (r > 238 && g > 238 && b > 238)) {
        continue;
      }

      const key: number = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
      const bucket = buckets.get(key) ?? {count: 0, r: 0, g: 0, b: 0};
      bucket.count++;
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      buckets.set(key, bucket);
      total++;
    }
  }

  if (!total) {
    return '#F5F5F2';
  }

  let best: { count: number; r: number; g: number; b: number } | null = null;
  buckets.forEach((bucket) => {
    if (!best || bucket.count > best.count) {
      best = bucket;
    }
  });

  const winner = best as unknown as { count: number; r: number; g: number; b: number };
  const toHex = (value: number): string => Math.round(value / winner.count).toString(16).padStart(2, '0');
  return `#${toHex(winner.r)}${toHex(winner.g)}${toHex(winner.b)}`.toUpperCase();
}
