import { GoogleGenAI } from "@google/genai";
import { resizeImage, getImageDimensions } from "../utils/imageProcess";

/**
 * Helper to convert URL to base64
 */
async function urlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Helper to ensure image is within reasonable size and format
 */
async function prepareImage(base64: string): Promise<string> {
  const { width, height } = await getImageDimensions(base64);
  const maxDim = 2048;
  let targetWidth = width;
  let targetHeight = height;

  if (width > maxDim || height > maxDim) {
    if (width > height) {
      targetWidth = maxDim;
      targetHeight = Math.round((height / width) * maxDim);
    } else {
      targetHeight = maxDim;
      targetWidth = Math.round((width / height) * maxDim);
    }
    return await resizeImage(base64, targetWidth, targetHeight);
  }
  
  // Even if not resizing, convert to JPEG to save space
  return await resizeImage(base64, width, height);
}

export async function tryOnClothing(
  personImage: string,
  clothingItems: { type: string; base64: string }[],
  aspectRatio: string = "1:1"
): Promise<string | null> {
  // Create a new GoogleGenAI instance right before making an API call to ensure it uses the latest selected key
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  try {
    // Convert person image to base64 if it's a URL
    let personBase64 = personImage;
    if (personImage.startsWith('http')) {
      personBase64 = await urlToBase64(personImage);
    }
    
    // Prepare person image (resize/compress)
    personBase64 = await prepareImage(personBase64);

    const clothingParts = await Promise.all(clothingItems.map(async (item) => {
      let base64 = item.base64;
      if (base64.startsWith('http')) {
        base64 = await urlToBase64(base64);
      }
      
      // Prepare clothing image
      const preparedBase64 = await prepareImage(base64);
      
      return {
        inlineData: {
          data: preparedBase64.split(",")[1],
          mimeType: "image/jpeg",
        },
      };
    }));

    const clothingDescriptions = clothingItems.map((item, index) => `the ${item.type} from image ${index + 2}`).join(", ");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
            inlineData: {
              data: personBase64.split(",")[1],
              mimeType: "image/jpeg",
            },
          },
          ...clothingParts,
          {
            text: `This is a photo of a person (image 1) and photos of clothing items (${clothingItems.map((item, i) => `${item.type} in image ${i + 2}`).join(", ")}). Please generate a new image where the person is wearing ${clothingDescriptions}. Maintain the person's pose, face, and the background exactly as they are in the first image. The clothing items should be naturally fitted to the person.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/jpeg;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error in tryOnClothing:", error);
    throw error; // Throw so UI can handle it if needed, or at least we see it in logs
  }
}
