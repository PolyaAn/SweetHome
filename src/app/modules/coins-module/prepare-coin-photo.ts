const maxSourceBytes = 12 * 1024 * 1024;
const maxSavedBytes = 2 * 1024 * 1024;
const maxSide = 700;

export async function openCoinPhoto(file: File): Promise<ImageBitmap> {
  if (!file.type.startsWith('image/') || file.size > maxSourceBytes) {
    throw new Error('Нужно изображение размером до 12 МБ.');
  }
  return createImageBitmap(file);
}

export type CoinPhotoCrop = { x: number; y: number; zoom: number };

export function drawCoinPhoto(canvas: HTMLCanvasElement, image: ImageBitmap, crop: CoinPhotoCrop, preview: boolean): void {
  const drawing = canvas.getContext('2d');
  if (!drawing) throw new Error('Не удалось обработать фото.');
  const size = canvas.width;
  const side = Math.min(image.width, image.height) / crop.zoom;
  const x = (image.width - side) * (1 + crop.x) / 2;
  const y = (image.height - side) * (1 + crop.y) / 2;
  drawing.clearRect(0, 0, size, size);
  drawing.save();
  if (!preview) {
    drawing.beginPath();
    drawing.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    drawing.clip();
  }
  drawing.drawImage(image, x, y, side, side, 0, 0, size, size);
  if (preview) {
    drawing.fillStyle = 'rgba(16, 11, 9, .7)';
    drawing.beginPath();
    drawing.rect(0, 0, size, size);
    drawing.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    drawing.fill('evenodd');
    drawing.beginPath();
    drawing.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    drawing.strokeStyle = '#ffe1b1';
    drawing.lineWidth = 2;
    drawing.stroke();
  }
  drawing.restore();
}

export async function prepareCoinPhoto(image: ImageBitmap, crop: CoinPhotoCrop): Promise<{ preview: string; data: string }> {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = Math.max(1, Math.min(maxSide, Math.round(Math.min(image.width, image.height) / crop.zoom)));
  drawCoinPhoto(canvas, image, crop, false);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(result => result ? resolve(result) : reject(new Error('Не удалось обработать фото.')), 'image/png');
  });
  if (blob.size > maxSavedBytes) throw new Error('Фото не удалось уменьшить до 2 МБ.');
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return { preview: URL.createObjectURL(blob), data };
}
