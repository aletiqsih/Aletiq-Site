import {
  ExtractedDeclarations,
  InspectionImage,
  LegalRule,
  RuleEvaluation,
  ComplianceScore,
  ComplianceResult,
  AssessmentConfidence,
  OverallComplianceStatus,
  PackageSide
} from '../../src/types';
import { LEGAL_RULES } from '../../src/data/legalRules';

export interface RuleEngineInput {
  inspectionId: string;
  extractedDeclarations: ExtractedDeclarations;
  images: InspectionImage[];
  productCategory?: string;
}

export function evaluateLegalMetrologyCompliance(input: RuleEngineInput): ComplianceResult {
  const { inspectionId, extractedDeclarations, images } = input;
  const evaluations: RuleEvaluation[] = [];

  const sidesSubmitted = Array.from(new Set(images.map(img => img.side)));
  const totalImages = images.length;
  const hasBackPanel = sidesSubmitted.includes('back');
  const hasFrontPanel = sidesSubmitted.includes('front');
  const isMultiPanel = sidesSubmitted.length >= 2 || (hasFrontPanel && hasBackPanel) || totalImages >= 3;

  const productCat = (extractedDeclarations.product_category?.value || 'UNKNOWN').toUpperCase();
  const isFoodOrCosmetic = ['FOOD', 'BEVERAGE', 'COSMETIC', 'PERISHABLE', 'DAIRY', 'SNACK', 'GROCERY', 'EDIBLE OIL'].some(c => productCat.includes(c));
  const isImported = extractedDeclarations.is_imported?.value === true || 
    (extractedDeclarations.country_of_origin?.value && !extractedDeclarations.country_of_origin.value.toLowerCase().includes('india'));

  // 1. Manufacturer / Packer Identity & Address
  evaluations.push(evaluateManufacturerRule(extractedDeclarations, sidesSubmitted, isMultiPanel));

  // 2. Generic or Common Commodity Name
  evaluations.push(evaluateCommodityNameRule(extractedDeclarations, sidesSubmitted, isMultiPanel));

  // 3. Net Quantity in Standard Metric Units
  evaluations.push(evaluateNetQuantityRule(extractedDeclarations, sidesSubmitted, isMultiPanel));

  // 4. Maximum Retail Price (MRP) & Tax Inclusion
  evaluations.push(evaluateMRPRule(extractedDeclarations, sidesSubmitted, isMultiPanel));

  // 5. Month and Year of Manufacture / Packing
  evaluations.push(evaluateDateRule(extractedDeclarations, sidesSubmitted, isMultiPanel));

  // 6. Consumer Care Contact Details
  evaluations.push(evaluateConsumerCareRule(extractedDeclarations, sidesSubmitted, isMultiPanel));

  // 7. Country of Origin (Imported / Domestic)
  evaluations.push(evaluateCountryOfOriginRule(extractedDeclarations, isImported, sidesSubmitted, isMultiPanel));

  // 8. Unit Sale Price (USP)
  evaluations.push(evaluateUnitSalePriceRule(extractedDeclarations, sidesSubmitted, isMultiPanel));

  // 9. Principal Display Panel & Letter Height Legibility
  evaluations.push(evaluateDisplayPanelRule(extractedDeclarations, images));

  // 10. Expiry Date / Best Before
  evaluations.push(evaluateExpiryDateRule(extractedDeclarations, isFoodOrCosmetic, sidesSubmitted, isMultiPanel));

  // Calculate score and confidence
  const score = calculateComplianceScore(evaluations);
  const { confidence, confidenceScore, confidenceReasons } = calculateAssessmentConfidence(
    images,
    extractedDeclarations,
    evaluations
  );

  let overallStatus: OverallComplianceStatus = 'COMPLIANT';
  if (score.failCount > 0) {
    overallStatus = 'NON_COMPLIANT';
  } else if (score.notDeterminableCount > 0 && !isMultiPanel) {
    overallStatus = 'INSUFFICIENT_EVIDENCE';
  } else if (score.warningCount > 0 || score.notDeterminableCount > 0) {
    overallStatus = 'NEEDS_REVIEW';
  }

  return {
    id: `res_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    inspectionId,
    overallStatus,
    score,
    confidence,
    confidenceScore,
    confidenceReasons,
    evaluations,
    extractedDeclarations,
    productCategory: productCat,
    isCategoryIdentified: productCat !== 'UNKNOWN',
    assessedAt: new Date().toISOString()
  };
}

function evaluateManufacturerRule(
  decl: ExtractedDeclarations,
  sides: PackageSide[],
  isMultiPanel: boolean
): RuleEvaluation {
  const rule = LEGAL_RULES.find(r => r.rule_id === 'LMPC-R06-MFG')!;
  const mfgName = decl.manufacturer_name?.value;
  const mfgAddr = decl.manufacturer_address?.value;
  const pkrName = decl.packer_name?.value;
  const pkrAddr = decl.packer_address?.value;
  const impName = decl.importer_name?.value;
  const impAddr = decl.importer_address?.value;

  const hasName = Boolean(mfgName || pkrName || impName);
  const hasAddr = Boolean(mfgAddr || pkrAddr || impAddr);

  if (hasName && hasAddr) {
    const combinedVal = `${mfgName || pkrName || impName || ''} | ${mfgAddr || pkrAddr || impAddr || ''}`;
    return {
      rule_id: rule.rule_id,
      rule_name: rule.rule_name,
      category: rule.category,
      status: 'PASS',
      detected_value: combinedVal,
      issue: null,
      explanation: 'Manufacturer/Packer/Importer identity and address are clearly declared in compliance with Rule 6(1)(a) & (b).',
      recommendation: 'Maintain full statutory address with PIN code and state details.',
      evidence: {
        snippet: combinedVal,
        source_side: decl.manufacturer_name?.sourceSide || decl.packer_name?.sourceSide || 'back',
        confidence: decl.manufacturer_name?.confidence || 0.9
      },
      source_images: [decl.manufacturer_name?.sourceImageId || 'img_1'].filter(Boolean),
      confidence: 0.95,
      legal_reference: rule.legal_reference,
      legal_source: rule.legal_source,
      statutory_penalty_ref: rule.statutory_penalty_ref
    };
  }

  if (hasName && !hasAddr) {
    return {
      rule_id: rule.rule_id,
      rule_name: rule.rule_name,
      category: rule.category,
      status: 'WARNING',
      detected_value: `${mfgName || pkrName || impName} (Address details missing/incomplete)`,
      issue: 'Manufacturer/Packer name is visible, but complete physical address or PIN code was not clearly detected.',
      explanation: 'Rule 6(1)(a) requires the complete postal address where the manufacturing premises or packing unit is situated.',
      recommendation: 'Ensure complete factory/office address including city, state, and PIN code is printed.',
      evidence: {
        snippet: mfgName || pkrName || impName || '',
        source_side: decl.manufacturer_name?.sourceSide || 'back',
        confidence: 0.8
      },
      source_images: [decl.manufacturer_name?.sourceImageId || 'img_1'].filter(Boolean),
      confidence: 0.85,
      legal_reference: rule.legal_reference,
      legal_source: rule.legal_source,
      statutory_penalty_ref: rule.statutory_penalty_ref
    };
  }

  // If not found: check if multi-panel
  if (!isMultiPanel) {
    return {
      rule_id: rule.rule_id,
      rule_name: rule.rule_name,
      category: rule.category,
      status: 'NOT_DETERMINABLE',
      detected_value: 'Not detected on submitted panel(s)',
      issue: 'Manufacturer/Packer details were not visible on the submitted package image(s).',
      explanation: `The system inspected ${sides.join(', ')} panel(s). Manufacturer address usually appears on the back or side panels, which were not submitted.`,
      recommendation: 'Upload back and side panels of the packaging for a conclusive legal determination.',
      evidence: {
        snippet: 'No manufacturer text visible on submitted side(s)'
      },
      source_images: [],
      confidence: 0.5,
      legal_reference: rule.legal_reference,
      legal_source: rule.legal_source,
      statutory_penalty_ref: rule.statutory_penalty_ref
    };
  }

  // Multi-panel submitted and still missing => FAIL
  return {
    rule_id: rule.rule_id,
    rule_name: rule.rule_name,
    category: rule.category,
    status: 'FAIL',
    detected_value: 'Missing across submitted package panels',
    issue: 'Mandatory declaration of Manufacturer, Packer, or Importer identity and address is missing.',
    explanation: 'Comprehensive multi-panel inspection indicates absence of statutory manufacturer/packer name and address, constituting a direct violation of Rule 6(1)(a) & (b).',
    recommendation: 'Pre-printed or stamped manufacturer name and complete address must be added before commercial distribution.',
    evidence: {
      snippet: 'Searched all submitted images, no manufacturer block located.'
    },
    source_images: [],
    confidence: 0.9,
    legal_reference: rule.legal_reference,
    legal_source: rule.legal_source,
    statutory_penalty_ref: rule.statutory_penalty_ref
  };
}

function evaluateCommodityNameRule(
  decl: ExtractedDeclarations,
  sides: PackageSide[],
  isMultiPanel: boolean
): RuleEvaluation {
  const rule = LEGAL_RULES.find(r => r.rule_id === 'LMPC-R06-COM')!;
  const genericName = decl.generic_or_common_name?.value;
  const prodName = decl.product_name?.value;

  if (genericName && genericName.length > 2) {
    return {
      rule_id: rule.rule_id,
      rule_name: rule.rule_name,
      category: rule.category,
      status: 'PASS',
      detected_value: genericName,
      issue: null,
      explanation: 'Generic or common name of the commodity is clearly displayed on the package per Rule 6(1)(c).',
      recommendation: 'Ensure prominence on the principal display panel.',
      evidence: {
        snippet: genericName,
        source_side: decl.generic_or_common_name?.sourceSide || 'front',
        confidence: decl.generic_or_common_name?.confidence || 0.9
      },
      source_images: [decl.generic_or_common_name?.sourceImageId || 'img_1'].filter(Boolean),
      confidence: 0.95,
      legal_reference: rule.legal_reference,
      legal_source: rule.legal_source,
      statutory_penalty_ref: rule.statutory_penalty_ref
    };
  }

  if (prodName && prodName.length > 2) {
    return {
      rule_id: rule.rule_id,
      rule_name: rule.rule_name,
      category: rule.category,
      status: 'PASS',
      detected_value: prodName,
      issue: null,
      explanation: 'Product name detected which serves as the common commodity descriptor.',
      recommendation: 'Verify that the generic descriptor is distinct from the brand name.',
      evidence: {
        snippet: prodName,
        source_side: decl.product_name?.sourceSide || 'front',
        confidence: decl.product_name?.confidence || 0.85
      },
      source_images: [decl.product_name?.sourceImageId || 'img_1'].filter(Boolean),
      confidence: 0.88,
      legal_reference: rule.legal_reference,
      legal_source: rule.legal_source,
      statutory_penalty_ref: rule.statutory_penalty_ref
    };
  }

  if (!isMultiPanel) {
    return {
      rule_id: rule.rule_id,
      rule_name: rule.rule_name,
      category: rule.category,
      status: 'NOT_DETERMINABLE',
      detected_value: 'Not clearly identified',
      issue: 'Commodity common name could not be conclusively determined from the single submitted panel.',
      explanation: 'Upload the principal display panel (front) where the commodity descriptor is required to be positioned.',
      recommendation: 'Upload the front panel of the package.',
      evidence: { snippet: 'No generic descriptor found on submitted panel' },
      source_images: [],
      confidence: 0.5,
      legal_reference: rule.legal_reference,
      legal_source: rule.legal_source,
      statutory_penalty_ref: rule.statutory_penalty_ref
    };
  }

  return {
    rule_id: rule.rule_id,
    rule_name: rule.rule_name,
    category: rule.category,
    status: 'FAIL',
    detected_value: 'Absent',
    issue: 'Generic or common name of the commodity is missing.',
    explanation: 'Rule 6(1)(c) mandates that every package must contain the generic name of the commodity to prevent deceptive trade descriptions.',
    recommendation: 'Print the generic descriptor in prominent lettering on the principal display panel.',
    evidence: { snippet: 'No common commodity descriptor detected across package' },
    source_images: [],
    confidence: 0.9,
    legal_reference: rule.legal_reference,
    legal_source: rule.legal_source,
    statutory_penalty_ref: rule.statutory_penalty_ref
  };
}

function evaluateNetQuantityRule(
  decl: ExtractedDeclarations,
  sides: PackageSide[],
  isMultiPanel: boolean
): RuleEvaluation {
  const rule = LEGAL_RULES.find(r => r.rule_id === 'LMPC-R06-QTY')!;
  const rawQty = decl.net_quantity?.value;
  const qtyUnit = (decl.quantity_unit?.value || '').toLowerCase().trim();

  const standardUnits = ['g', 'kg', 'ml', 'l', 'm', 'cm', 'mm', 'n', 'u', 'count', 'piece', 'pieces', 'gm', 'ltr'];
  const nonStandardSymbols = ['gms', 'kilos', 'ltrs', 'sq.ft', 'oz', 'lbs', 'approx', 'when packed'];

  if (rawQty && rawQty.length > 0) {
    const isNonStandard = nonStandardSymbols.some(s => rawQty.toLowerCase().includes(s));
    
    if (isNonStandard) {
      return {
        rule_id: rule.rule_id,
        rule_name: rule.rule_name,
        category: rule.category,
        status: 'FAIL',
        detected_value: rawQty,
        issue: 'Non-standard quantity unit or prohibited qualifier used.',
        explanation: `Declaration "${rawQty}" contains non-standard symbols (e.g. gms, kilos, approx). Rule 13 of LMPC Rules 2011 mandates strict standard metric abbreviations (e.g. 'g', 'kg', 'ml', 'l', 'N').`,
        recommendation: 'Format net quantity strictly using standard SI units without plural suffixes (e.g., use "500 g" instead of "500 gms").',
        evidence: {
          snippet: rawQty,
          source_side: decl.net_quantity?.sourceSide || 'front',
          confidence: decl.net_quantity?.confidence || 0.9
        },
        source_images: [decl.net_quantity?.sourceImageId || 'img_1'].filter(Boolean),
        confidence: 0.92,
        legal_reference: rule.legal_reference,
        legal_source: rule.legal_source,
        statutory_penalty_ref: rule.statutory_penalty_ref
      };
    }

    return {
      rule_id: rule.rule_id,
      rule_name: rule.rule_name,
      category: rule.category,
      status: 'PASS',
      detected_value: rawQty,
      issue: null,
      explanation: 'Net quantity is correctly declared in standard metric units per Rule 6(1)(d) & Rule 12.',
      recommendation: 'Ensure minimum numeral height compliance as per Second Schedule based on package area.',
      evidence: {
        snippet: rawQty,
        source_side: decl.net_quantity?.sourceSide || 'front',
        confidence: decl.net_quantity?.confidence || 0.9
      },
      source_images: [decl.net_quantity?.sourceImageId || 'img_1'].filter(Boolean),
      confidence: 0.95,
      legal_reference: rule.legal_reference,
      legal_source: rule.legal_source,
      statutory_penalty_ref: rule.statutory_penalty_ref
    };
  }

  if (!isMultiPanel) {
    return {
      rule_id: rule.rule_id,
      rule_name: rule.rule_name,
      category: rule.category,
      status: 'NOT_DETERMINABLE',
      detected_value: 'Not detected on current panel',
      issue: 'Net quantity declaration was not detected in the submitted image.',
      explanation: 'Net quantity must be on the Principal Display Panel (PDP). If the current image is not the front panel, upload the front display.',
      recommendation: 'Upload the principal display panel showing net quantity.',
      evidence: { snippet: 'Net quantity text absent on submitted side' },
      source_images: [],
      confidence: 0.6,
      legal_reference: rule.legal_reference,
      legal_source: rule.legal_source,
      statutory_penalty_ref: rule.statutory_penalty_ref
    };
  }

  return {
    rule_id: rule.rule_id,
    rule_name: rule.rule_name,
    category: rule.category,
    status: 'FAIL',
    detected_value: 'Missing',
    issue: 'Mandatory declaration of Net Quantity is completely absent.',
    explanation: 'Rule 6(1)(d) strictly prohibits the sale of pre-packaged commodities without a prominent declaration of net quantity.',
    recommendation: 'Print net quantity prominently in the lower 40% area of the principal display panel.',
    evidence: { snippet: 'Net quantity not found across package panels' },
    source_images: [],
    confidence: 0.92,
    legal_reference: rule.legal_reference,
    legal_source: rule.legal_source,
    statutory_penalty_ref: rule.statutory_penalty_ref
  };
}

function evaluateMRPRule(
  decl: ExtractedDeclarations,
  sides: PackageSide[],
  isMultiPanel: boolean
): RuleEvaluation {
  const rule = LEGAL_RULES.find(r => r.rule_id === 'LMPC-R06-MRP')!;
  const rawMRP = decl.mrp?.value;

  if (rawMRP && rawMRP.length > 0) {
    const lower = rawMRP.toLowerCase();
    const hasTaxDeclaration = lower.includes('tax') || lower.includes('incl') || lower.includes('all taxes');

    if (!hasTaxDeclaration) {
      return {
        rule_id: rule.rule_id,
        rule_name: rule.rule_name,
        category: rule.category,
        status: 'WARNING',
        detected_value: rawMRP,
        issue: 'Price detected but mandatory "inclusive of all taxes" wording was not clearly found.',
        explanation: 'Rule 6(1)(e) requires retail price to be declared in the exact format "MRP Rs./₹ ... (inclusive of all taxes)".',
        recommendation: 'Explicitly print "incl. of all taxes" alongside the MRP numerals.',
        evidence: {
          snippet: rawMRP,
          source_side: decl.mrp?.sourceSide || 'back',
          confidence: decl.mrp?.confidence || 0.85
        },
        source_images: [decl.mrp?.sourceImageId || 'img_1'].filter(Boolean),
        confidence: 0.85,
        legal_reference: rule.legal_reference,
        legal_source: rule.legal_source,
        statutory_penalty_ref: rule.statutory_penalty_ref
      };
    }

    return {
      rule_id: rule.rule_id,
      rule_name: rule.rule_name,
      category: rule.category,
      status: 'PASS',
      detected_value: rawMRP,
      issue: null,
      explanation: 'Maximum Retail Price is properly declared in Indian Rupees with all taxes included.',
      recommendation: 'Ensure the MRP is not altered, smudged, or covered with stickers.',
      evidence: {
        snippet: rawMRP,
        source_side: decl.mrp?.sourceSide || 'back',
        confidence: decl.mrp?.confidence || 0.95
      },
      source_images: [decl.mrp?.sourceImageId || 'img_1'].filter(Boolean),
      confidence: 0.95,
      legal_reference: rule.legal_reference,
      legal_source: rule.legal_source,
      statutory_penalty_ref: rule.statutory_penalty_ref
    };
  }

  if (!isMultiPanel) {
    return {
      rule_id: rule.rule_id,
      rule_name: rule.rule_name,
      category: rule.category,
      status: 'NOT_DETERMINABLE',
      detected_value: 'Not visible in submitted image',
      issue: 'MRP was not visible on the submitted panel.',
      explanation: 'MRP and packing batch details frequently appear on the back or top panel.',
      recommendation: 'Upload the back, top, or base panel where batch and price are stamped.',
      evidence: { snippet: 'No MRP block found on submitted panel' },
      source_images: [],
      confidence: 0.6,
      legal_reference: rule.legal_reference,
      legal_source: rule.legal_source,
      statutory_penalty_ref: rule.statutory_penalty_ref
    };
  }

  return {
    rule_id: rule.rule_id,
    rule_name: rule.rule_name,
    category: rule.category,
    status: 'FAIL',
    detected_value: 'Missing',
    issue: 'Maximum Retail Price (MRP) is absent.',
    explanation: 'Selling a pre-packaged commodity without declaring the Maximum Retail Price is a punishable offence under Section 36(1) of Legal Metrology Act, 2009.',
    recommendation: 'Affix prominent MRP declaration in Indian currency with tax inclusion.',
    evidence: { snippet: 'Searched all submitted images, no MRP declaration found' },
    source_images: [],
    confidence: 0.9,
    legal_reference: rule.legal_reference,
    legal_source: rule.legal_source,
    statutory_penalty_ref: rule.statutory_penalty_ref
  };
}

function evaluateDateRule(
  decl: ExtractedDeclarations,
  sides: PackageSide[],
  isMultiPanel: boolean
): RuleEvaluation {
  const rule = LEGAL_RULES.find(r => r.rule_id === 'LMPC-R06-DAT')!;
  const mfg = decl.manufacturing_date?.value;
  const pck = decl.packing_date?.value;
  const imp = decl.import_date?.value;

  const dateVal = mfg || pck || imp;

  if (dateVal && dateVal.length > 0) {
    return {
      rule_id: rule.rule_id,
      rule_name: rule.rule_name,
      category: rule.category,
      status: 'PASS',
      detected_value: dateVal,
      issue: null,
      explanation: 'Month and Year of manufacture / packing / import is declared in accordance with Rule 6(1)(e).',
      recommendation: 'Ensure date numerals meet contrast and minimum height requirements.',
      evidence: {
        snippet: dateVal,
        source_side: decl.manufacturing_date?.sourceSide || decl.packing_date?.sourceSide || 'back',
        confidence: decl.manufacturing_date?.confidence || 0.9
      },
      source_images: [decl.manufacturing_date?.sourceImageId || 'img_1'].filter(Boolean),
      confidence: 0.92,
      legal_reference: rule.legal_reference,
      legal_source: rule.legal_source,
      statutory_penalty_ref: rule.statutory_penalty_ref
    };
  }

  if (!isMultiPanel) {
    return {
      rule_id: rule.rule_id,
      rule_name: rule.rule_name,
      category: rule.category,
      status: 'NOT_DETERMINABLE',
      detected_value: 'Not detected on submitted panel',
      issue: 'Month and Year of manufacture/packing not visible.',
      explanation: 'Date of manufacturing/packing is typically printed on back or top crimp panels.',
      recommendation: 'Upload the panel containing stamped batch/date information.',
      evidence: { snippet: 'No date stamp on current panel' },
      source_images: [],
      confidence: 0.55,
      legal_reference: rule.legal_reference,
      legal_source: rule.legal_source,
      statutory_penalty_ref: rule.statutory_penalty_ref
    };
  }

  return {
    rule_id: rule.rule_id,
    rule_name: rule.rule_name,
    category: rule.category,
    status: 'FAIL',
    detected_value: 'Missing',
    issue: 'Month and year of manufacture or pre-packing is missing.',
    explanation: 'Rule 6(1)(e) mandates clear indication of the month and year in which commodity was manufactured, packed or imported.',
    recommendation: 'Print month and year of packing clearly using indelible ink or stamp.',
    evidence: { snippet: 'No date/month/year stamp identified across panels' },
    source_images: [],
    confidence: 0.88,
    legal_reference: rule.legal_reference,
    legal_source: rule.legal_source,
    statutory_penalty_ref: rule.statutory_penalty_ref
  };
}

function evaluateConsumerCareRule(
  decl: ExtractedDeclarations,
  sides: PackageSide[],
  isMultiPanel: boolean
): RuleEvaluation {
  const rule = LEGAL_RULES.find(r => r.rule_id === 'LMPC-R06-CC')!;
  const name = decl.consumer_care_name?.value;
  const addr = decl.consumer_care_address?.value;
  const phone = decl.consumer_care_phone?.value;
  const email = decl.consumer_care_email?.value;

  const contactElements = [name, addr, phone, email].filter(Boolean);

  if (contactElements.length >= 2 && (phone || email)) {
    const combined = `Tel: ${phone || 'N/A'} | Email: ${email || 'N/A'} | Address: ${addr || name || 'Available'}`;
    return {
      rule_id: rule.rule_id,
      rule_name: rule.rule_name,
      category: rule.category,
      status: 'PASS',
      detected_value: combined,
      issue: null,
      explanation: 'Consumer care contact details (phone, email, address) comply with Rule 6(1)(h).',
      recommendation: 'Ensure consumer helpline is active during standard business hours.',
      evidence: {
        snippet: combined,
        source_side: decl.consumer_care_phone?.sourceSide || decl.consumer_care_email?.sourceSide || 'back',
        confidence: 0.9
      },
      source_images: [decl.consumer_care_phone?.sourceImageId || 'img_1'].filter(Boolean),
      confidence: 0.94,
      legal_reference: rule.legal_reference,
      legal_source: rule.legal_source,
      statutory_penalty_ref: rule.statutory_penalty_ref
    };
  }

  if (contactElements.length === 1) {
    return {
      rule_id: rule.rule_id,
      rule_name: rule.rule_name,
      category: rule.category,
      status: 'WARNING',
      detected_value: `${contactElements[0]} (Incomplete channels)`,
      issue: 'Partial consumer care details detected. Rule 6(1)(h) mandates complete phone, email, and postal address.',
      explanation: 'Only a single contact channel was detected. Full statutory disclosure requires email, telephone, and postal address.',
      recommendation: 'Add dedicated consumer grievance email and telephone number.',
      evidence: {
        snippet: contactElements[0] || '',
        source_side: 'back',
        confidence: 0.8
      },
      source_images: [],
      confidence: 0.82,
      legal_reference: rule.legal_reference,
      legal_source: rule.legal_source,
      statutory_penalty_ref: rule.statutory_penalty_ref
    };
  }

  if (!isMultiPanel) {
    return {
      rule_id: rule.rule_id,
      rule_name: rule.rule_name,
      category: rule.category,
      status: 'NOT_DETERMINABLE',
      detected_value: 'Not detected on current panel',
      issue: 'Consumer care details not detected on submitted image.',
      explanation: 'Consumer grievance details are almost exclusively located on the back or informational side panels.',
      recommendation: 'Upload back panel containing the consumer care box.',
      evidence: { snippet: 'Consumer care box absent on submitted side' },
      source_images: [],
      confidence: 0.55,
      legal_reference: rule.legal_reference,
      legal_source: rule.legal_source,
      statutory_penalty_ref: rule.statutory_penalty_ref
    };
  }

  return {
    rule_id: rule.rule_id,
    rule_name: rule.rule_name,
    category: rule.category,
    status: 'FAIL',
    detected_value: 'Missing',
    issue: 'Mandatory Consumer Care contact information is absent.',
    explanation: 'Rule 6(1)(h) mandates that consumer grievance redressal contact info must be clearly printed on all retail packages.',
    recommendation: 'Include consumer care cell contact name, address, telephone number, and email address.',
    evidence: { snippet: 'No consumer care contact details found across package' },
    source_images: [],
    confidence: 0.9,
    legal_reference: rule.legal_reference,
    legal_source: rule.legal_source,
    statutory_penalty_ref: rule.statutory_penalty_ref
  };
}

function evaluateCountryOfOriginRule(
  decl: ExtractedDeclarations,
  isImported: boolean,
  sides: PackageSide[],
  isMultiPanel: boolean
): RuleEvaluation {
  const rule = LEGAL_RULES.find(r => r.rule_id === 'LMPC-R06-COO')!;
  const coo = decl.country_of_origin?.value;

  if (coo && coo.length > 0) {
    return {
      rule_id: rule.rule_id,
      rule_name: rule.rule_name,
      category: rule.category,
      status: 'PASS',
      detected_value: coo,
      issue: null,
      explanation: `Country of Origin is declared as "${coo}" in compliance with Rule 6(1)(aa).`,
      recommendation: 'Maintain origin declaration for transparent customs and metrology verification.',
      evidence: {
        snippet: coo,
        source_side: decl.country_of_origin?.sourceSide || 'back',
        confidence: decl.country_of_origin?.confidence || 0.9
      },
      source_images: [decl.country_of_origin?.sourceImageId || 'img_1'].filter(Boolean),
      confidence: 0.94,
      legal_reference: rule.legal_reference,
      legal_source: rule.legal_source,
      statutory_penalty_ref: rule.statutory_penalty_ref
    };
  }

  // If imported package and COO is missing => FAIL
  if (isImported) {
    if (!isMultiPanel) {
      return {
        rule_id: rule.rule_id,
        rule_name: rule.rule_name,
        category: rule.category,
        status: 'NOT_DETERMINABLE',
        detected_value: 'Unconfirmed on submitted panel',
        issue: 'Imported product context detected, but Country of Origin is not visible on current image.',
        explanation: 'Country of Origin is mandatory for imported packages under Rule 6(1)(aa).',
        recommendation: 'Upload back and side panels to locate the Country of Origin declaration.',
        evidence: { snippet: 'Import context without visible COO panel' },
        source_images: [],
        confidence: 0.6,
        legal_reference: rule.legal_reference,
        legal_source: rule.legal_source,
        statutory_penalty_ref: rule.statutory_penalty_ref
      };
    }

    return {
      rule_id: rule.rule_id,
      rule_name: rule.rule_name,
      category: rule.category,
      status: 'FAIL',
      detected_value: 'Missing on imported package',
      issue: 'Mandatory Country of Origin declaration is absent on an imported commodity.',
      explanation: 'Rule 6(1)(aa) mandates that every imported package must explicitly declare the country of manufacture or assembly.',
      recommendation: 'Affix origin statement (e.g., "Country of Origin: [Country]") prior to retail distribution.',
      evidence: { snippet: 'Imported product without statutory origin declaration' },
      source_images: [],
      confidence: 0.9,
      legal_reference: rule.legal_reference,
      legal_source: rule.legal_source,
      statutory_penalty_ref: rule.statutory_penalty_ref
    };
  }

  // Domestic package where manufacturer address implies India
  if (decl.manufacturer_address?.value && decl.manufacturer_address.value.toLowerCase().includes('india')) {
    return {
      rule_id: rule.rule_id,
      rule_name: rule.rule_name,
      category: rule.category,
      status: 'PASS',
      detected_value: 'Domestic (Manufactured in India)',
      issue: null,
      explanation: 'Domestic origin established via full manufacturer address in India.',
      recommendation: 'Optionally add explicit "Made in India" label.',
      evidence: {
        snippet: decl.manufacturer_address.value,
        source_side: 'back',
        confidence: 0.85
      },
      source_images: [],
      confidence: 0.88,
      legal_reference: rule.legal_reference,
      legal_source: rule.legal_source,
      statutory_penalty_ref: rule.statutory_penalty_ref
    };
  }

  return {
    rule_id: rule.rule_id,
    rule_name: rule.rule_name,
    category: rule.category,
    status: isMultiPanel ? 'WARNING' : 'NOT_DETERMINABLE',
    detected_value: 'Not explicitly declared',
    issue: 'Country of Origin is not explicitly declared.',
    explanation: 'Under current Legal Metrology regulations, explicit Country of Origin declaration is best practice for all packaged commodities.',
    recommendation: 'Declare "Made in India" or the respective country of origin.',
    evidence: { snippet: 'No explicit COO text located' },
    source_images: [],
    confidence: 0.75,
    legal_reference: rule.legal_reference,
    legal_source: rule.legal_source,
    statutory_penalty_ref: rule.statutory_penalty_ref
  };
}

function evaluateUnitSalePriceRule(
  decl: ExtractedDeclarations,
  sides: PackageSide[],
  isMultiPanel: boolean
): RuleEvaluation {
  const rule = LEGAL_RULES.find(r => r.rule_id === 'LMPC-R06-USP')!;
  const usp = decl.unit_sale_price?.value;
  const qtyVal = decl.quantity_value?.value;
  const qtyUnit = (decl.quantity_unit?.value || '').toLowerCase();

  // Check if package is > 1kg or > 1L or multi-piece
  const isLargePackage = (qtyVal !== null && qtyVal !== undefined) && 
    ((qtyUnit === 'kg' && qtyVal >= 1) || (qtyUnit === 'l' && qtyVal >= 1) || (qtyUnit === 'g' && qtyVal >= 1000) || (qtyUnit === 'ml' && qtyVal >= 1000));

  if (usp && usp.length > 0) {
    return {
      rule_id: rule.rule_id,
      rule_name: rule.rule_name,
      category: rule.category,
      status: 'PASS',
      detected_value: usp,
      issue: null,
      explanation: `Unit Sale Price declared as "${usp}" per Rule 6(11) Amendment.`,
      recommendation: 'Ensure USP is calculated accurately to two decimal places.',
      evidence: {
        snippet: usp,
        source_side: 'back',
        confidence: 0.9
      },
      source_images: [],
      confidence: 0.92,
      legal_reference: rule.legal_reference,
      legal_source: rule.legal_source,
      statutory_penalty_ref: rule.statutory_penalty_ref
    };
  }

  if (isLargePackage) {
    if (!isMultiPanel) {
      return {
        rule_id: rule.rule_id,
        rule_name: rule.rule_name,
        category: rule.category,
        status: 'NOT_DETERMINABLE',
        detected_value: 'Unverified on single panel',
        issue: 'Large package (>1 kg/L) detected. USP required under Rule 6(11) but not verified on current panel.',
        explanation: 'Unit Sale Price must appear alongside MRP for commodities weighing 1 kg/L or more.',
        recommendation: 'Upload panel adjacent to MRP to check Unit Sale Price.',
        evidence: { snippet: 'Large package quantity detected without visible USP' },
        source_images: [],
        confidence: 0.6,
        legal_reference: rule.legal_reference,
        legal_source: rule.legal_source,
        statutory_penalty_ref: rule.statutory_penalty_ref
      };
    }

    return {
      rule_id: rule.rule_id,
      rule_name: rule.rule_name,
      category: rule.category,
      status: 'WARNING',
      detected_value: 'Not detected on package',
      issue: 'Unit Sale Price (USP) not found on a package of net quantity >= 1 kg/L.',
      explanation: 'Rule 6(11) requires USP declaration in Rs. per g/kg/ml/l on packages above 1 kg or 1 liter.',
      recommendation: 'Print Unit Sale Price (e.g. "₹0.45 per g" or "₹450 per kg") adjacent to MRP.',
      evidence: { snippet: 'No USP declaration detected' },
      source_images: [],
      confidence: 0.8,
      legal_reference: rule.legal_reference,
      legal_source: rule.legal_source,
      statutory_penalty_ref: rule.statutory_penalty_ref
    };
  }

  // Small package where USP is not mandatory
  return {
    rule_id: rule.rule_id,
    rule_name: rule.rule_name,
    category: rule.category,
    status: 'NOT_APPLICABLE',
    detected_value: 'Exempt / Not Mandatory for small unit packaging',
    issue: null,
    explanation: 'Commodity quantity is below 1 kg/L threshold where mandatory Unit Sale Price declaration is enforced.',
    recommendation: 'USP optional for packages containing less than 1 kg or 1 liter.',
    evidence: { snippet: 'Package size below mandatory USP threshold' },
    source_images: [],
    confidence: 0.9,
    legal_reference: rule.legal_reference,
    legal_source: rule.legal_source,
    statutory_penalty_ref: rule.statutory_penalty_ref
  };
}

function evaluateDisplayPanelRule(
  decl: ExtractedDeclarations,
  images: InspectionImage[]
): RuleEvaluation {
  const rule = LEGAL_RULES.find(r => r.rule_id === 'LMPC-R08-PDP')!;
  const unreadableCount = decl.unreadable_declarations?.length || 0;
  const hasBlurryImage = images.some(img => img.quality && !img.quality.isAcceptable);

  if (unreadableCount > 2 || hasBlurryImage) {
    return {
      rule_id: rule.rule_id,
      rule_name: rule.rule_name,
      category: rule.category,
      status: 'WARNING',
      detected_value: `${unreadableCount} low-legibility or obscured region(s) detected`,
      issue: 'Certain declarations appear degraded, smudged, or lack adequate contrast against background.',
      explanation: 'Rule 7 & 8 mandate that all declarations must be clearly legible and presented in prominent contrast with the background.',
      recommendation: 'Ensure high color contrast and minimum statutory font heights as per Second Schedule.',
      evidence: { snippet: decl.unreadable_declarations?.join(', ') || 'Low contrast/blur detected' },
      source_images: [],
      confidence: 0.78,
      legal_reference: rule.legal_reference,
      legal_source: rule.legal_source,
      statutory_penalty_ref: rule.statutory_penalty_ref
    };
  }

  return {
    rule_id: rule.rule_id,
    rule_name: rule.rule_name,
    category: rule.category,
    status: 'PASS',
    detected_value: 'Declarations legible & well-contrasted',
    issue: null,
    explanation: 'Principal display panel declarations satisfy visual contrast and legibility parameters.',
    recommendation: 'Maintain minimum numeral height according to package area.',
    evidence: { snippet: 'All visible panels meet optical clarity requirements' },
    source_images: [],
    confidence: 0.9,
    legal_reference: rule.legal_reference,
    legal_source: rule.legal_source,
    statutory_penalty_ref: rule.statutory_penalty_ref
  };
}

function evaluateExpiryDateRule(
  decl: ExtractedDeclarations,
  isFoodOrCosmetic: boolean,
  sides: PackageSide[],
  isMultiPanel: boolean
): RuleEvaluation {
  const rule = LEGAL_RULES.find(r => r.rule_id === 'LMPC-R06-EXP')!;
  const exp = decl.expiry_date?.value;
  const bb = decl.best_before?.value;
  const expVal = exp || bb;

  if (expVal && expVal.length > 0) {
    return {
      rule_id: rule.rule_id,
      rule_name: rule.rule_name,
      category: rule.category,
      status: 'PASS',
      detected_value: expVal,
      issue: null,
      explanation: `Expiry / Best Before declaration "${expVal}" is present and compliant.`,
      recommendation: 'Ensure format matches standard Month/Year or Day/Month/Year conventions.',
      evidence: {
        snippet: expVal,
        source_side: 'back',
        confidence: 0.92
      },
      source_images: [],
      confidence: 0.94,
      legal_reference: rule.legal_reference,
      legal_source: rule.legal_source,
      statutory_penalty_ref: rule.statutory_penalty_ref
    };
  }

  if (isFoodOrCosmetic) {
    if (!isMultiPanel) {
      return {
        rule_id: rule.rule_id,
        rule_name: rule.rule_name,
        category: rule.category,
        status: 'NOT_DETERMINABLE',
        detected_value: 'Not visible in single submitted panel',
        issue: 'Food/Cosmetic category detected. Expiry / Best Before is mandatory but not visible.',
        explanation: 'Perishable products mandate clear Best Before or Expiry dates under Rule 6(1)(e) Proviso.',
        recommendation: 'Upload the back, top, or crimp panel where expiry date is stamped.',
        evidence: { snippet: 'Food/Cosmetic category without visible date on submitted panel' },
        source_images: [],
        confidence: 0.6,
        legal_reference: rule.legal_reference,
        legal_source: rule.legal_source,
        statutory_penalty_ref: rule.statutory_penalty_ref
      };
    }

    return {
      rule_id: rule.rule_id,
      rule_name: rule.rule_name,
      category: rule.category,
      status: 'FAIL',
      detected_value: 'Missing on perishable/consumable commodity',
      issue: 'Mandatory Expiry / Best Before declaration is missing on a consumable package.',
      explanation: 'Commodities prone to spoilage or degradation must bear Best Before or Use By date under Metrology and food safety regulations.',
      recommendation: 'Print clear "Best Before" or "Expiry Date" on packaging prior to sale.',
      evidence: { snippet: 'No expiry date found on food/cosmetic item' },
      source_images: [],
      confidence: 0.88,
      legal_reference: rule.legal_reference,
      legal_source: rule.legal_source,
      statutory_penalty_ref: rule.statutory_penalty_ref
    };
  }

  return {
    rule_id: rule.rule_id,
    rule_name: rule.rule_name,
    category: rule.category,
    status: 'NOT_APPLICABLE',
    detected_value: 'Non-perishable commodity',
    issue: null,
    explanation: 'Expiry / Best Before date is not statutory for non-perishable general merchandise.',
    recommendation: 'Not required for durable non-consumable goods.',
    evidence: { snippet: 'General non-food durable goods category' },
    source_images: [],
    confidence: 0.95,
    legal_reference: rule.legal_reference,
    legal_source: rule.legal_source,
    statutory_penalty_ref: rule.statutory_penalty_ref
  };
}

function calculateComplianceScore(evaluations: RuleEvaluation[]): ComplianceScore {
  let passCount = 0;
  let failCount = 0;
  let warningCount = 0;
  let notDeterminableCount = 0;
  let notApplicableCount = 0;

  evaluations.forEach(ev => {
    switch (ev.status) {
      case 'PASS': passCount++; break;
      case 'FAIL': failCount++; break;
      case 'WARNING': warningCount++; break;
      case 'NOT_DETERMINABLE': notDeterminableCount++; break;
      case 'NOT_APPLICABLE': notApplicableCount++; break;
    }
  });

  const activeRulesCount = passCount + failCount + warningCount;
  
  let score = 100;
  if (activeRulesCount > 0) {
    const penalty = (failCount * 30) + (warningCount * 10);
    score = Math.max(0, Math.min(100, Math.round(100 - (penalty / (activeRulesCount + failCount * 0.5)) * 1.2)));
  } else if (notDeterminableCount > 0 && passCount === 0) {
    score = 0;
  }

  const formulaExplanation = `Base 100 - (Violations: ${failCount} × 30 pts) - (Warnings: ${warningCount} × 10 pts) normalized against ${activeRulesCount} evaluated rules. (Inspections with unresolved sides are marked NOT_DETERMINABLE and do not inflate score).`;

  return {
    score,
    formulaExplanation,
    passCount,
    failCount,
    warningCount,
    notDeterminableCount,
    notApplicableCount,
    totalRulesEvaluated: evaluations.length
  };
}

function calculateAssessmentConfidence(
  images: InspectionImage[],
  decl: ExtractedDeclarations,
  evaluations: RuleEvaluation[]
): { confidence: AssessmentConfidence; confidenceScore: number; confidenceReasons: string[] } {
  const reasons: string[] = [];
  let baseScore = 50;

  const distinctSides = new Set(images.map(img => img.side)).size;
  if (distinctSides >= 3) {
    baseScore += 30;
    reasons.push(`Comprehensive package coverage: ${distinctSides} distinct panels submitted.`);
  } else if (distinctSides === 2) {
    baseScore += 15;
    reasons.push(`Partial package coverage: 2 panels submitted.`);
  } else {
    baseScore -= 20;
    reasons.push(`Single panel submission: Only 1 side uploaded; missing sides lower certainty.`);
  }

  const avgExtractionConf = decl.overall_extraction_confidence || 0.8;
  if (avgExtractionConf >= 0.85) {
    baseScore += 15;
    reasons.push(`High AI optical extraction confidence (${Math.round(avgExtractionConf * 100)}%).`);
  } else if (avgExtractionConf < 0.6) {
    baseScore -= 15;
    reasons.push(`Moderate/low text extraction certainty.`);
  }

  const notDetCount = evaluations.filter(e => e.status === 'NOT_DETERMINABLE').length;
  if (notDetCount > 2) {
    baseScore -= 20;
    reasons.push(`${notDetCount} rules could not be determined due to missing package panels.`);
  }

  const clampedScore = Math.max(10, Math.min(100, baseScore));

  let confidence: AssessmentConfidence = 'HIGH';
  if (clampedScore < 50) {
    confidence = 'LOW';
  } else if (clampedScore < 80) {
    confidence = 'MEDIUM';
  }

  return {
    confidence,
    confidenceScore: clampedScore,
    confidenceReasons: reasons
  };
}
