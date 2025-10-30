import type { Area } from "react-easy-crop";

type CropImageOptions = {
  fileName: string;
  mimeType?: string;
  outputSize?: number;
};

const DEFAULT_OUTPUT_SIZE = 512;

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (event) => reject(event));
    image.src = src;
  });

export const cropImageToFile = async (
  imageSrc: string,
  cropArea: Area,
  { fileName, mimeType = "image/jpeg", outputSize = DEFAULT_OUTPUT_SIZE }: CropImageOptions,
) => {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("キャンバスの初期化に失敗しました。");
  }

  const targetSize = Math.max(outputSize, 1);
  canvas.width = targetSize;
  canvas.height = targetSize;

  context.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    targetSize,
    targetSize,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result);
        } else {
          reject(new Error("画像のトリミングに失敗しました。"));
        }
      },
      mimeType,
      0.92,
    );
  });

  const file = new File([blob], fileName, { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);

  return { file, objectUrl };
};
