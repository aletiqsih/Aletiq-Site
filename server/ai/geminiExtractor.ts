import { GoogleGenAI, Type } from '@google/genai';
import { ExtractedDeclarations, ExtractedFieldItem, InspectionImage } from '../../src/types';

export function getGeminiApiKey(): string | null {
  const rawKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY;
  if (!rawKey) return null;
  const key = rawKey.trim();
  if (
    key === '' ||
    key === 'MY_GEMINI_API_KEY' ||
    key.toLowerCase() === 'undefined' ||
    key.toLowerCase() === 'null'
  ) {
    return null;
  }
  return key;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
  });
}

export async function extractPackageDeclarationsWithGemini(
  images: InspectionImage[]
): Promise<ExtractedDeclarations> {
  if (!images || images.length === 0) {
    throw new Error('No package images provided for compliance analysis.');
  }

  const ai = getGeminiClient();
  if (!ai) {
    throw new Error(
      'Gemini AI extraction is unauthenticated. Please configure a valid GEMINI_API_KEY or GOOGLE_API_KEY in your server environment variables.'
    );
  }

  const parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = [];

  // Add image parts
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    let base64Data = '';
    let mimeType = img.mimeType || 'image/jpeg';

    if (img.url && img.url.startsWith('data:')) {
      const matches = img.url.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64Data = matches[2];
      }
    } else if (img.url && (img.url.startsWith('http://') || img.url.startsWith('https://'))) {
      try {
        const res = await fetch(img.url);
        const arrayBuffer = await res.arrayBuffer();
        base64Data = Buffer.from(arrayBuffer).toString('base64');
        mimeType = res.headers.get('content-type') || mimeType;
      } catch (err: any) {
        console.error(`Failed to fetch image from URL: ${img.url}`, err);
      }
    }

    if (base64Data) {
      parts.push({
        inlineData: {
          mimeType,
          data: base64Data,
        },
      });
      parts.push({
        text: `[Image ${i + 1} - ID: "${img.id}", Side: "${img.side}"]`,
      });
    }
  }

  if (parts.length === 0) {
    throw new Error('Could not parse any image data from the provided package images.');
  }

  const systemPrompt = `You are a specialized Legal Metrology OCR and text extraction system for Indian packaged commodities.
Your task is to READ AND EXTRACT ONLY visible statutory declarations from the provided package images.
CRITICAL RULES:
1. NEVER invent, hallucinate, or guess text. If a declaration is not clearly visible in any submitted image, return null for value and 0 for confidence.
2. Accurately transcribe exact wording, addresses, pincodes, dates, prices (MRP), quantities, and phone numbers.
3. For each field, specify the sourceImageId (e.g. image ID from the caption) and sourceSide (front, back, left, right, top, bottom, other).
4. Extract exact visible text snippets as evidenceText.
5. If text is blurry or smudged, add it to unreadable_declarations list.
6. Identify product category (e.g., Food / Edible Oil / Cosmetic / Detergent / Electronics / General Merchandise / Unknown).
7. Do not make legal decisions or compliance judgments; only extract factual data.`;

  parts.push({
    text: `Please analyze the ${images.length} package image(s) and extract all visible statutory declarations according to Legal Metrology standards into the requested JSON schema.`,
  });

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      product_name: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          sourceImageId: { type: Type.STRING },
          sourceSide: { type: Type.STRING },
          evidenceText: { type: Type.STRING },
        },
      },
      brand: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          sourceImageId: { type: Type.STRING },
          sourceSide: { type: Type.STRING },
          evidenceText: { type: Type.STRING },
        },
      },
      product_category: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          sourceImageId: { type: Type.STRING },
          sourceSide: { type: Type.STRING },
        },
      },
      generic_or_common_name: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          sourceImageId: { type: Type.STRING },
          sourceSide: { type: Type.STRING },
          evidenceText: { type: Type.STRING },
        },
      },
      manufacturer_name: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          sourceImageId: { type: Type.STRING },
          sourceSide: { type: Type.STRING },
          evidenceText: { type: Type.STRING },
        },
      },
      manufacturer_address: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          sourceImageId: { type: Type.STRING },
          sourceSide: { type: Type.STRING },
          evidenceText: { type: Type.STRING },
        },
      },
      packer_name: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          sourceImageId: { type: Type.STRING },
          sourceSide: { type: Type.STRING },
          evidenceText: { type: Type.STRING },
        },
      },
      packer_address: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          sourceImageId: { type: Type.STRING },
          sourceSide: { type: Type.STRING },
          evidenceText: { type: Type.STRING },
        },
      },
      importer_name: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          sourceImageId: { type: Type.STRING },
          sourceSide: { type: Type.STRING },
          evidenceText: { type: Type.STRING },
        },
      },
      importer_address: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          sourceImageId: { type: Type.STRING },
          sourceSide: { type: Type.STRING },
          evidenceText: { type: Type.STRING },
        },
      },
      net_quantity: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          sourceImageId: { type: Type.STRING },
          sourceSide: { type: Type.STRING },
          evidenceText: { type: Type.STRING },
        },
      },
      quantity_value: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.NUMBER },
          confidence: { type: Type.NUMBER },
        },
      },
      quantity_unit: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
        },
      },
      unit_sale_price: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          sourceImageId: { type: Type.STRING },
          sourceSide: { type: Type.STRING },
          evidenceText: { type: Type.STRING },
        },
      },
      mrp: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          sourceImageId: { type: Type.STRING },
          sourceSide: { type: Type.STRING },
          evidenceText: { type: Type.STRING },
        },
      },
      currency: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
        },
      },
      manufacturing_date: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          sourceImageId: { type: Type.STRING },
          sourceSide: { type: Type.STRING },
          evidenceText: { type: Type.STRING },
        },
      },
      packing_date: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          sourceImageId: { type: Type.STRING },
          sourceSide: { type: Type.STRING },
          evidenceText: { type: Type.STRING },
        },
      },
      import_date: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          sourceImageId: { type: Type.STRING },
          sourceSide: { type: Type.STRING },
          evidenceText: { type: Type.STRING },
        },
      },
      expiry_date: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          sourceImageId: { type: Type.STRING },
          sourceSide: { type: Type.STRING },
          evidenceText: { type: Type.STRING },
        },
      },
      best_before: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          sourceImageId: { type: Type.STRING },
          sourceSide: { type: Type.STRING },
          evidenceText: { type: Type.STRING },
        },
      },
      consumer_care_name: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          sourceImageId: { type: Type.STRING },
          sourceSide: { type: Type.STRING },
          evidenceText: { type: Type.STRING },
        },
      },
      consumer_care_address: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          sourceImageId: { type: Type.STRING },
          sourceSide: { type: Type.STRING },
          evidenceText: { type: Type.STRING },
        },
      },
      consumer_care_phone: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          sourceImageId: { type: Type.STRING },
          sourceSide: { type: Type.STRING },
          evidenceText: { type: Type.STRING },
        },
      },
      consumer_care_email: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          sourceImageId: { type: Type.STRING },
          sourceSide: { type: Type.STRING },
          evidenceText: { type: Type.STRING },
        },
      },
      country_of_origin: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          sourceImageId: { type: Type.STRING },
          sourceSide: { type: Type.STRING },
          evidenceText: { type: Type.STRING },
        },
      },
      is_imported: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.BOOLEAN },
          confidence: { type: Type.NUMBER },
        },
      },
      visible_declarations: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      unreadable_declarations: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      possible_missing_declarations: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      overall_extraction_confidence: { type: Type.NUMBER },
    },
  };

  const candidateModels = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'];
  let response: any = null;
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      response = await ai.models.generateContent({
        model,
        contents: {
          parts: parts as any,
        },
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: responseSchema as any,
        },
      });
      if (response && response.text) {
        break;
      }
    } catch (modelErr: any) {
      lastError = modelErr;
      console.warn(`Gemini extraction attempt with model "${model}" failed:`, modelErr.message || modelErr);
    }
  }

  if (!response || !response.text) {
    throw new Error(
      `Gemini extraction failed across candidate models: ${lastError?.message || 'No response returned from Gemini API'}`
    );
  }

  const rawText = response.text?.trim() || '{}';

  try {
    const parsed = JSON.parse(rawText);
    return normalizeParsedDeclarations(parsed, images);
  } catch (error) {
    console.error('Invalid Gemini JSON output:', rawText);
    throw new Error(`Gemini returned invalid JSON structure: ${rawText.slice(0, 200)}`);
  }
}

function normalizeField<T>(
  raw: any,
  defaultSide: any,
  defaultImageId: string,
  fallbackVal: T = null as any
): ExtractedFieldItem<T> {
  if (!raw || raw.value === undefined || raw.value === null || raw.value === '') {
    return {
      value: fallbackVal,
      confidence: 0,
      sourceImageId: '',
      sourceSide: 'other',
      status: 'not_found',
    };
  }
  return {
    value: raw.value as T,
    confidence: typeof raw.confidence === 'number' ? raw.confidence : 0.85,
    sourceImageId: raw.sourceImageId || defaultImageId,
    sourceSide: raw.sourceSide || defaultSide,
    evidenceText: raw.evidenceText || (typeof raw.value === 'string' ? raw.value : undefined),
    status: 'found',
  };
}

function normalizeParsedDeclarations(parsed: any, images: InspectionImage[]): ExtractedDeclarations {
  const defaultImage = images[0] || { id: 'img_1', side: 'front' };

  return {
    product_name: normalizeField<string>(parsed.product_name, defaultImage.side, defaultImage.id),
    brand: normalizeField<string>(parsed.brand, defaultImage.side, defaultImage.id),
    product_category: normalizeField<string>(parsed.product_category, defaultImage.side, defaultImage.id, 'General Packaged Commodity'),
    generic_or_common_name: normalizeField<string>(parsed.generic_or_common_name, defaultImage.side, defaultImage.id),
    
    manufacturer_name: normalizeField<string>(parsed.manufacturer_name, 'back', defaultImage.id),
    manufacturer_address: normalizeField<string>(parsed.manufacturer_address, 'back', defaultImage.id),
    packer_name: normalizeField<string>(parsed.packer_name, 'back', defaultImage.id),
    packer_address: normalizeField<string>(parsed.packer_address, 'back', defaultImage.id),
    importer_name: normalizeField<string>(parsed.importer_name, 'back', defaultImage.id),
    importer_address: normalizeField<string>(parsed.importer_address, 'back', defaultImage.id),
    
    net_quantity: normalizeField<string>(parsed.net_quantity, 'front', defaultImage.id),
    quantity_value: normalizeField<number | null>(parsed.quantity_value, 'front', defaultImage.id, null),
    quantity_unit: normalizeField<string>(parsed.quantity_unit, 'front', defaultImage.id, 'g'),
    unit_sale_price: normalizeField<string>(parsed.unit_sale_price, 'back', defaultImage.id),
    
    mrp: normalizeField<string>(parsed.mrp, 'back', defaultImage.id),
    currency: normalizeField<string>(parsed.currency, 'back', defaultImage.id, 'INR'),
    
    manufacturing_date: normalizeField<string>(parsed.manufacturing_date, 'back', defaultImage.id),
    packing_date: normalizeField<string>(parsed.packing_date, 'back', defaultImage.id),
    import_date: normalizeField<string>(parsed.import_date, 'back', defaultImage.id),
    expiry_date: normalizeField<string>(parsed.expiry_date, 'back', defaultImage.id),
    best_before: normalizeField<string>(parsed.best_before, 'back', defaultImage.id),
    
    consumer_care_name: normalizeField<string>(parsed.consumer_care_name, 'back', defaultImage.id),
    consumer_care_address: normalizeField<string>(parsed.consumer_care_address, 'back', defaultImage.id),
    consumer_care_phone: normalizeField<string>(parsed.consumer_care_phone, 'back', defaultImage.id),
    consumer_care_email: normalizeField<string>(parsed.consumer_care_email, 'back', defaultImage.id),
    
    country_of_origin: normalizeField<string>(parsed.country_of_origin, 'back', defaultImage.id),
    is_imported: normalizeField<boolean>(parsed.is_imported, 'back', defaultImage.id, false),
    
    visible_declarations: Array.isArray(parsed.visible_declarations) ? parsed.visible_declarations : [],
    unreadable_declarations: Array.isArray(parsed.unreadable_declarations) ? parsed.unreadable_declarations : [],
    possible_missing_declarations: Array.isArray(parsed.possible_missing_declarations) ? parsed.possible_missing_declarations : [],
    overall_extraction_confidence: typeof parsed.overall_extraction_confidence === 'number' ? parsed.overall_extraction_confidence : 0.88,
  };
}
