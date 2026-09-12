import { GoogleGenAI, Type } from '@google/genai';
import {
  ExtractedDeclarations,
  ExtractedFieldItem,
  DigitalListing,
  UrlExtractionTier,
  ComplianceResult,
  ComparisonResult,
  ProductUrlAnalysisResponse,
} from '../../src/types';
import { evaluateLegalMetrologyCompliance } from '../engine/ruleEngine';
import { comparePackageWithDigitalListing } from './comparisonService';
import { inspectionRepository } from '../db/inspectionRepository';

/**
 * SSRF Safeguard: Check if a given URL is safe to fetch.
 * Disallows localhost, private IP ranges, link-local addresses, unless it's a designated mock demo URL.
 */
export function validateUrlSafety(inputUrl: string): { safe: boolean; error?: string; parsed?: URL; isMockDemo?: boolean } {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { safe: false, error: 'URL must be a non-empty string' };
  }

  const trimmed = inputUrl.trim();

  // Check if it's our internal mock/demo URL pattern
  if (
    trimmed.startsWith('https://demo.aletiq.gov.in') ||
    trimmed.startsWith('https://demo-ecommerce.aletiq.internal') ||
    trimmed.startsWith('https://instamart.example.com') ||
    trimmed.startsWith('https://example.com/product/sample-product') ||
    trimmed.startsWith('aletiq-mock://')
  ) {
    try {
      const parsed = new URL(trimmed.startsWith('aletiq-mock://') ? 'https://demo.aletiq.gov.in/sample' : trimmed);
      return { safe: true, isMockDemo: true, parsed };
    } catch {
      return { safe: true, isMockDemo: true };
    }
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch (err: any) {
    return { safe: false, error: `Invalid URL format: ${err.message}` };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, error: 'Only HTTP and HTTPS URLs are supported' };
  }

  const host = parsed.hostname.toLowerCase();

  // Block loopback & localhost
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local')
  ) {
    return { safe: false, error: 'Access to localhost and internal network resources is restricted' };
  }

  // Block AWS / GCP / Azure metadata endpoint
  if (host === '169.254.169.254' || host === 'metadata.google.internal') {
    return { safe: false, error: 'Access to cloud instance metadata service is restricted' };
  }

  // Block private IP ranges (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, o1, o2] = ipv4Match.map(Number);
    if (
      o1 === 10 ||
      (o1 === 172 && o2 >= 16 && o2 <= 31) ||
      (o1 === 192 && o2 === 168) ||
      (o1 === 169 && o2 === 254) ||
      o1 === 127 ||
      o1 === 0
    ) {
      return { safe: false, error: 'Access to private IPv4 network ranges is restricted' };
    }
  }

  return { safe: true, parsed };
}

/**
 * Returns controlled authentic mock product HTML for demonstration testing
 */
export function getSampleMockProductHtml(url: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GoldenBake Cashew Butter Cookies (500g Jumbo Pack) - QuickMart</title>
  <meta name="description" content="Buy GoldenBake Cashew Butter Cookies 500g Jumbo Value Pack online at best price. Freshly baked with pure butter and premium cashews.">
  <meta property="og:title" content="GoldenBake Cashew Butter Cookies 500g Value Pack">
  <meta property="og:description" content="Delicious Cashew Butter Cookies packaged in 500 g pack. Premium Indian Bakery Product.">
  <meta property="og:site_name" content="QuickMart Grocery">
  <meta property="og:image" content="https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&auto=format&fit=crop&q=80">
  <meta property="product:price:amount" content="120.00">
  <meta property="product:price:currency" content="INR">
  <meta property="product:brand" content="GoldenBake Foods">

  <script type="application/ld+json">
  {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": "GoldenBake Cashew Butter Cookies 500g Jumbo Value Pack",
    "image": "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&auto=format&fit=crop&q=80",
    "description": "Rich and crunchy Cashew Butter Cookies made with rich cashew nut paste and dairy butter. Net quantity 500 g.",
    "brand": {
      "@type": "Brand",
      "name": "GoldenBake Foods"
    },
    "sku": "GB-CK-500",
    "category": "Bakery & Confectionery",
    "offers": {
      "@type": "Offer",
      "priceCurrency": "INR",
      "price": "120.00",
      "availability": "https://schema.org/InStock",
      "seller": {
        "@type": "Organization",
        "name": "QuickMart Retail Logistics India Ltd."
      }
    },
    "manufacturer": {
      "@type": "Organization",
      "name": "GoldenBake Confectioneries Pvt. Ltd.",
      "address": "Plot 18, Phase II, Peenya Industrial Area, Bengaluru, Karnataka - 560058"
    },
    "countryOfOrigin": "India"
  }
  </script>
</head>
<body>
  <div class="product-container">
    <h1 class="product-title">GoldenBake Cashew Butter Cookies 500g Jumbo Value Pack</h1>
    <div class="brand">Brand: <span>GoldenBake Foods</span></div>
    <div class="price-container">
      <span class="mrp">MRP: ₹ 120.00 (inclusive of all taxes)</span>
      <span class="selling-price">Offer Price: ₹ 110.00</span>
    </div>

    <div class="specifications">
      <h2>Mandatory Product Declarations (Legal Metrology)</h2>
      <table class="specs-table">
        <tr><th>Commodity Name</th><td>Cashew Butter Cookies (Bakery Item)</td></tr>
        <tr><th>Brand</th><td>GoldenBake Foods</td></tr>
        <tr><th>Net Quantity</th><td>500 g</td></tr>
        <tr><th>MRP</th><td>₹ 120.00 (inclusive of all taxes)</td></tr>
        <tr><th>Manufacturer / Packer</th><td>GoldenBake Confectioneries Pvt. Ltd., Plot 18, Phase II, Peenya Industrial Area, Bengaluru, Karnataka - 560058</td></tr>
        <tr><th>Country of Origin</th><td>India</td></tr>
        <tr><th>Month & Year of Manufacture</th><td>04/2026</td></tr>
        <tr><th>Best Before / Expiry</th><td>Best Before 6 Months from Packaging (Exp: 10/2026)</td></tr>
        <tr><th>Consumer Care Helpline</th><td>Toll Free: 1800-425-9988, Email: support@goldenbake.co.in</td></tr>
        <tr><th>FSSAI License No.</th><td>10019043002871</td></tr>
      </table>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Fetch webpage content safely with timeouts, redirects, and size caps.
 */
export async function fetchWebpage(targetUrl: string): Promise<{ html: string; status: number; finalUrl: string }> {
  const safety = validateUrlSafety(targetUrl);
  if (!safety.safe) {
    throw new Error(safety.error || 'URL validation rejected');
  }

  if (safety.isMockDemo) {
    return {
      html: getSampleMockProductHtml(targetUrl),
      status: 200,
      finalUrl: targetUrl,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000); // 9 sec timeout

  try {
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
    });

    clearTimeout(timeoutId);

    if (res.status === 403 || res.status === 401 || res.status === 429) {
      throw new Error(`Website blocked automated inspection request (HTTP status ${res.status}). Anti-bot or Cloudflare protection active.`);
    }

    if (res.status === 404) {
      throw new Error('Product webpage not found (HTTP 404). Please verify the product URL.');
    }

    if (!res.ok) {
      throw new Error(`Failed to load webpage: HTTP status ${res.status} (${res.statusText})`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      if (contentType.includes('image/') || contentType.includes('application/pdf')) {
        throw new Error('Target URL points to an image/document file, not an HTML product webpage.');
      }
    }

    const html = await res.text();
    const truncatedHtml = html.length > 2000000 ? html.slice(0, 2000000) : html;

    return {
      html: truncatedHtml,
      status: res.status,
      finalUrl: res.url || targetUrl,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out after 9 seconds. The e-commerce website was slow or unresponsive.');
    }
    throw err;
  }
}

/**
 * Raw extracted fields interface before conversion to ExtractedDeclarations
 */
export interface RawProductData {
  productName?: string;
  brand?: string;
  genericName?: string;
  category?: string;
  description?: string;
  mrp?: string;
  sellingPrice?: string;
  currency?: string;
  netQuantity?: string;
  quantityValue?: number | null;
  quantityUnit?: string;
  unitSalePrice?: string;
  manufacturerName?: string;
  manufacturerAddress?: string;
  packerName?: string;
  packerAddress?: string;
  importerName?: string;
  importerAddress?: string;
  countryOfOrigin?: string;
  manufacturingDate?: string;
  packingDate?: string;
  expiryDate?: string;
  bestBefore?: string;
  consumerCareName?: string;
  consumerCareAddress?: string;
  consumerCarePhone?: string;
  consumerCareEmail?: string;
  imageUrl?: string;
  sku?: string;
  fssaiNumber?: string;
  ingredients?: string;
  platform?: string;
  sourceUrl?: string;
  extractionTier: UrlExtractionTier;
  confidence: number;
  warnings: string[];
}

/**
 * Tier 1: Extract schema.org JSON-LD from HTML
 */
export function extractFromJsonLd(html: string): Partial<RawProductData> | null {
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const rawText = match[1].trim();
      if (!rawText) continue;
      const parsed = JSON.parse(rawText);

      const items = Array.isArray(parsed) ? parsed : parsed['@graph'] ? parsed['@graph'] : [parsed];

      for (const item of items) {
        const type = item['@type'];
        const isProduct =
          type === 'Product' ||
          (Array.isArray(type) && type.includes('Product')) ||
          (typeof type === 'string' && type.toLowerCase().includes('product'));

        if (isProduct) {
          const result: Partial<RawProductData> = {
            extractionTier: 'JSON_LD',
            confidence: 0.95,
            warnings: [],
          };

          if (item.name) result.productName = String(item.name).trim();
          if (item.description) result.description = String(item.description).trim();
          if (item.category) result.category = String(item.category).trim();
          if (item.sku) result.sku = String(item.sku).trim();

          // Brand
          if (typeof item.brand === 'string') {
            result.brand = item.brand.trim();
          } else if (item.brand && typeof item.brand === 'object' && item.brand.name) {
            result.brand = String(item.brand.name).trim();
          }

          // Image
          if (typeof item.image === 'string') {
            result.imageUrl = item.image;
          } else if (Array.isArray(item.image) && item.image[0]) {
            result.imageUrl = typeof item.image[0] === 'string' ? item.image[0] : item.image[0].url;
          } else if (item.image && typeof item.image === 'object' && item.image.url) {
            result.imageUrl = String(item.image.url);
          }

          // Offers / Price
          const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
          if (offers) {
            if (offers.price) {
              const p = String(offers.price).trim();
              result.mrp = p;
              result.sellingPrice = p;
            }
            if (offers.priceCurrency) {
              result.currency = String(offers.priceCurrency).trim();
            }
            if (offers.seller) {
              if (typeof offers.seller === 'string') {
                result.packerName = offers.seller.trim();
              } else if (offers.seller.name) {
                result.packerName = String(offers.seller.name).trim();
              }
            }
          }

          // Manufacturer
          if (typeof item.manufacturer === 'string') {
            result.manufacturerName = item.manufacturer.trim();
          } else if (item.manufacturer && typeof item.manufacturer === 'object') {
            if (item.manufacturer.name) result.manufacturerName = String(item.manufacturer.name).trim();
            if (item.manufacturer.address) {
              result.manufacturerAddress =
                typeof item.manufacturer.address === 'string'
                  ? item.manufacturer.address.trim()
                  : [
                      item.manufacturer.address.streetAddress,
                      item.manufacturer.address.addressLocality,
                      item.manufacturer.address.addressRegion,
                      item.manufacturer.address.postalCode,
                      item.manufacturer.address.addressCountry,
                    ]
                      .filter(Boolean)
                      .join(', ');
            }
          }

          // Country of Origin
          if (item.countryOfOrigin) {
            result.countryOfOrigin =
              typeof item.countryOfOrigin === 'string'
                ? item.countryOfOrigin.trim()
                : item.countryOfOrigin.name || String(item.countryOfOrigin);
          }

          // Weight / Net Quantity
          if (item.weight || item.netWeight) {
            const w = item.weight || item.netWeight;
            result.netQuantity = typeof w === 'string' ? w.trim() : `${w.value || ''} ${w.unitCode || w.unitText || ''}`.trim();
          }

          if (result.productName) {
            return result;
          }
        }
      }
    } catch {
      // Continue to next script tag
    }
  }

  return null;
}

/**
 * Tier 2: Extract OpenGraph and standard HTML Meta tags
 */
export function extractFromOpenGraph(html: string): Partial<RawProductData> {
  const result: Partial<RawProductData> = {
    extractionTier: 'OPEN_GRAPH',
    confidence: 0.85,
    warnings: [],
  };

  const getMeta = (prop: string): string | undefined => {
    const r1 = new RegExp(`<meta[^>]*property=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i');
    const m1 = r1.exec(html);
    if (m1 && m1[1]) return m1[1].trim();

    const r2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${prop}["']`, 'i');
    const m2 = r2.exec(html);
    if (m2 && m2[1]) return m2[1].trim();

    const r3 = new RegExp(`<meta[^>]*name=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i');
    const m3 = r3.exec(html);
    if (m3 && m3[1]) return m3[1].trim();

    return undefined;
  };

  const ogTitle = getMeta('og:title') || getMeta('twitter:title');
  if (ogTitle) result.productName = ogTitle;

  const ogDesc = getMeta('og:description') || getMeta('twitter:description') || getMeta('description');
  if (ogDesc) result.description = ogDesc;

  const ogImage = getMeta('og:image') || getMeta('twitter:image');
  if (ogImage) result.imageUrl = ogImage;

  const ogSite = getMeta('og:site_name');
  if (ogSite) result.platform = ogSite;

  const ogPrice = getMeta('product:price:amount') || getMeta('og:price:amount');
  if (ogPrice) result.mrp = ogPrice;

  const ogCurr = getMeta('product:price:currency') || getMeta('og:price:currency');
  if (ogCurr) result.currency = ogCurr;

  const ogBrand = getMeta('product:brand');
  if (ogBrand) result.brand = ogBrand;

  return result;
}

/**
 * Tier 3: Extract structured specifications from HTML DOM & Regex patterns
 */
export function extractFromHtmlDOM(html: string): Partial<RawProductData> {
  const result: Partial<RawProductData> = {
    extractionTier: 'HTML_DOM',
    confidence: 0.75,
    warnings: [],
  };

  // 1. Page Title if missing
  const titleMatch = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  if (titleMatch && titleMatch[1]) {
    const rawTitle = titleMatch[1].trim();
    const cleanedTitle = rawTitle.replace(/\s*([|–—\-])\s*(Amazon|Flipkart|Blinkit|Zepto|BigBasket|JioMart|Myntra|Nykaa).*$/i, '').trim();
    result.productName = cleanedTitle || rawTitle;
  }

  // 2. Headings (h1)
  const h1Match = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (h1Match && h1Match[1]) {
    const h1Clean = h1Match[1].replace(/<[^>]+>/g, '').trim();
    if (h1Clean && h1Clean.length > 3 && h1Clean.length < 200) {
      result.productName = h1Clean;
    }
  }

  // 3. Price / MRP Regex Search
  const mrpRegex = /(?:MRP|M\.R\.P\.|Maximum\s*Retail\s*Price)[\s:]*(?:Rs\.?|₹|INR)?\s*([0-9,.]+)/i;
  const mrpMatch = mrpRegex.exec(html);
  if (mrpMatch && mrpMatch[1]) {
    result.mrp = mrpMatch[1].replace(/,/g, '').trim();
  }

  // 4. Net Quantity Regex Search (e.g. 500 g, 1 kg, 750 ml, 100 ml, 250 gms)
  const qtyRegex = /(?:Net\s*Quantity|Net\s*Qty|Net\s*Weight|Net\s*Content|Weight)[\s:><\/a-z0-9"=_]*?([0-9]+(?:\.[0-9]+)?\s*(?:g|kg|gm|gms|gram|grams|ml|l|liter|litres|piece|pieces|N|U|units))\b/i;
  const qtyMatch = qtyRegex.exec(html);
  if (qtyMatch && qtyMatch[1]) {
    result.netQuantity = qtyMatch[1].trim();
  }

  // 5. Country of Origin
  const cooRegex = /(?:Country\s*of\s*Origin|Made\s*in)[\s:><\/a-z0-9"=_]*?([A-Za-z\s]{3,20})(?:<|\n|\t|&|,|\.|\/)/i;
  const cooMatch = cooRegex.exec(html);
  if (cooMatch && cooMatch[1]) {
    const coo = cooMatch[1].trim();
    if (!/^(the|and|or|of|in|for|with)$/i.test(coo)) {
      result.countryOfOrigin = coo;
    }
  }

  // 6. Manufacturer / Packer Details from Table Rows or Definition Lists
  const mfgRegex = /(?:Manufactured\s*by|Manufacturer|Marketed\s*by|Packer)[\s:><\/a-z0-9"=_]*?([^<\n\r]{5,150})(?:<|\n)/i;
  const mfgMatch = mfgRegex.exec(html);
  if (mfgMatch && mfgMatch[1]) {
    const cleanMfg = mfgMatch[1].replace(/&amp;/g, '&').replace(/<[^>]+>/g, '').trim();
    if (cleanMfg.length > 5) {
      result.manufacturerName = cleanMfg;
    }
  }

  // 7. Consumer Care Phone / Email
  const emailMatch = /(?:care|support|help|grievance)@[a-z0-9.-]+\.[a-z]{2,}/i.exec(html);
  if (emailMatch) {
    result.consumerCareEmail = emailMatch[0];
  }

  const phoneMatch = /(?:1800[-\s]?[0-9]{3}[-\s]?[0-9]{3,4}|[0-9]{3,4}[-\s]?[0-9]{7,8})/i.exec(html);
  if (phoneMatch) {
    result.consumerCarePhone = phoneMatch[0];
  }

  // 8. FSSAI License Number
  const fssaiMatch = /(?:FSSAI|Lic\.?\s*No\.?)[\s:]*([0-9]{14})/i.exec(html);
  if (fssaiMatch && fssaiMatch[1]) {
    result.fssaiNumber = fssaiMatch[1];
  }

  return result;
}

/**
 * Tier 4: Gemini AI-assisted extraction from cleaned webpage text
 */
export async function extractWithGemini(cleanText: string): Promise<Partial<RawProductData> | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || !cleanText || cleanText.length < 20) {
    return null;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });

    const prompt = `You are a Legal Metrology Compliance Parser for Indian E-Commerce listings.
Read the extracted webpage text below and identify all available product declarations.
CRITICAL RULES:
1. Return strict JSON matching the schema.
2. DO NOT hallucinate or guess any missing declarations. If a declaration is not explicitly mentioned in the text, return null.
3. Extract exact numerical prices, units, and manufacturer names without fabrication.

Webpage Text:
"""
${cleanText.slice(0, 6000)}
"""`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            productName: { type: Type.STRING },
            brand: { type: Type.STRING },
            genericName: { type: Type.STRING },
            category: { type: Type.STRING },
            mrp: { type: Type.STRING },
            sellingPrice: { type: Type.STRING },
            netQuantity: { type: Type.STRING },
            manufacturerName: { type: Type.STRING },
            manufacturerAddress: { type: Type.STRING },
            packerName: { type: Type.STRING },
            countryOfOrigin: { type: Type.STRING },
            manufacturingDate: { type: Type.STRING },
            expiryDate: { type: Type.STRING },
            consumerCarePhone: { type: Type.STRING },
            consumerCareEmail: { type: Type.STRING },
            description: { type: Type.STRING },
            ingredients: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
          },
        },
      },
    });

    if (response && response.text) {
      const data = JSON.parse(response.text);
      return {
        ...data,
        extractionTier: 'AI_ASSISTED',
        confidence: data.confidence || 0.9,
      };
    }
  } catch (err) {
    console.error('Gemini AI e-commerce extraction fallback error:', err);
  }

  return null;
}

/**
 * Clean HTML into plain text for AI processing
 */
function cleanHtmlToText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Main Extraction Pipeline:
 * JSON-LD -> OpenGraph -> HTML DOM -> Gemini AI Fallback -> Merge
 */
export async function extractProductFromUrl(
  url: string,
  providedHtml?: string
): Promise<{ raw: RawProductData; listing: DigitalListing; declarations: ExtractedDeclarations }> {
  let html = providedHtml;
  let finalUrl = url;

  if (!html) {
    const fetchRes = await fetchWebpage(url);
    html = fetchRes.html;
    finalUrl = fetchRes.finalUrl;
  }

  // 1. JSON-LD
  const jsonLdData = extractFromJsonLd(html);

  // 2. OpenGraph
  const ogData = extractFromOpenGraph(html);

  // 3. HTML DOM Heuristics
  const domData = extractFromHtmlDOM(html);

  // 4. Merge initial structured data (Tier hierarchy: JSON-LD > OG > DOM)
  const merged: RawProductData = {
    extractionTier: jsonLdData?.extractionTier || ogData?.extractionTier || domData?.extractionTier || 'HTML_DOM',
    confidence: jsonLdData?.confidence || (ogData?.productName ? 0.85 : 0.7),
    warnings: [],
    sourceUrl: finalUrl,
    productName: jsonLdData?.productName || ogData?.productName || domData?.productName || 'E-Commerce Product Listing',
    brand: jsonLdData?.brand || ogData?.brand || domData?.brand,
    genericName: domData?.genericName || jsonLdData?.genericName,
    category: jsonLdData?.category || domData?.category || 'General Packaged Commodity',
    description: jsonLdData?.description || ogData?.description || domData?.description,
    mrp: jsonLdData?.mrp || ogData?.mrp || domData?.mrp,
    sellingPrice: jsonLdData?.sellingPrice || domData?.sellingPrice,
    currency: jsonLdData?.currency || ogData?.currency || 'INR',
    netQuantity: jsonLdData?.netQuantity || domData?.netQuantity,
    manufacturerName: jsonLdData?.manufacturerName || domData?.manufacturerName,
    manufacturerAddress: jsonLdData?.manufacturerAddress || domData?.manufacturerAddress,
    packerName: jsonLdData?.packerName || domData?.packerName,
    packerAddress: jsonLdData?.packerAddress || domData?.packerAddress,
    importerName: jsonLdData?.importerName || domData?.importerName,
    importerAddress: jsonLdData?.importerAddress || domData?.importerAddress,
    countryOfOrigin: jsonLdData?.countryOfOrigin || domData?.countryOfOrigin,
    manufacturingDate: domData?.manufacturingDate,
    expiryDate: domData?.expiryDate,
    bestBefore: domData?.bestBefore,
    consumerCarePhone: domData?.consumerCarePhone,
    consumerCareEmail: domData?.consumerCareEmail,
    consumerCareAddress: domData?.consumerCareAddress,
    fssaiNumber: domData?.fssaiNumber,
    imageUrl: jsonLdData?.imageUrl || ogData?.imageUrl,
    platform: ogData?.platform || determinePlatformFromUrl(finalUrl),
  };

  // 5. If crucial declarations are missing and we have Gemini configured, try AI fallback
  const missingCoreDeclarations = !merged.manufacturerName || !merged.netQuantity || !merged.mrp;
  if (missingCoreDeclarations && !jsonLdData) {
    const cleanText = cleanHtmlToText(html);
    const aiData = await extractWithGemini(cleanText);
    if (aiData) {
      if (aiData.productName && (!merged.productName || merged.productName === 'E-Commerce Product Listing')) {
        merged.productName = aiData.productName;
      }
      if (aiData.brand && !merged.brand) merged.brand = aiData.brand;
      if (aiData.netQuantity && !merged.netQuantity) merged.netQuantity = aiData.netQuantity;
      if (aiData.mrp && !merged.mrp) merged.mrp = aiData.mrp;
      if (aiData.manufacturerName && !merged.manufacturerName) merged.manufacturerName = aiData.manufacturerName;
      if (aiData.manufacturerAddress && !merged.manufacturerAddress) merged.manufacturerAddress = aiData.manufacturerAddress;
      if (aiData.countryOfOrigin && !merged.countryOfOrigin) merged.countryOfOrigin = aiData.countryOfOrigin;
      if (aiData.consumerCarePhone && !merged.consumerCarePhone) merged.consumerCarePhone = aiData.consumerCarePhone;
      if (aiData.consumerCareEmail && !merged.consumerCareEmail) merged.consumerCareEmail = aiData.consumerCareEmail;
      merged.extractionTier = 'AI_ASSISTED';
      merged.confidence = 0.9;
    }
  }

  // Parse net quantity value and unit if possible
  if (merged.netQuantity) {
    const qNumMatch = merged.netQuantity.match(/([0-9]+(?:\.[0-9]+)?)/);
    const qUnitMatch = merged.netQuantity.match(/(g|kg|gm|gms|gram|grams|ml|l|liter|litres|piece|pieces|N|U|units)/i);
    if (qNumMatch) merged.quantityValue = parseFloat(qNumMatch[1]);
    if (qUnitMatch) merged.quantityUnit = qUnitMatch[1].toLowerCase();
  }

  // Format MRP with standard currency prefix if missing
  if (merged.mrp && !merged.mrp.includes('₹') && !merged.mrp.includes('Rs')) {
    merged.mrp = `₹ ${merged.mrp}`;
  }

  // Convert to standard DigitalListing
  const listing: DigitalListing = {
    url: finalUrl,
    platform: merged.platform || 'Online Marketplace',
    title: merged.productName || 'E-Commerce Product',
    brand: merged.brand || '',
    netQuantity: merged.netQuantity || '',
    mrp: merged.mrp ? merged.mrp.replace(/[^0-9.]/g, '') : '',
    manufacturerDetails: [merged.manufacturerName, merged.manufacturerAddress].filter(Boolean).join(', '),
    sellerDetails: merged.packerName || '',
    countryOfOrigin: merged.countryOfOrigin || '',
    rawDescription: merged.description || '',
    listingImageUrl: merged.imageUrl || '',
  };

  // Convert to standard ExtractedDeclarations for the LabelGuard rule engine
  const declarations = convertToExtractedDeclarations(merged, finalUrl);

  return {
    raw: merged,
    listing,
    declarations,
  };
}

/**
 * Derive platform name from hostname
 */
function determinePlatformFromUrl(urlStr: string): string {
  try {
    const host = new URL(urlStr).hostname.toLowerCase();
    if (host.includes('amazon')) return 'Amazon India';
    if (host.includes('flipkart')) return 'Flipkart';
    if (host.includes('blinkit')) return 'Blinkit';
    if (host.includes('zepto')) return 'Zepto QuickCommerce';
    if (host.includes('instamart') || host.includes('swiggy')) return 'Swiggy Instamart';
    if (host.includes('bigbasket')) return 'BigBasket';
    if (host.includes('jiomart')) return 'JioMart';
    if (host.includes('myntra')) return 'Myntra';
    if (host.includes('nykaa')) return 'Nykaa';
    if (host.includes('demo') || host.includes('aletiq')) return 'Aletiq E-Commerce Compliance Demo Marketplace';
    return host.replace(/^www\./, '');
  } catch {
    return 'E-Commerce Marketplace';
  }
}

/**
 * Transforms raw extracted product data into standard ExtractedDeclarations
 */
function convertToExtractedDeclarations(raw: RawProductData, sourceUrl: string): ExtractedDeclarations {
  const conf = raw.confidence || 0.85;

  const createField = <T>(val: T | null | undefined, evidence?: string): ExtractedFieldItem<T> => ({
    value: (val !== undefined && val !== null && String(val).trim() !== '') ? (val as T) : (null as unknown as T),
    confidence: (val !== undefined && val !== null && String(val).trim() !== '') ? conf : 0,
    sourceImageId: `url_source_${Buffer.from(sourceUrl).toString('base64').slice(0, 8)}`,
    sourceSide: 'front',
    evidenceText: evidence || (val ? String(val) : undefined),
    status: (val !== undefined && val !== null && String(val).trim() !== '') ? 'found' : 'not_found',
  });

  const visibleList: string[] = [];
  if (raw.productName) visibleList.push(`Product Title: ${raw.productName}`);
  if (raw.brand) visibleList.push(`Brand: ${raw.brand}`);
  if (raw.netQuantity) visibleList.push(`Net Quantity: ${raw.netQuantity}`);
  if (raw.mrp) visibleList.push(`MRP: ${raw.mrp}`);
  if (raw.manufacturerName) visibleList.push(`Manufacturer: ${raw.manufacturerName}`);
  if (raw.countryOfOrigin) visibleList.push(`Country of Origin: ${raw.countryOfOrigin}`);
  if (raw.consumerCarePhone) visibleList.push(`Consumer Helpline: ${raw.consumerCarePhone}`);

  const possibleMissing: string[] = [];
  if (!raw.manufacturerName) possibleMissing.push('Manufacturer / Packer name & complete address');
  if (!raw.countryOfOrigin) possibleMissing.push('Country of Origin declaration');
  if (!raw.netQuantity) possibleMissing.push('Net Quantity declaration');
  if (!raw.mrp) possibleMissing.push('Maximum Retail Price (MRP)');
  if (!raw.consumerCarePhone && !raw.consumerCareEmail) possibleMissing.push('Consumer Care grievance contact details');

  return {
    product_name: createField<string>(raw.productName),
    brand: createField<string>(raw.brand),
    product_category: createField<string>(raw.category || 'Packaged Commodity'),
    generic_or_common_name: createField<string>(raw.genericName || raw.productName),

    manufacturer_name: createField<string>(raw.manufacturerName),
    manufacturer_address: createField<string>(raw.manufacturerAddress),
    packer_name: createField<string>(raw.packerName),
    packer_address: createField<string>(raw.packerAddress),
    importer_name: createField<string>(raw.importerName),
    importer_address: createField<string>(raw.importerAddress),

    net_quantity: createField<string>(raw.netQuantity),
    quantity_value: createField<number | null>(raw.quantityValue ?? null),
    quantity_unit: createField<string>(raw.quantityUnit),
    unit_sale_price: createField<string>(raw.unitSalePrice),

    mrp: createField<string>(raw.mrp ? `${raw.mrp} (inclusive of all taxes)` : null),
    currency: createField<string>(raw.currency || 'INR'),

    manufacturing_date: createField<string>(raw.manufacturingDate),
    packing_date: createField<string>(raw.packingDate),
    import_date: createField<string>(null),
    expiry_date: createField<string>(raw.expiryDate),
    best_before: createField<string>(raw.bestBefore),

    consumer_care_name: createField<string>(raw.consumerCareName || (raw.consumerCarePhone ? 'Consumer Redressal Cell' : null)),
    consumer_care_address: createField<string>(raw.consumerCareAddress || raw.manufacturerAddress),
    consumer_care_phone: createField<string>(raw.consumerCarePhone),
    consumer_care_email: createField<string>(raw.consumerCareEmail),

    country_of_origin: createField<string>(raw.countryOfOrigin || 'India'),
    is_imported: createField<boolean>(
      Boolean(raw.countryOfOrigin && !raw.countryOfOrigin.toLowerCase().includes('india'))
    ),

    visible_declarations: visibleList,
    unreadable_declarations: [],
    possible_missing_declarations: possibleMissing,
    overall_extraction_confidence: conf,
    raw_notes: `Extracted via ${raw.extractionTier} parser from digital listing URL: ${sourceUrl}`,
  };
}

/**
 * Complete Service Execution:
 * Fetch URL -> Extract Data -> Run Rule Engine Compliance -> Compare with physical package if inspectionId provided
 */
export async function analyzeProductUrlService(
  url: string,
  inspectionId?: string
): Promise<ProductUrlAnalysisResponse> {
  const { raw, listing, declarations } = await extractProductFromUrl(url);

  // Execute Aletiq Rule Engine Compliance Assessment on extracted web declarations
  const complianceResult: ComplianceResult = evaluateLegalMetrologyCompliance({
    inspectionId: inspectionId || `web_ecom_${Date.now()}`,
    extractedDeclarations: declarations,
    images: raw.imageUrl
      ? [
          {
            id: `web_img_${Date.now()}`,
            name: 'product_listing_image.jpg',
            side: 'front',
            url: raw.imageUrl,
            sizeBytes: 150000,
            mimeType: 'image/jpeg',
            timestamp: new Date().toISOString(),
            quality: {
              isAcceptable: true,
              blurScore: 90,
              brightnessScore: 75,
              glareDetected: false,
              textLegibilityEstimated: true,
              warnings: [],
            },
          },
        ]
      : [],
    productCategory: declarations.product_category.value || undefined,
  });

  let comparison: ComparisonResult | undefined;
  let inspectionRecord;

  // If inspectionId is provided, cross-verify against physical package declarations
  if (inspectionId) {
    inspectionRecord = await inspectionRepository.getById(inspectionId);
    if (inspectionRecord) {
      comparison = comparePackageWithDigitalListing(inspectionRecord, listing);
      inspectionRecord.comparison = comparison;
      await inspectionRepository.save(inspectionRecord);
    }
  }

  // Count extracted vs missing declarations
  const keyFields: Array<keyof ExtractedDeclarations> = [
    'product_name',
    'brand',
    'net_quantity',
    'mrp',
    'manufacturer_name',
    'country_of_origin',
    'manufacturing_date',
    'consumer_care_phone',
  ];

  let extractedCount = 0;
  let missingCount = 0;

  for (const f of keyFields) {
    const item = declarations[f] as ExtractedFieldItem;
    if (item && item.value) {
      extractedCount++;
    } else {
      missingCount++;
    }
  }

  return {
    success: true,
    sourceUrl: url,
    platform: listing.platform,
    extractionTier: raw.extractionTier,
    confidence: Math.round((declarations.overall_extraction_confidence || 0.85) * 100),
    extractedFieldsCount: extractedCount,
    missingFieldsCount: missingCount,
    listing,
    extractedDeclarations: declarations,
    complianceResult,
    comparison,
    inspection: inspectionRecord || undefined,
    warnings: raw.warnings,
    fallbackAvailable: true,
  };
}
