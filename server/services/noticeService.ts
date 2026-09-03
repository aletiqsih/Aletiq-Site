import { Inspection, ImprovementNotice } from '../../src/types';

export function generateImprovementNoticeDraft(inspection: Inspection): ImprovementNotice {
  const result = inspection.result;
  const decl = result?.extractedDeclarations;

  const entityName = decl?.manufacturer_name?.value || decl?.packer_name?.value || decl?.importer_name?.value || 'The Concerned Packaged Commodity Manufacturer / Packer / Importer';
  const entityAddress = decl?.manufacturer_address?.value || decl?.packer_address?.value || decl?.importer_address?.value || 'Address as per retail distribution records';
  const productName = inspection.productName || decl?.product_name?.value || 'Pre-packaged Commodity';

  const issues: ImprovementNotice['issues'] = [];
  const statutoryReferences: Set<string> = new Set([
    'Legal Metrology Act, 2009 (Act No. 1 of 2010)',
    'Legal Metrology (Packaged Commodities) Rules, 2011 (as amended)'
  ]);

  if (result) {
    result.evaluations.forEach(ev => {
      if (ev.status === 'FAIL' || ev.status === 'WARNING') {
        issues.push({
          ruleId: ev.rule_id,
          ruleTitle: ev.rule_name,
          legalReference: ev.legal_reference,
          violationDetails: ev.issue || ev.explanation,
          statutoryDeadlineDays: 15,
          remedyRequirement: ev.recommendation
        });
        if (ev.legal_reference) {
          statutoryReferences.add(ev.legal_reference);
        }
      }
    });
  }

  // If no violations found
  if (issues.length === 0) {
    issues.push({
      ruleId: 'LMPC-GEN-COMP',
      ruleTitle: 'General Compliance Verification',
      legalReference: 'Section 18, Legal Metrology Act, 2009',
      violationDetails: 'No non-compliances were confirmed in the submitted panels. Continue adherence to statutory declaration guidelines.',
      statutoryDeadlineDays: 30,
      remedyRequirement: 'Maintain compliance records and verify periodic batch certifications.'
    });
  }

  const noticeNumber = `ALETIQ/LMD-SIH/2026/INSP-${inspection.id.replace('INSP-', '')}`;

  return {
    noticeNumber,
    date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
    inspectorName: inspection.inspectorName || 'Authorized Legal Metrology Inspector',
    inspectorDesignation: 'Inspector of Legal Metrology (Enforcement)',
    issuingAuthority: 'Office of the Controller of Legal Metrology, Department of Consumer Affairs',
    entityName,
    entityAddress,
    productName,
    batchNumber: inspection.batchNumber || 'Batch / Lot No. as inspected',
    issues,
    statutoryReferences: Array.from(statutoryReferences),
    draftStatus: 'DRAFT_NOT_OFFICIAL',
    disclaimer: 'DRAFT FOR INSPECTION RECORDS & REMEDIATION NOTICE PREPARATION. THIS AI-GENERATED WORKFLOW AID IS NOT AN AUTOMATED ENFORCEMENT ORDER. OFFICIAL ORDERS REQUIRE AUTHORIZED SIGNATURE OF THE DESIGNATED CONTROLLER UNDER THE LEGAL METROLOGY ACT, 2009.'
  };
}
