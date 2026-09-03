import React, { useState } from 'react';
import { LegalRule } from '../types';
import { LEGAL_RULES } from '../data/legalRules';
import { BookOpen, Search, Filter, ShieldCheck, AlertCircle, Scale, X, ExternalLink } from 'lucide-react';

export const RuleDatabaseView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeRule, setActiveRule] = useState<LegalRule | null>(null);

  const categories = [
    'ALL',
    'IDENTITY',
    'NET_QUANTITY',
    'MRP',
    'DATES',
    'CONSUMER_CARE',
    'IMPORT',
    'ECOMMERCE',
  ];

  const filteredRules = LEGAL_RULES.filter(rule => {
    const matchesCat =
      selectedCategory === 'ALL' ||
      rule.category.toUpperCase() === selectedCategory.toUpperCase();
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !searchQuery ||
      rule.rule_id.toLowerCase().includes(q) ||
      rule.rule_name.toLowerCase().includes(q) ||
      rule.legal_reference.toLowerCase().includes(q) ||
      rule.description.toLowerCase().includes(q);

    return matchesCat && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-2 text-emerald-700 font-semibold text-xs mb-1">
          <Scale className="w-4 h-4" />
          <span>Statutory Rules Engine Directory</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Legal Metrology (Packaged Commodities) Rulebook
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Statutory rule provisions under the Legal Metrology Act, 2009 and LMPC Rules, 2011 (as amended).
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search rules, clauses, mandatory fields..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Category Pill Filters */}
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1.5 rounded-md font-semibold text-[11px] transition-colors ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRules.map(rule => (
          <div
            key={rule.rule_id}
            onClick={() => setActiveRule(rule)}
            className="bg-white p-5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-xs cursor-pointer transition-all space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {rule.rule_id}
                </span>
                <h3 className="font-bold text-slate-900 text-sm mt-1.5">{rule.rule_name}</h3>
                <span className="text-[11px] font-medium text-slate-500 block">
                  {rule.legal_reference}
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                {rule.category}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
              {rule.description}
            </p>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">
                Scope: <strong className="text-slate-700">{rule.applicability_conditions.join(', ')}</strong>
              </span>
              <span className="text-emerald-700 font-semibold hover:underline">
                View Full Legal Requirements →
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Rule Detail Modal / Drawer */}
      {activeRule && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                  {activeRule.rule_id}
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-2">{activeRule.rule_name}</h2>
                <p className="text-xs font-semibold text-slate-500">{activeRule.legal_reference}</p>
              </div>
              <button
                onClick={() => setActiveRule(null)}
                className="text-slate-400 hover:text-slate-900 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <span className="font-bold uppercase tracking-wider text-slate-700 block mb-1 text-[11px]">
                  Statutory Rule Summary
                </span>
                <p className="text-slate-800 leading-relaxed">{activeRule.description}</p>
              </div>

              <div>
                <span className="font-bold uppercase tracking-wider text-slate-700 block mb-1.5 text-[11px]">
                  Mandatory Required Fields
                </span>
                <ul className="space-y-1 pl-4 list-disc text-slate-700 font-mono">
                  {activeRule.required_fields.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-700">
                <div>
                  <span className="font-bold block text-slate-900">Applicability:</span>
                  <span>{activeRule.applicability_conditions.join(', ')}</span>
                </div>
                <div>
                  <span className="font-bold block text-slate-900">Statutory Authority:</span>
                  <span>{activeRule.legal_source}</span>
                </div>
              </div>

              {activeRule.statutory_penalty_ref && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-rose-900 text-xs">
                  <span className="font-bold block text-rose-950">Statutory Penalties for Non-Compliance:</span>
                  <p className="mt-0.5">{activeRule.statutory_penalty_ref}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveRule(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
              >
                Close Rule Reference
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
