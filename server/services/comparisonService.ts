import { Inspection, DigitalListing, ComparisonResult, ComparisonItem, ComparisonStatus } from '../../src/types';

export function comparePackageWithDigitalListing(
  inspection: Inspection,
  listing: DigitalListing
): ComparisonResult {
  const decl = inspection.result?.extractedDeclarations;
  const items: ComparisonItem[] = [];

  // Helper comparator
  const cleanStr = (s?: string | null) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();

  // 1. Product Name
  const pkgProdName = decl?.product_name?.value || inspection.productName || '';
  const listProdName = listing.title || '';
  items.push(compareField('product_name', 'Product Name / Title', pkgProdName, listProdName));

  // 2. Brand
  const pkgBrand = decl?.brand?.value || inspection.brand || '';
  const listBrand = listing.brand || '';
  items.push(compareField('brand', 'Brand Declaration', pkgBrand, listBrand));

  // 3. Net Quantity
  const pkgQty = decl?.net_quantity?.value || '';
  const listQty = listing.netQuantity || '';
  items.push(compareQuantity(pkgQty, listQty));

  // 4. Maximum Retail Price (MRP)
  const pkgMRP = decl?.mrp?.value || '';
  const listMRP = listing.mrp || '';
  items.push(compareMRP(pkgMRP, listMRP));

  // 5. Manufacturer / Packer Details
  const pkgMfg = decl?.manufacturer_name?.value || decl?.packer_name?.value || '';
  const listMfg = listing.manufacturerDetails || listing.sellerDetails || '';
  items.push(compareField('manufacturer', 'Manufacturer / Seller Entity', pkgMfg, listMfg));

  // 6. Country of Origin
  const pkgCOO = decl?.country_of_origin?.value || '';
  const listCOO = listing.countryOfOrigin || '';
  items.push(compareField('country_of_origin', 'Country of Origin', pkgCOO, listCOO));

  // Calculate statistics
  let evaluatedCount = 0;
  let matchesCount = 0;
  let mismatchesCount = 0;

  items.forEach(item => {
    if (item.status === 'MATCH') {
      evaluatedCount++;
      matchesCount++;
    } else if (item.status === 'MISMATCH') {
      evaluatedCount++;
      mismatchesCount++;
    }
  });

  const matchRate = evaluatedCount > 0 ? Math.round((matchesCount / evaluatedCount) * 100) : 0;
  
  let overallStatus: ComparisonResult['overallStatus'] = 'CONSISTENT';
  let summary = 'Digital listing declarations align consistently with physical packaging declarations.';

  if (mismatchesCount > 0) {
    overallStatus = 'DISCREPANCY_DETECTED';
    summary = `${mismatchesCount} statutory discrepancy(ies) detected between e-commerce listing and physical packaging declarations. Potential violation of E-Commerce Metrology rules.`;
  } else if (evaluatedCount === 0) {
    overallStatus = 'INSUFFICIENT_DATA';
    summary = 'Insufficient listing details provided to execute full cross-verification.';
  }

  return {
    listing,
    items,
    matchRate,
    overallStatus,
    summary,
    comparedAt: new Date().toISOString()
  };
}

function compareField(
  field: string,
  label: string,
  pkgVal: string,
  listVal: string
): ComparisonItem {
  if (!pkgVal && !listVal) {
    return {
      field,
      label,
      packageValue: 'Not Declared',
      listingValue: 'Not Provided',
      status: 'NOT_AVAILABLE',
      discrepancyNote: 'Field neither extracted from packaging nor provided in digital listing.'
    };
  }

  if (!pkgVal) {
    return {
      field,
      label,
      packageValue: 'Not Detected on Package',
      listingValue: listVal,
      status: 'UNABLE_TO_DETERMINE',
      discrepancyNote: 'Missing physical package evidence to cross-verify against digital listing.'
    };
  }

  if (!listVal) {
    return {
      field,
      label,
      packageValue: pkgVal,
      listingValue: 'Not Listed Online',
      status: 'NOT_AVAILABLE',
      discrepancyNote: 'Mandatory declaration appears on physical package but omitted from e-commerce listing.'
    };
  }

  const pClean = pkgVal.toLowerCase().replace(/[^a-z0-9]/g, '');
  const lClean = listVal.toLowerCase().replace(/[^a-z0-9]/g, '');

  const isMatch = pClean.includes(lClean) || lClean.includes(pClean) || pClean === lClean;

  return {
    field,
    label,
    packageValue: pkgVal,
    listingValue: listVal,
    status: isMatch ? 'MATCH' : 'MISMATCH',
    discrepancyNote: isMatch ? undefined : `Value mismatch: Packaging indicates "${pkgVal}", while digital listing claims "${listVal}".`
  };
}

function compareQuantity(pkgQty: string, listQty: string): ComparisonItem {
  if (!pkgQty || !listQty) {
    return compareField('net_quantity', 'Net Quantity', pkgQty, listQty);
  }

  const pNums = pkgQty.replace(/[^0-9.]/g, '');
  const lNums = listQty.replace(/[^0-9.]/g, '');

  const pUnit = pkgQty.replace(/[0-9.\s]/g, '').toLowerCase();
  const lUnit = listQty.replace(/[0-9.\s]/g, '').toLowerCase();

  const isMatch = pNums === lNums && (pUnit === lUnit || pUnit.includes(lUnit) || lUnit.includes(pUnit));

  return {
    field: 'net_quantity',
    label: 'Net Quantity',
    packageValue: pkgQty,
    listingValue: listQty,
    status: isMatch ? 'MATCH' : 'MISMATCH',
    discrepancyNote: isMatch
      ? undefined
      : `Net quantity discrepancy: Package specifies "${pkgQty}", while listing states "${listQty}". Risk of deceptive product listing under Rule 6(1)(d).`
  };
}

function compareMRP(pkgMRP: string, listMRP: string): ComparisonItem {
  if (!pkgMRP || !listMRP) {
    return compareField('mrp', 'Maximum Retail Price (MRP)', pkgMRP, listMRP);
  }

  const pNums = parseFloat(pkgMRP.replace(/[^0-9.]/g, '') || '0');
  const lNums = parseFloat(listMRP.replace(/[^0-9.]/g, '') || '0');

  // If listing price is higher than package printed MRP => statutory violation!
  if (lNums > pNums && pNums > 0) {
    return {
      field: 'mrp',
      label: 'Maximum Retail Price (MRP)',
      packageValue: pkgMRP,
      listingValue: listMRP,
      status: 'MISMATCH',
      discrepancyNote: `SEVERE: Digital listing price (₹${lNums}) exceeds printed package MRP (₹${pNums}). Overcharging beyond printed MRP violates Section 36(1) of Legal Metrology Act, 2009.`
    };
  }

  const isMatch = Math.abs(pNums - lNums) < 0.01;

  return {
    field: 'mrp',
    label: 'Maximum Retail Price (MRP)',
    packageValue: pkgMRP,
    listingValue: listMRP,
    status: isMatch ? 'MATCH' : 'MISMATCH',
    discrepancyNote: isMatch
      ? undefined
      : `Price difference: Package MRP "${pkgMRP}" vs Listing Price "${listMRP}".`
  };
}
