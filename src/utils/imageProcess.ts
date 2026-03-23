/**
 * Utility to get dimensions of a base64 image
 */
export async function getImageDimensions(base64: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = base64;
  });
}

/**
 * Utility to crop a base64 image to a target aspect ratio
 */
export async function cropToAspectRatio(
  base64: string,
  aspectRatio: string
): Promise<string> {
  const [wRatio, hRatio] = aspectRatio.split(':').map(Number);
  const targetRatio = wRatio / hRatio;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const currentRatio = img.width / img.height;
      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = img.width;
      let sourceHeight = img.height;

      if (currentRatio > targetRatio) {
        // Image is wider than target ratio - crop sides
        sourceWidth = img.height * targetRatio;
        sourceX = (img.width - sourceWidth) / 2;
      } else {
        // Image is taller than target ratio - crop top/bottom
        sourceHeight = img.width / targetRatio;
        sourceY = (img.height - sourceHeight) / 2;
      }

      const canvas = document.createElement('canvas');
      // Use a reasonable size for generation (e.g., 1024px on the longest side)
      const maxDim = 1024;
      if (wRatio >= hRatio) {
        canvas.width = maxDim;
        canvas.height = Math.round(maxDim / targetRatio);
      } else {
        canvas.height = maxDim;
        canvas.width = Math.round(maxDim * targetRatio);
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, canvas.width, canvas.height
      );
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = reject;
    img.src = base64;
  });
}

/**
 * Utility to find the closest supported aspect ratio
 */
export function getClosestAspectRatio(width: number, height: number): string {
  const supported = ["1:1", "3:4", "4:3", "9:16", "16:9"];
  const currentRatio = width / height;
  
  let closest = supported[0];
  let minDiff = Math.abs(currentRatio - 1);

  for (const ratio of supported) {
    const [w, h] = ratio.split(':').map(Number);
    const diff = Math.abs(currentRatio - (w / h));
    if (diff < minDiff) {
      minDiff = diff;
      closest = ratio;
    }
  }
  
  return closest;
}

/**
 * Utility to resize a base64 image to target dimensions
 */
export async function resizeImage(
  base64: string,
  targetWidth: number,
  targetHeight: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      // Draw and scale
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = reject;
    img.src = base64;
  });
}
