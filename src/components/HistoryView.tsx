import React, { useState } from 'react';
import { Inspection } from '../types';
import { StatusBadge } from './StatusBadge';
import { Search, Filter, Trash2, ArrowRight, Layers, FileSpreadsheet, PlusCircle } from 'lucide-react';

interface HistoryViewProps {
  inspections: Inspection[];
  onSelectInspection: (id: string) => void;
  onDeleteInspection: (id: string) => void;
  onNewInspection: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  inspections,
  onSelectInspection,
  onDeleteInspection,
  onNewInspection,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = inspections.filter(insp => {
    const matchesStatus =
      statusFilter === 'ALL' || insp.result?.overallStatus === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      insp.id.toLowerCase().includes(q) ||
      insp.title.toLowerCase().includes(q) ||
      (insp.productName && insp.productName.toLowerCase().includes(q)) ||
      (insp.brand && insp.brand.toLowerCase().includes(q)) ||
      (insp.retailerName && insp.retailerName.toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Statutory Inspection Records
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Search and manage historical Legal Metrology packaged commodity evaluations.
          </p>
        </div>

        <button
          onClick={onNewInspection}
          className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Inspection</span>
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by ID, commodity, brand, retailer..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none w-full sm:w-auto"
          >
            <option value="ALL">All Outcomes ({inspections.length})</option>
            <option value="COMPLIANT">Compliant Only</option>
            <option value="NON_COMPLIANT">Non-Compliant (Violations)</option>
            <option value="NEEDS_REVIEW">Needs Review</option>
            <option value="INSUFFICIENT_EVIDENCE">Insufficient Evidence</option>
          </select>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="px-6 py-3">Inspection ID & Date</th>
                <th className="px-6 py-3">Commodity & Brand</th>
                <th className="px-6 py-3">Panels</th>
                <th className="px-6 py-3">Determination</th>
                <th className="px-6 py-3">Score & Confidence</th>
                <th className="px-6 py-3">Inspector Station</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map(insp => (
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
                      {insp.brand ? `Brand: ${insp.brand}` : 'Generic'}
                    </span>
                  </td>

                  <td className="px-6 py-3.5">
                    <div className="flex items-center space-x-1">
                      {insp.images.map(img => (
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
                      <span className="text-slate-400">Draft</span>
                    )}
                  </td>

                  <td className="px-6 py-3.5">
                    {insp.result ? (
                      <div>
                        <span className="font-bold text-slate-900">
                          {insp.result.score.score}/100
                        </span>
                        <span
                          className={`ml-2 text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            insp.result.confidence === 'HIGH'
                              ? 'bg-emerald-100 text-emerald-800'
                              : insp.result.confidence === 'MEDIUM'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {insp.result.confidence}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  <td className="px-6 py-3.5 text-slate-600">
                    <span>{insp.inspectorLocation || 'Zonal Directorate'}</span>
                  </td>

                  <td className="px-6 py-3.5 text-right space-x-1">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onSelectInspection(insp.id);
                      }}
                      className="text-emerald-700 hover:text-emerald-900 font-semibold px-2 py-1 rounded hover:bg-slate-100"
                    >
                      Review
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (confirm(`Delete inspection record ${insp.id}?`)) {
                          onDeleteInspection(insp.id);
                        }
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No inspection records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
