import React, { useState } from 'react';
import { Inspection, ImprovementNotice } from '../types';
import { FileWarning, Printer, Copy, Check, X, ShieldAlert, Scale } from 'lucide-react';

interface NoticeDraftModalProps {
  inspection: Inspection;
  notice: ImprovementNotice;
  onClose: () => void;
}

export const NoticeDraftModal: React.FC<NoticeDraftModalProps> = ({
  inspection,
  notice,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = `
GOVERNMENT OF INDIA
OFFICE OF THE CONTROLLER OF LEGAL METROLOGY
DEPARTMENT OF CONSUMER AFFAIRS

NOTICE UNDER SECTION 18 / 36(1) OF THE LEGAL METROLOGY ACT, 2009
READ WITH LEGAL METROLOGY (PACKAGED COMMODITIES) RULES, 2011

Notice Reference: ${notice.noticeNumber}
Date: ${notice.date}

TO:
${notice.entityName}
${notice.entityAddress}

SUBJECT: NOTICE FOR STATUTORY NON-COMPLIANCE IN PRE-PACKAGED COMMODITY

1. Product Inspected: ${notice.productName}
2. Batch / Lot Reference: ${notice.batchNumber}
3. Inspection Reference ID: ${inspection.id}

FINDINGS & SPECIFIC NON-COMPLIANCES:
${notice.issues
  .map(
    (issue, i) => `
${i + 1}. [${issue.ruleId}] ${issue.ruleTitle}
   Legal Reference: ${issue.legalReference}
   Violation Details: ${issue.violationDetails}
   Remedy Required: ${issue.remedyRequirement}
   Statutory Timeframe: ${issue.statutoryDeadlineDays} days
`
  )
  .join('\n')}

STATUTORY DIRECTIVE:
You are hereby directed to show cause within ${
      notice.issues[0]?.statutoryDeadlineDays || 15
    } days from the receipt of this notice why appropriate penal proceedings under Section 36(1) of the Legal Metrology Act, 2009 should not be initiated against your enterprise.

${notice.disclaimer}
`;

    navigator.clipboard.writeText(text.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex justify-center p-4 sm:p-6 print:p-0 print:bg-white">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden border border-slate-200 print:border-none print:shadow-none my-auto">
        {/* Header Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <Scale className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-sm sm:text-base">
              Statutory Improvement Notice (Draft Preparation)
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-1.5 rounded transition-colors border border-slate-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Notice Text'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Draft</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notice Content */}
        <div className="p-8 sm:p-10 space-y-6 text-slate-800 font-serif print:p-0">
          {/* Draft Watermark Warning */}
          <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r text-xs font-sans text-amber-900">
            <div className="flex items-center space-x-2 font-bold uppercase tracking-wider mb-1 text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>{notice.draftStatus.replace(/_/g, ' ')}</span>
            </div>
            <p className="text-[11px] leading-relaxed">{notice.disclaimer}</p>
          </div>

          {/* Letterhead */}
          <div className="text-center space-y-1 border-b border-slate-300 pb-4">
            <h2 className="text-lg font-bold uppercase tracking-wider text-slate-900">
              Office of the Controller of Legal Metrology
            </h2>
            <h3 className="text-sm font-semibold text-slate-700">
              Department of Consumer Affairs, Government of India
            </h3>
            <p className="text-xs text-slate-500 font-sans">
              Statutory Enforcement Directorate | Legal Metrology Act, 2009
            </p>
          </div>

          {/* Metadata Rows */}
          <div className="flex justify-between items-start text-xs font-sans text-slate-700 border-b border-slate-200 pb-3">
            <div>
              <span className="font-bold text-slate-900">Ref No: </span>
              <span className="font-mono font-semibold text-slate-800">{notice.noticeNumber}</span>
            </div>
            <div>
              <span className="font-bold text-slate-900">Date: </span>
              <span>{notice.date}</span>
            </div>
          </div>

          {/* Recipient Address */}
          <div className="text-xs space-y-1 font-sans">
            <span className="font-bold text-slate-900 uppercase">To,</span>
            <div className="font-bold text-slate-800">{notice.entityName}</div>
            <div className="text-slate-600 whitespace-pre-line">{notice.entityAddress}</div>
          </div>

          {/* Subject Line */}
          <div className="bg-slate-100 p-2.5 rounded font-sans text-xs font-bold text-slate-900 border-l-2 border-slate-800">
            SUBJECT: STATUTORY RECTIFICATION NOTICE UNDER SECTION 18 READ WITH SECTION 36(1) OF THE LEGAL METROLOGY ACT, 2009 FOR PACKAGED COMMODITY VIOLATIONS
          </div>

          {/* Body Paragraphs */}
          <div className="space-y-4 text-xs leading-relaxed text-slate-800 font-sans">
            <p>
              WHEREAS an inspection of pre-packaged commodity bearing product name{' '}
              <strong className="text-slate-900 font-bold font-serif">"{notice.productName}"</strong> (Batch No.{' '}
              <span className="font-mono">{notice.batchNumber}</span>) was conducted under Inspection Reference No.{' '}
              <span className="font-mono font-semibold">{inspection.id}</span>;
            </p>

            <p>
              AND WHEREAS photographic evidence and optical compliance assessment revealed prima facie non-conformances with the mandatory statutory declaration requirements under the Legal Metrology (Packaged Commodities) Rules, 2011:
            </p>

            {/* List of Specific Violations */}
            <div className="space-y-3 pl-2 border-l-2 border-rose-400">
              {notice.issues.map((issue, idx) => (
                <div key={issue.ruleId} className="space-y-1">
                  <div className="font-bold text-rose-900 flex items-center space-x-2">
                    <span>{idx + 1}. {issue.ruleTitle}</span>
                    <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-mono">
                      {issue.ruleId}
                    </span>
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    <strong>Statutory Reference:</strong> {issue.legalReference}
                  </div>
                  <div className="text-slate-800 text-[11px]">
                    <strong>Finding:</strong> {issue.violationDetails}
                  </div>
                  <div className="text-emerald-900 text-[11px] bg-emerald-50 p-1.5 rounded border border-emerald-200">
                    <strong>Remedy Mandate:</strong> {issue.remedyRequirement} (Rectification Timeline: {issue.statutoryDeadlineDays} days)
                  </div>
                </div>
              ))}
            </div>

            <p>
              NOW, THEREFORE, you are called upon to submit your written explanation along with verified rectification evidence within{' '}
              <strong>{notice.issues[0]?.statutoryDeadlineDays || 15} days</strong> from the receipt of this communication, failing which legal proceedings under Section 36(1) of the Legal Metrology Act, 2009 will be initiated without further notice.
            </p>
          </div>

          {/* Signatures */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-xs font-sans border-t border-slate-300">
            <div>
              <div className="border-b border-slate-400 h-8 w-44 mb-1"></div>
              <span className="font-bold text-slate-800 block">{notice.inspectorName}</span>
              <span className="text-[10px] text-slate-500">{notice.inspectorDesignation}</span>
            </div>
            <div className="text-right">
              <div className="border-b border-slate-400 h-8 w-44 ml-auto mb-1"></div>
              <span className="font-bold text-slate-800 block">Enforcement Section Officer</span>
              <span className="text-[10px] text-slate-500">{notice.issuingAuthority}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
