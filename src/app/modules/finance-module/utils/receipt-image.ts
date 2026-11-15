/** Чеки длинные и с мелким текстом: держим больше пикселей, чем у фото вещей, но укладываемся в 5 МБ. */
export const RECEIPT_MAX_IMAGE_SIDE = 2400;
export const RECEIPT_MAX_SOURCE_BYTES = 30 * 1024 * 1024;
export const RECEIPT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Уменьшает фото чека до 2400px по длинной стороне и перекодирует в JPEG.
 * Если всё равно вышло больше 5 МБ — снижает качество.
 */
export async function prepareReceiptImage(file: File): Promise<Blob> {
  if (file.type && !file.type.startsWith('image/')) {
    throw new Error('Выберите фото чека');
  }
  if (file.size > RECEIPT_MAX_SOURCE_BYTES) {
    throw new Error('Фото слишком большое');
  }

  const image: HTMLImageElement = await loadImage(file);
  const scale: number = Math.min(1, RECEIPT_MAX_IMAGE_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const width: number = Math.max(1, Math.round(image.naturalWidth * scale));
  const height: number = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas: HTMLCanvasElement = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context: CanvasRenderingContext2D | null = canvas.getContext('2d');
  if (!context) {
    throw new Error('Браузер не поддерживает обработку фото');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  for (const quality of [0.86, 0.75, 0.6]) {
    const blob: Blob = await toJpeg(canvas, quality);
    if (blob.size <= RECEIPT_MAX_UPLOAD_BYTES) {
      return blob;
    }
  }

  throw new Error('Фото слишком большое');
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result: Blob | null) => result ? resolve(result) : reject(new Error('Не удалось обработать фото')),
      'image/jpeg',
      quality,
    );
  });
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
