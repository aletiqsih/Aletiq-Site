export type PackageSide = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | 'other';

export type RuleStatus = 'PASS' | 'FAIL' | 'WARNING' | 'NOT_DETERMINABLE' | 'NOT_APPLICABLE';
export type RuleEvaluationStatus = RuleStatus;

export type AssessmentConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type OverallComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW' | 'INSUFFICIENT_EVIDENCE';
export type ComplianceStatus = OverallComplianceStatus;

export interface ImageQualityAssessment {
  isAcceptable: boolean;
  blurScore: number; // 0-100 (higher = sharper)
  brightnessScore: number; // 0-100 (40-80 ideal)
  glareDetected: boolean;
  textLegibilityEstimated: boolean;
  warnings: string[];
}

export interface InspectionImage {
  id: string;
  name: string;
  side: PackageSide;
  url: string; // base64 or served URL
  thumbnail?: string;
  sizeBytes: number;
  mimeType: string;
  timestamp: string;
  quality: ImageQualityAssessment;
}

export interface ExtractedFieldItem<T = string | number | null> {
  value: T;
  confidence: number; // 0 to 1
  sourceImageId: string;
  sourceSide: PackageSide;
  evidenceText?: string;
  detectedRegion?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  status: 'found' | 'unreadable' | 'not_found';
}

export interface ExtractedDeclarations {
  product_name: ExtractedFieldItem<string>;
  brand: ExtractedFieldItem<string>;
  product_category: ExtractedFieldItem<string>;
  generic_or_common_name: ExtractedFieldItem<string>;
  
  manufacturer_name: ExtractedFieldItem<string>;
  manufacturer_address: ExtractedFieldItem<string>;
  packer_name: ExtractedFieldItem<string>;
  packer_address: ExtractedFieldItem<string>;
  importer_name: ExtractedFieldItem<string>;
  importer_address: ExtractedFieldItem<string>;
  
  net_quantity: ExtractedFieldItem<string>;
  quantity_value: ExtractedFieldItem<number | null>;
  quantity_unit: ExtractedFieldItem<string>;
  unit_sale_price?: ExtractedFieldItem<string>;
  
  mrp: ExtractedFieldItem<string>;
  currency: ExtractedFieldItem<string>;
  
  manufacturing_date: ExtractedFieldItem<string>;
  packing_date: ExtractedFieldItem<string>;
  import_date: ExtractedFieldItem<string>;
  expiry_date: ExtractedFieldItem<string>;
  best_before: ExtractedFieldItem<string>;
  
  consumer_care_name: ExtractedFieldItem<string>;
  consumer_care_address: ExtractedFieldItem<string>;
  consumer_care_phone: ExtractedFieldItem<string>;
  consumer_care_email: ExtractedFieldItem<string>;
  
  country_of_origin: ExtractedFieldItem<string>;
  is_imported: ExtractedFieldItem<boolean>;
  
  visible_declarations: string[];
  unreadable_declarations: string[];
  possible_missing_declarations: string[];
  overall_extraction_confidence: number;
  raw_notes?: string;
}

export interface LegalRule {
  rule_id: string;
  rule_name: string;
  category: 'IDENTITY' | 'COMMODITY' | 'NET_QUANTITY' | 'MRP' | 'DATES' | 'CONSUMER_CARE' | 'ORIGIN' | 'DISPLAY_PANEL' | 'SPECIAL_CATEGORY';
  legal_reference: string;
  legal_source: string;
  legal_source_url?: string;
  rule_version: string;
  effective_from: string;
  effective_to?: string;
  applicability_conditions: string[];
  required_fields: string[];
  description: string;
  statutory_penalty_ref: string;
  verification_required?: boolean;
}

export interface RuleEvaluation {
  rule_id: string;
  rule_name: string;
  category: string;
  status: RuleStatus;
  detected_value: string;
  issue: string | null;
  explanation: string;
  recommendation: string;
  evidence: {
    snippet?: string;
    source_image_id?: string;
    source_side?: PackageSide;
    confidence?: number;
  };
  source_images: string[];
  confidence: number;
  legal_reference: string;
  legal_source: string;
  statutory_penalty_ref?: string;
}

export interface ComplianceScore {
  score: number; // 0 to 100
  formulaExplanation: string;
  passCount: number;
  failCount: number;
  warningCount: number;
  notDeterminableCount: number;
  notApplicableCount: number;
  totalRulesEvaluated: number;
}

export interface ComplianceResult {
  id: string;
  inspectionId: string;
  overallStatus: OverallComplianceStatus;
  score: ComplianceScore;
  confidence: AssessmentConfidence;
  confidenceScore: number; // 0 to 100
  confidenceReasons: string[];
  evaluations: RuleEvaluation[];
  extractedDeclarations: ExtractedDeclarations;
  productCategory: string;
  isCategoryIdentified: boolean;
  assessedAt: string;
}

export interface DigitalListing {
  url?: string;
  platform?: string;
  title: string;
  brand?: string;
  sellerDetails?: string;
  manufacturerDetails?: string;
  netQuantity?: string;
  mrp?: string;
  countryOfOrigin?: string;
  rawDescription?: string;
  listingImageUrl?: string;
}

export type ComparisonStatus = 'MATCH' | 'MISMATCH' | 'NOT_AVAILABLE' | 'UNABLE_TO_DETERMINE';

export interface ComparisonItem {
  field: string;
  label: string;
  packageValue: string;
  listingValue: string;
  status: ComparisonStatus;
  discrepancyNote?: string;
}

export interface ComparisonResult {
  listing: DigitalListing;
  items: ComparisonItem[];
  matchRate: number; // 0 to 100
  overallStatus: 'CONSISTENT' | 'DISCREPANCY_DETECTED' | 'INSUFFICIENT_DATA';
  summary: string;
  comparedAt: string;
}

export interface ImprovementNotice {
  noticeNumber: string;
  date: string;
  inspectorName: string;
  inspectorDesignation: string;
  issuingAuthority: string;
  entityName: string;
  entityAddress: string;
  productName: string;
  batchNumber?: string;
  issues: Array<{
    ruleId: string;
    ruleTitle: string;
    legalReference: string;
    violationDetails: string;
    statutoryDeadlineDays: number;
    remedyRequirement: string;
  }>;
  statutoryReferences: string[];
  draftStatus: 'DRAFT_NOT_OFFICIAL';
  disclaimer: string;
}

export interface Inspection {
  id: string;
  title: string;
  productName?: string;
  brand?: string;
  inspectorName?: string;
  inspectorLocation?: string;
  batchNumber?: string;
  retailerName?: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'analyzing' | 'completed' | 'failed';
  errorMessage?: string;
  images: InspectionImage[];
  result?: ComplianceResult;
  comparison?: ComparisonResult;
  noticeDraft?: ImprovementNotice;
  notes?: string;
}

export interface RiskIntelligenceAnalytics {
  totalInspections: number;
  compliantCount: number;
  nonCompliantCount: number;
  needsReviewCount: number;
  averageComplianceScore: number;
  commonViolations: Array<{
    ruleId: string;
    ruleName: string;
    count: number;
    percentage: number;
    category: string;
  }>;
  commonMissingDeclarations: Array<{
    fieldName: string;
    count: number;
  }>;
  categoryRiskBreakdown: Array<{
    category: string;
    total: number;
    violationRate: number;
  }>;
  sideCoverageStats: {
    singleSideCount: number;
    multiSideCount: number;
    averageSidesPerInspection: number;
  };
  recentTrends: Array<{
    date: string;
    inspectionsCount: number;
    complianceRate: number;
  }>;
}
