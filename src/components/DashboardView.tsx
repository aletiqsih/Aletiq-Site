import React from 'react';
import { Inspection, RiskIntelligenceAnalytics } from '../types';
import { StatusBadge } from './StatusBadge';
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  HelpCircle,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  FileText,
  Search,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface DashboardViewProps {
  inspections: Inspection[];
  analytics?: RiskIntelligenceAnalytics;
  onSelectInspection: (id: string) => void;
  onNewInspection: () => void;
  onViewAllRecords: () => void;
  onViewRiskIntelligence: () => void;
  onViewRuleDatabase: () => void;
  onLoadPreset: (presetId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  inspections,
  analytics,
  onSelectInspection,
  onNewInspection,
  onViewAllRecords,
  onViewRiskIntelligence,
  onViewRuleDatabase,
  onLoadPreset,
}) => {
  const total = inspections.length;
  const compliant = inspections.filter(i => i.result?.overallStatus === 'COMPLIANT').length;
  const nonCompliant = inspections.filter(i => i.result?.overallStatus === 'NON_COMPLIANT').length;
  const needsReview = inspections.filter(
    i => i.result?.overallStatus === 'NEEDS_REVIEW' || i.result?.overallStatus === 'INSUFFICIENT_EVIDENCE'
  ).length;

  const complianceRate = total > 0 ? Math.round((compliant / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Welcome / Mission Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-xl p-6 shadow-md border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 bg-emerald-950 text-emerald-300 border border-emerald-800/80 px-2.5 py-0.5 rounded text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart India Hackathon 2026 • Problem Statement SIH26034</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Packaged Commodity Compliance Intelligence Platform
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Automated statutory declaration extraction and multi-panel rule verification under the{' '}
              <span className="text-emerald-300 font-semibold">Legal Metrology (Packaged Commodities) Rules, 2011</span>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={onNewInspection}
              className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Package Inspection</span>
            </button>
            <button
              onClick={onViewRuleDatabase}
              className="inline-flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-medium px-3.5 py-2.5 rounded-lg transition-colors"
            >
              <span>Explore Legal Rules</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Inspections */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Inspections</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">{total}</div>
          <p className="text-[11px] text-slate-500 mt-1">Multi-panel packaged records</p>
        </div>

        {/* Card 2: Compliant Rate */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Compliance Rate</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-700">{complianceRate}%</div>
          <p className="text-[11px] text-slate-500 mt-1">{compliant} compliant products</p>
        </div>

        {/* Card 3: Non-Compliant Violations */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Confirmed Violations</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-rose-700">{nonCompliant}</div>
          <p className="text-[11px] text-slate-500 mt-1">Requiring Form-A Notice</p>
        </div>

        {/* Card 4: Under Review / Single Panel */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Needs Review / Incomplete</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-700">{needsReview}</div>
          <p className="text-[11px] text-slate-500 mt-1">Missing side panels / low cert.</p>
        </div>
      </div>

      {/* Quick Demo Pre-sets Section */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
              SIH 2026 Evaluation Scenarios (Instant Test Packages)
            </h3>
            <p className="text-xs text-slate-600">
              Click any scenario to immediately run optical evaluation and inspect rule findings:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => onLoadPreset('sample-honey')}
            className="text-left bg-white p-3.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                1. Full Compliance Package
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded">
                Score: 96
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Honey jar with both front & back panels. All statutory declarations verified.
            </p>
          </button>

          <button
            onClick={() => onLoadPreset('sample-cookies')}
            className="text-left bg-white p-3.5 rounded-lg border border-slate-200 hover:border-rose-500 hover:shadow-xs transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900 group-hover:text-rose-700">
                2. Non-Standard Violations
              </span>
              <span className="text-[10px] bg-rose-100 text-rose-800 font-semibold px-1.5 py-0.5 rounded">
                Score: 38
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Cookies pack with illegal unit "250 gms", missing tax phrase, incomplete consumer care.
            </p>
          </button>

          <button
            onClick={() => onLoadPreset('sample-tea-single')}
            className="text-left bg-white p-3.5 rounded-lg border border-slate-200 hover:border-amber-500 hover:shadow-xs transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900 group-hover:text-amber-700">
                3. Single-Panel Missing Sides
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.5 rounded">
                Low Confidence
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Only front panel submitted. Correctly marks missing items as NOT_DETERMINABLE.
            </p>
          </button>
        </div>
      </div>

      {/* Recent Inspections Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Recent Inspection Assessments
            </h2>
            <p className="text-xs text-slate-500">
              Latest statutory evaluations recorded across regional zones
            </p>
          </div>
          <button
            onClick={onViewAllRecords}
            className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            <span>View All Records</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="px-6 py-3">Inspection ID & Date</th>
                <th className="px-6 py-3">Commodity & Brand</th>
                <th className="px-6 py-3">Panels Verified</th>
                <th className="px-6 py-3">Compliance Status</th>
                <th className="px-6 py-3">Score & Confidence</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {inspections.slice(0, 5).map((insp) => (
                <tr
                  key={insp.id}
                  onClick={() => onSelectInspection(insp.id)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-3.5">
                    <span className="font-mono font-bold text-slate-900 block">{insp.id}</span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(insp.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </td>

                  <td className="px-6 py-3.5">
                    <span className="font-bold text-slate-900 block">{insp.productName || insp.title}</span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {insp.brand ? `Brand: ${insp.brand}` : 'Generic Commodity'}
                    </span>
                  </td>

                  <td className="px-6 py-3.5">
                    <div className="flex items-center space-x-1">
                      {insp.images.map((img) => (
                        <span
                          key={img.id}
                          className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold uppercase rounded border border-slate-200"
                        >
                          {img.side}
                        </span>
                      ))}
                      {insp.images.length === 0 && (
                        <span className="text-slate-400 italic">No images</span>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-3.5">
                    {insp.result ? (
                      <StatusBadge status={insp.result.overallStatus} size="sm" />
                    ) : (
                      <span className="text-slate-400">Draft / Pending</span>
                    )}
                  </td>

                  <td className="px-6 py-3.5">
                    {insp.result ? (
                      <div>
                        <span className="font-bold text-slate-900">{insp.result.score.score}/100</span>
                        <span
                          className={`ml-2 text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            insp.result.confidence === 'HIGH'
                              ? 'bg-emerald-100 text-emerald-800'
                              : insp.result.confidence === 'MEDIUM'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {insp.result.confidence} CONF.
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  <td className="px-6 py-3.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectInspection(insp.id);
                      }}
                      className="inline-flex items-center space-x-1 text-slate-700 hover:text-emerald-700 font-semibold px-2.5 py-1 rounded hover:bg-slate-100 transition-colors"
                    >
                      <span>Review</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
