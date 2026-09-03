import React, { useState } from 'react';
import { Inspection, RuleEvaluationStatus, PackageSide } from '../types';
import { StatusBadge } from './StatusBadge';
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  HelpCircle,
  FileText,
  FileWarning,
  Globe,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  CheckCircle2,
  Info,
  Scale,
  Sparkles,
} from 'lucide-react';

interface InspectionDetailViewProps {
  inspection: Inspection;
  onBack: () => void;
  onOpenReport: () => void;
  onOpenNotice: () => void;
  onOpenComparison: () => void;
}

export const InspectionDetailView: React.FC<InspectionDetailViewProps> = ({
  inspection,
  onBack,
  onOpenReport,
  onOpenNotice,
  onOpenComparison,
}) => {
  const result = inspection.result;
  const decl = result?.extractedDeclarations;

  const [ruleFilter, setRuleFilter] = useState<string>('ALL');
  const [selectedImage, setSelectedImage] = useState<string | null>(
    inspection.images[0]?.url || null
  );

  if (!result) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-4">
        <h2 className="text-lg font-bold text-slate-800">Inspection Incomplete</h2>
        <p className="text-sm text-slate-500">
          This inspection record has not completed compliance evaluation yet.
        </p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg"
        >
          Back to Records
        </button>
      </div>
    );
  }

  // Filter rules
  const filteredEvaluations = result.evaluations.filter(ev => {
    if (ruleFilter === 'ALL') return true;
    return ev.status === ruleFilter;
  });

  const sideCoverageCount = new Set(inspection.images.map(img => img.side)).size;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {inspection.productName || inspection.title}
              </h1>
              <span className="font-mono text-xs text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {inspection.id}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {inspection.brand ? `Brand: ${inspection.brand} • ` : ''}
              Assessed on {new Date(inspection.createdAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })} by {inspection.inspectorName || 'Enforcement Officer'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenReport}
            className="inline-flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-semibold px-3 py-2 rounded-lg shadow-xs transition-colors"
          >
            <FileText className="w-4 h-4 text-slate-600" />
            <span>Inspection Report</span>
          </button>

          <button
            onClick={onOpenNotice}
            className="inline-flex items-center space-x-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold px-3 py-2 rounded-lg shadow-xs transition-colors"
          >
            <FileWarning className="w-4 h-4 text-amber-700" />
            <span>Draft Improvement Notice</span>
          </button>

          <button
            onClick={onOpenComparison}
            className="inline-flex items-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 text-xs font-semibold px-3 py-2 rounded-lg shadow-xs transition-colors"
          >
            <Globe className="w-4 h-4 text-indigo-700" />
            <span>E-Commerce Cross-Check</span>
          </button>
        </div>
      </div>

      {/* Executive Compliance Status Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Status & Overall Determination */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Statutory Compliance Outcome
            </span>
            <div className="flex items-center space-x-3">
              <StatusBadge status={result.overallStatus} size="lg" />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {result.overallStatus === 'COMPLIANT'
                ? 'Package satisfies mandatory Legal Metrology declaration standards.'
                : result.overallStatus === 'NON_COMPLIANT'
                ? 'Confirmed non-compliances identified. Remediation notice recommended.'
                : result.overallStatus === 'INSUFFICIENT_EVIDENCE'
                ? 'Incomplete package coverage (missing back/side panels). Requires full submission.'
                : 'Warnings flagged for inspector review.'}
            </p>
          </div>

          {/* Compliance Score & Metrics */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Compliance Score
              </span>
              <span className="text-xs font-mono font-bold text-slate-900">
                {result.score.score}/100
              </span>
            </div>

            {/* Score Bar */}
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden mb-3">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  result.score.score >= 80
                    ? 'bg-emerald-600'
                    : result.score.score >= 50
                    ? 'bg-amber-500'
                    : 'bg-rose-600'
                }`}
                style={{ width: `${Math.max(5, result.score.score)}%` }}
              ></div>
            </div>

            <div className="grid grid-cols-4 gap-1 text-center text-[11px]">
              <div>
                <span className="font-bold text-emerald-700">{result.score.passCount}</span>
                <span className="block text-[10px] text-slate-500">Passed</span>
              </div>
              <div>
                <span className="font-bold text-rose-700">{result.score.failCount}</span>
                <span className="block text-[10px] text-slate-500">Failed</span>
              </div>
              <div>
                <span className="font-bold text-amber-700">{result.score.warningCount}</span>
                <span className="block text-[10px] text-slate-500">Warnings</span>
              </div>
              <div>
                <span className="font-bold text-slate-700">{result.score.notDeterminableCount}</span>
                <span className="block text-[10px] text-slate-500">Unresolved</span>
              </div>
            </div>
          </div>

          {/* Multi-Panel Coverage & Certainty */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Evidence Certainty
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  result.confidence === 'HIGH'
                    ? 'bg-emerald-100 text-emerald-800'
                    : result.confidence === 'MEDIUM'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {result.confidence} CONFIDENCE
              </span>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <div className="flex items-center space-x-1">
                <span className="font-semibold text-slate-800">Panels Submitted:</span>
                <span className="font-medium text-slate-900">{inspection.images.length} images ({sideCoverageCount} sides)</span>
              </div>
              {result.confidenceReasons.map((reason, idx) => (
                <p key={idx} className="text-[11px] text-slate-500 leading-snug">
                  • {reason}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left (Photographs & Extracted Data) & Right (Statutory Rules Matrix) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Cols: Photos & Extracted Declarations */}
        <div className="lg:col-span-5 space-y-6">
          {/* Photographic Evidence Gallery */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ImageIcon className="w-4 h-4 text-slate-700" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Submitted Package Panels ({inspection.images.length})
                </h3>
              </div>
            </div>

            {/* Main Preview Photo */}
            {selectedImage && (
              <div className="aspect-4/3 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative">
                <img
                  src={selectedImage}
                  alt="Selected panel"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            {/* Thumbnail Carousel */}
            <div className="grid grid-cols-3 gap-2">
              {inspection.images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(img.url)}
                  className={`p-1 rounded-md border text-left transition-all ${
                    selectedImage === img.url
                      ? 'border-emerald-600 ring-2 ring-emerald-500/30'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="aspect-square bg-slate-100 rounded overflow-hidden mb-1">
                    <img
                      src={img.url}
                      alt={img.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="text-[10px] font-bold uppercase text-slate-800 block text-center">
                    {img.side}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Extracted Statutory Declarations Card */}
          {decl && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Extracted Package Declarations (OCR)
                </h3>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {Math.round((decl.overall_extraction_confidence || 0.9) * 100)}% Extraction Conf.
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {/* 1. Commodity Name & Brand */}
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Product Title & Brand
                  </span>
                  <div className="font-bold text-slate-900">
                    {decl.product_name?.value || 'Not Extracted'}
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    Brand: <strong>{decl.brand?.value || 'Generic'}</strong> • Category:{' '}
                    <strong>{decl.product_category?.value || 'Packaged Commodity'}</strong>
                  </div>
                </div>

                {/* 2. Manufacturer & Packer */}
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      Manufacturer / Packer Details
                    </span>
                    {decl.manufacturer_name?.sourceSide && (
                      <span className="text-[9px] font-mono uppercase bg-slate-200 text-slate-700 px-1 rounded">
                        {decl.manufacturer_name.sourceSide}
                      </span>
                    )}
                  </div>
                  <div className="font-semibold text-slate-900">
                    {decl.manufacturer_name?.value || decl.packer_name?.value || (
                      <span className="text-rose-600">Not detected in submitted panels</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    {decl.manufacturer_address?.value || decl.packer_address?.value || ''}
                  </div>
                </div>

                {/* 3. Net Quantity */}
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      Net Quantity
                    </span>
                    {decl.net_quantity?.sourceSide && (
                      <span className="text-[9px] font-mono uppercase bg-slate-200 text-slate-700 px-1 rounded">
                        {decl.net_quantity.sourceSide}
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-slate-900 font-mono">
                    {decl.net_quantity?.value || <span className="text-rose-600">Not detected</span>}
                  </div>
                  {decl.unit_sale_price?.value && (
                    <div className="text-[11px] text-slate-600">
                      Unit Sale Price (USP): {decl.unit_sale_price.value}
                    </div>
                  )}
                </div>

                {/* 4. MRP & Taxes */}
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      Maximum Retail Price (MRP)
                    </span>
                    {decl.mrp?.sourceSide && (
                      <span className="text-[9px] font-mono uppercase bg-slate-200 text-slate-700 px-1 rounded">
                        {decl.mrp.sourceSide}
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-slate-900 font-mono">
                    {decl.mrp?.value || <span className="text-rose-600">Not detected</span>}
                  </div>
                </div>

                {/* 5. Dates */}
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Manufacturing & Expiry Dates
                  </span>
                  <div className="text-slate-800 text-[11px]">
                    <strong>Mfg / Packing:</strong> {decl.manufacturing_date?.value || decl.packing_date?.value || 'N/A'} •{' '}
                    <strong>Best Before / Expiry:</strong> {decl.expiry_date?.value || decl.best_before?.value || 'N/A'}
                  </div>
                </div>

                {/* 6. Consumer Care */}
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Consumer Grievance Care Details
                  </span>
                  <div className="text-[11px] text-slate-700">
                    Phone: <strong>{decl.consumer_care_phone?.value || 'None'}</strong> • Email:{' '}
                    <strong>{decl.consumer_care_email?.value || 'None'}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 7 Cols: Statutory Legal Metrology Rule Evaluations Matrix */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Legal Metrology Statutory Rule Checks ({result.evaluations.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Evaluated independently under LMPC Rules, 2011 & Legal Metrology Act, 2009
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg text-[11px] font-medium">
                {['ALL', 'PASS', 'FAIL', 'WARNING', 'NOT_DETERMINABLE'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setRuleFilter(tab)}
                    className={`px-2 py-1 rounded transition-colors ${
                      ruleFilter === tab
                        ? 'bg-white text-slate-900 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab === 'ALL' ? 'All' : tab.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Rule Evaluation Cards */}
            <div className="space-y-3">
              {filteredEvaluations.map((ev) => (
                <div
                  key={ev.rule_id}
                  className={`p-4 rounded-xl border transition-all ${
                    ev.status === 'FAIL'
                      ? 'bg-rose-50/40 border-rose-200'
                      : ev.status === 'WARNING'
                      ? 'bg-amber-50/40 border-amber-200'
                      : ev.status === 'NOT_DETERMINABLE'
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                          {ev.rule_name}
                        </h4>
                        <span className="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {ev.rule_id}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500">
                        {ev.legal_reference}
                      </span>
                    </div>

                    <StatusBadge status={ev.status} size="sm" />
                  </div>

                  {/* Detected Value */}
                  <div className="text-xs space-y-1 mt-2">
                    <div>
                      <span className="font-semibold text-slate-700">Detected Value: </span>
                      <span className="font-mono text-slate-900">{ev.detected_value || 'None'}</span>
                    </div>

                    {/* Specific Issue if Failed */}
                    {ev.issue && (
                      <div className="p-2 bg-rose-100/70 border border-rose-200 rounded text-rose-900 font-medium text-[11px]">
                        <strong>Statutory Non-Compliance:</strong> {ev.issue}
                      </div>
                    )}

                    {/* Legal Explanation */}
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      {ev.explanation}
                    </p>

                    {/* Recommendation / Remedy */}
                    {ev.recommendation && (
                      <div className="text-[11px] text-emerald-900 bg-emerald-50/60 p-2 rounded border border-emerald-200/60">
                        <strong>Remedy Directive:</strong> {ev.recommendation}
                      </div>
                    )}

                    {/* Optical Evidence Snippet */}
                    {ev.evidence?.snippet && (
                      <div className="flex items-center justify-between text-[10px] text-slate-500 bg-white p-1.5 rounded border border-slate-200 mt-1">
                        <span className="italic truncate">
                          Evidence: "{ev.evidence.snippet}"
                        </span>
                        {ev.evidence.source_side && (
                          <span className="font-mono uppercase font-bold text-slate-600 px-1 bg-slate-100 rounded ml-2 shrink-0">
                            {ev.evidence.source_side} panel
                          </span>
                        )}
                      </div>
                    )}

                    {/* Penalty Citation */}
                    {ev.statutory_penalty_ref && (
                      <div className="text-[10px] font-mono text-rose-700 mt-1">
                        Statutory Penalty: {ev.statutory_penalty_ref}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {filteredEvaluations.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No rule evaluations match the selected filter.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
