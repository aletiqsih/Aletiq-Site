import { PackageSide } from '../types';

export interface SamplePackagePreset {
  id: string;
  name: string;
  category: string;
  description: string;
  expectedOutcome: 'COMPLIANT' | 'NON_COMPLIANT' | 'INSUFFICIENT_EVIDENCE';
  images: Array<{
    name: string;
    side: PackageSide;
    url: string;
  }>;
  productName: string;
  brand: string;
  retailerName: string;
}

export const SAMPLE_PACKAGE_PRESETS: SamplePackagePreset[] = [
  {
    id: 'sample-honey',
    name: 'Organic Wild Honey (Complete Package)',
    category: 'Food & Sweeteners',
    description: 'Front & Back panels with all statutory declarations (FSSAI, Net Qty in grams, MRP incl. taxes, Consumer care).',
    expectedOutcome: 'COMPLIANT',
    productName: 'Organic Wild Mountain Honey',
    brand: 'PureNectar',
    retailerName: 'Metro Bazaar, Connaught Place',
    images: [
      {
        name: 'honey_front_label.jpg',
        side: 'front',
        url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&auto=format&fit=crop&q=80',
      },
      {
        name: 'honey_back_nutritional.jpg',
        side: 'back',
        url: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800&auto=format&fit=crop&q=80',
      },
    ],
  },
  {
    id: 'sample-cookies',
    name: 'Cashew Butter Cookies (Violations Demo)',
    category: 'Bakery & Confectionery',
    description: 'Contains non-standard unit "250 gms", missing tax inclusive wording on MRP, and incomplete consumer cell address.',
    expectedOutcome: 'NON_COMPLIANT',
    productName: 'Cashew Butter Cookies',
    brand: 'GoldenBake Foods',
    retailerName: 'QuickMart Superstore, Sector 18',
    images: [
      {
        name: 'cookie_front.jpg',
        side: 'front',
        url: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&auto=format&fit=crop&q=80',
      },
      {
        name: 'cookie_back_details.jpg',
        side: 'back',
        url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&auto=format&fit=crop&q=80',
      },
    ],
  },
  {
    id: 'sample-tea-single',
    name: 'Green Tea Box (Single Front Panel)',
    category: 'Beverages',
    description: 'Only 1 panel uploaded. Demonstrates NOT_DETERMINABLE behavior without falsely penalizing the manufacturer.',
    expectedOutcome: 'INSUFFICIENT_EVIDENCE',
    productName: 'Instant Lemon Green Tea',
    brand: 'TeaZen Vitality',
    retailerName: 'Organic Greens Health Store',
    images: [
      {
        name: 'green_tea_front.jpg',
        side: 'front',
        url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=80',
      },
    ],
  },
  {
    id: 'sample-chips',
    name: 'Artisan Kettle Potato Crisps (Multi-Side)',
    category: 'Snack Foods',
    description: '3 panels submitted (Front, Back, Side). Checks Unit Sale Price, Expiry, Metric Net Quantity.',
    expectedOutcome: 'COMPLIANT',
    productName: 'Sea Salt & Black Pepper Crisps',
    brand: 'KettleCraft',
    retailerName: 'Reliance Fresh, Indiranagar',
    images: [
      {
        name: 'crisps_front.jpg',
        side: 'front',
        url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=800&auto=format&fit=crop&q=80',
      },
      {
        name: 'crisps_back.jpg',
        side: 'back',
        url: 'https://images.unsplash.com/photo-1527842891421-42eec6e703ea?w=800&auto=format&fit=crop&q=80',
      },
      {
        name: 'crisps_side.jpg',
        side: 'left',
        url: 'https://images.unsplash.com/photo-1621447504864-d8686e12698c?w=800&auto=format&fit=crop&q=80',
      },
    ],
  },
];
