import { ImageQualityAssessment } from '../types';

/**
 * Evaluates image quality in-browser using HTML5 Canvas.
 * Computes luminance, contrast, edge intensity (Laplacian variance proxy for blur), and glare.
 */
export async function analyzeImageQuality(dataUrl: string): Promise<ImageQualityAssessment> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        // Sample at 300x300 for fast processing
        const width = 300;
        const height = Math.round((img.height / img.width) * width) || 300;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(getDefaultQuality());
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        let totalBrightness = 0;
        let glarePixels = 0;
        const pixelCount = data.length / 4;

        // Grayscale values
        const gray: number[] = new Array(pixelCount);

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Perceived luminance
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          gray[i / 4] = lum;
          totalBrightness += lum;

          // Glare detection (pure blown out white > 248 across channels)
          if (r > 248 && g > 248 && b > 248) {
            glarePixels++;
          }
        }

        const avgBrightness = totalBrightness / pixelCount;
        const brightnessScore = Math.round((avgBrightness / 255) * 100);
        const glareRatio = glarePixels / pixelCount;
        const glareDetected = glareRatio > 0.08;

        // Laplacian variance edge estimation for blur
        let edgeVariance = 0;
        let edgeCount = 0;
        for (let y = 1; y < height - 1; y += 2) {
          for (let x = 1; x < width - 1; x += 2) {
            const idx = y * width + x;
            const center = gray[idx];
            const laplacian =
              gray[idx - 1] +
              gray[idx + 1] +
              gray[idx - width] +
              gray[idx + width] -
              4 * center;
            edgeVariance += Math.abs(laplacian);
            edgeCount++;
          }
        }

        const avgEdge = edgeCount > 0 ? edgeVariance / edgeCount : 0;
        // Map average edge to 0-100 score
        const blurScore = Math.min(100, Math.max(10, Math.round(avgEdge * 5)));

        const warnings: string[] = [];
        let isAcceptable = true;

        if (img.naturalWidth < 400 || img.naturalHeight < 400) {
          warnings.push('Low image resolution (text may be difficult to read).');
        }

        if (blurScore < 28) {
          warnings.push('Image appears blurry or out of focus.');
          isAcceptable = false;
        }

        if (brightnessScore < 25) {
          warnings.push('Image is too dark. Increase lighting on package.');
          isAcceptable = false;
        } else if (brightnessScore > 90) {
          warnings.push('Image is overexposed.');
        }

        if (glareDetected) {
          warnings.push('Possible glare/reflection obscuring package text.');
        }

        const textLegibilityEstimated = blurScore >= 35 && brightnessScore >= 30 && brightnessScore <= 85;

        resolve({
          isAcceptable: warnings.length <= 1,
          blurScore,
          brightnessScore,
          glareDetected,
          textLegibilityEstimated,
          warnings,
        });
      } catch (err) {
        console.warn('Image analysis fallback:', err);
        resolve(getDefaultQuality());
      }
    };

    img.onerror = () => {
      resolve(getDefaultQuality());
    };

    img.src = dataUrl;
  });
}

function getDefaultQuality(): ImageQualityAssessment {
  return {
    isAcceptable: true,
    blurScore: 80,
    brightnessScore: 70,
    glareDetected: false,
    textLegibilityEstimated: true,
    warnings: [],
  };
}
