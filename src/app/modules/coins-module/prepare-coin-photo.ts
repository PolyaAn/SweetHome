const maxSourceBytes = 12 * 1024 * 1024;
const maxSavedBytes = 2 * 1024 * 1024;
const maxSide = 1440;

export async function prepareCoinPhoto(file: File): Promise<{ preview: string; data: string }> {
  if (!file.type.startsWith('image/') || file.size > maxSourceBytes) {
    throw new Error('Нужно изображение размером до 12 МБ.');
  }

  const image = await createImageBitmap(file);
  let blob: Blob;
  try {
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const drawing = canvas.getContext('2d');
    if (!drawing) throw new Error('Не удалось обработать фото.');
    drawing.drawImage(image, 0, 0, canvas.width, canvas.height);
    blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(result => result ? resolve(result) : reject(new Error('Не удалось обработать фото.')), 'image/webp', 0.89);
    });
  } finally {
    image.close();
  }

  if (blob.size > maxSavedBytes) throw new Error('Фото не удалось уменьшить до 2 МБ.');
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return { preview: URL.createObjectURL(blob), data };
}
