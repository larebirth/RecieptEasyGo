import { Receipt } from '../types';

/**
 * Compresses an image file or data URL to reasonable dimensions (max 1800px)
 * to ensure fast uploads and low latency for Gemini API processing.
 */
export async function prepareImageForGemini(
  fileOrDataUrl: File | string,
  maxWidth = 1800,
  quality = 0.85
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth || height > maxWidth) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxWidth) / height);
          height = maxWidth;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context could not be acquired'));
        return;
      }

      // Draw white background in case of transparent PNG/SVG
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const mimeType = 'image/jpeg';
      const compressedDataUrl = canvas.toDataURL(mimeType, quality);
      resolve({
        base64: compressedDataUrl,
        mimeType,
      });
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for scanning'));
    };

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}

/**
 * Calls backend /api/scan-receipt endpoint with image base64
 */
export async function scanReceiptWithGemini(
  imageDataUrl: string,
  userPromptHint?: string
): Promise<Receipt> {
  const { base64, mimeType } = await prepareImageForGemini(imageDataUrl);

  const response = await fetch('/api/scan-receipt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageBase64: base64,
      mimeType,
      userPromptHint,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Receipt scanning failed with status ${response.status}`
    );
  }

  const result = await response.json();
  if (!result.receipt) {
    throw new Error('No receipt extracted from response.');
  }

  // Attach original image data URL for UI display and receipt viewer
  return {
    ...result.receipt,
    imageUrl: imageDataUrl,
  };
}
