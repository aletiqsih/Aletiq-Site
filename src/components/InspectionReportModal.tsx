import React from 'react';
import { Inspection } from '../types';
import { StatusBadge } from './StatusBadge';
import { Printer, Download, X, Shield, FileText, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

interface InspectionReportModalProps {
  inspection: Inspection;
  onClose: () => void;
}

export const InspectionReportModal: React.FC<InspectionReportModalProps> = ({
  inspection,
  onClose,
}) => {
  const result = inspection.result;
  const decl = result?.extractedDeclarations;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex justify-center p-4 sm:p-6 print:p-0 print:bg-white">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden border border-slate-200 print:border-none print:shadow-none my-auto">
        {/* Modal Controls (Hidden in Print) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-sm sm:text-base">
              Statutory Inspection Assessment Report
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Body */}
        <div className="p-8 sm:p-10 space-y-6 text-slate-800 font-sans print:p-0">
          {/* Government / Department Header */}
          <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
            <div className="flex justify-center items-center space-x-2 mb-1">
              <Shield className="w-7 h-7 text-slate-900" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-slate-900">
              Department of Consumer Affairs
            </h1>
            <h2 className="text-sm font-bold text-slate-700">
              Legal Metrology Division — Packaged Commodities Enforcement Unit
            </h2>
            <p className="text-xs text-slate-500">
              Statutory Compliance Assessment under Legal Metrology Act, 2009 & LMPC Rules, 2011 (Amended)
            </p>
          </div>

          {/* Document Reference Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block">Inspection ID:</span>
              <span className="font-mono font-bold text-slate-900">{inspection.id}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Inspection Date:</span>
              <span className="font-medium text-slate-900">
                {new Date(inspection.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Inspecting Officer:</span>
              <span className="font-medium text-slate-900">{inspection.inspectorName || 'Senior Legal Metrology Officer'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Zonal Station:</span>
              <span className="font-medium text-slate-900">{inspection.inspectorLocation || 'Central Directorate'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Product Brand:</span>
              <span className="font-bold text-slate-900">{inspection.brand || decl?.brand?.value || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Product Commodity:</span>
              <span className="font-bold text-slate-900">{inspection.productName || decl?.product_name?.value || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Batch / Lot No.:</span>
              <span className="font-mono text-slate-900">{inspection.batchNumber || 'As Inspected'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Sampling Location:</span>
              <span className="text-slate-900">{inspection.retailerName || 'Retail Sample Verification'}</span>
            </div>
          </div>

          {/* Executive Compliance Determination Banner */}
          {result && (
            <div className="border border-slate-300 rounded-lg p-4 bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                    Executive Finding
                  </span>
                  <div className="mt-1 flex items-center space-x-3">
                    <StatusBadge status={result.overallStatus} size="lg" />
                    <span className="text-xs font-semibold text-slate-600">
                      Compliance Score: {result.score.score}/100
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
                    <span className="text-emerald-800 font-bold block">{result.score.passCount}</span>
                    <span className="text-[10px] text-emerald-700">Passed</span>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 px-2 py-1 rounded">
                    <span className="text-rose-800 font-bold block">{result.score.failCount}</span>
                    <span className="text-[10px] text-rose-700">Failed</span>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                    <span className="text-amber-800 font-bold block">{result.score.warningCount}</span>
                    <span className="text-[10px] text-amber-700">Warnings</span>
                  </div>
                  <div className="bg-slate-100 border border-slate-200 px-2 py-1 rounded">
                    <span className="text-slate-800 font-bold block">{result.score.notDeterminableCount}</span>
                    <span className="text-[10px] text-slate-600">Unresolved</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submitted Photographic Evidence */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              1. Photographic Evidence ({inspection.images.length} Panels Verified)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {inspection.images.map((img, idx) => (
                <div key={img.id} className="border border-slate-200 rounded p-1.5 bg-slate-50 text-center">
                  <div className="h-28 bg-slate-200 rounded overflow-hidden flex items-center justify-center mb-1">
                    <img
                      src={img.url}
                      alt={`Panel ${idx + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="text-[10px] font-bold uppercase text-slate-700">
                    {img.side} Panel
                  </span>
                  <span className="text-[9px] text-slate-500 block">
                    Quality: {img.quality?.blurScore || 85}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Statutory Rule Evaluation Table */}
          {result && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                2. Legal Metrology Statutory Rule Assessments
              </h3>
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-300">
                    <tr>
                      <th className="p-2.5 font-bold">Rule ID & Subject</th>
                      <th className="p-2.5 font-bold">Statutory Reference</th>
                      <th className="p-2.5 font-bold">Status</th>
                      <th className="p-2.5 font-bold">Finding & Optical Evidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {result.evaluations.map((ev) => (
                      <tr key={ev.rule_id} className={ev.status === 'FAIL' ? 'bg-rose-50/50' : ''}>
                        <td className="p-2.5 font-medium">
                          <span className="font-bold text-slate-900 block">{ev.rule_name}</span>
                          <span className="text-[10px] font-mono text-slate-500">{ev.rule_id}</span>
                        </td>
                        <td className="p-2.5 text-slate-600">
                          <span>{ev.legal_reference}</span>
                        </td>
                        <td className="p-2.5">
                          <StatusBadge status={ev.status} size="sm" />
                        </td>
                        <td className="p-2.5 text-slate-700">
                          <div>
                            <span className="font-semibold text-slate-900">Detected: </span>
                            <span>{ev.detected_value || 'None'}</span>
                          </div>
                          {ev.issue && (
                            <div className="text-rose-700 text-[11px] font-medium mt-0.5">
                              Issue: {ev.issue}
                            </div>
                          )}
                          {ev.evidence?.snippet && (
                            <div className="text-[10px] text-slate-500 italic mt-0.5">
                              Evidence: "{ev.evidence.snippet}"
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Enforcement Summary & Action Recommendations */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs space-y-2">
            <h4 className="font-bold text-slate-900">3. Official Inspection Remarks & Action Directive:</h4>
            <p className="text-slate-700 leading-relaxed">
              {result?.overallStatus === 'COMPLIANT'
                ? 'The submitted packaged commodity conforms with statutory declaration standards prescribed under the Legal Metrology (Packaged Commodities) Rules, 2011. No enforcement action warranted at this stage.'
                : result?.overallStatus === 'NON_COMPLIANT'
                ? 'Statutory non-compliances identified in net quantity/MRP/manufacturer declarations. Issue standard statutory Form-A Notice under Section 36(1) of the Legal Metrology Act, 2009 granting 15 days remediation time.'
                : 'Partial packaging panel evidence provided. Physical re-inspection or multi-panel submission recommended before closing assessment file.'}
            </p>
          </div>

          {/* Signature Sign-Off Block */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-xs border-t border-slate-300">
            <div>
              <div className="border-b border-slate-400 h-10 w-48 mb-1"></div>
              <span className="font-bold text-slate-800 block">Inspecting Officer Signature</span>
              <span className="text-[10px] text-slate-500">Legal Metrology Inspector (Enforcement)</span>
            </div>
            <div className="text-right">
              <div className="border-b border-slate-400 h-10 w-48 ml-auto mb-1"></div>
              <span className="font-bold text-slate-800 block">Zonal Controller Countersign</span>
              <span className="text-[10px] text-slate-500">Office of the Controller of Legal Metrology</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
