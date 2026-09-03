import React from 'react';
import { RiskIntelligenceAnalytics } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts';
import { ShieldAlert, BarChart3, TrendingUp, AlertTriangle, Layers, Award } from 'lucide-react';

interface RiskIntelligenceViewProps {
  analytics?: RiskIntelligenceAnalytics;
}

export const RiskIntelligenceView: React.FC<RiskIntelligenceViewProps> = ({ analytics }) => {
  if (!analytics) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        Loading Legal Metrology Risk Intelligence...
      </div>
    );
  }

  const pieData = [
    { name: 'Compliant', value: analytics.compliantCount, color: '#10b981' },
    { name: 'Non-Compliant (Violations)', value: analytics.nonCompliantCount, color: '#f43f5e' },
    { name: 'Needs Review / Incomplete', value: analytics.needsReviewCount, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  const violationChartData = analytics.commonViolations.slice(0, 5).map(v => ({
    name: v.ruleId,
    fullName: v.ruleName,
    count: v.count,
    category: v.category,
  }));

  const categoryChartData = analytics.categoryRiskBreakdown.map(c => ({
    category: c.category.split(' ')[0],
    fullName: c.category,
    violationRate: c.violationRate,
    total: c.total,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Legal Metrology Risk Intelligence & Analytics
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Zonal enforcement insights, recurring statutory non-compliances, and packaging panel coverage trends.
        </p>
      </div>

      {/* Top Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 block">Total Audited Commodities</span>
          <span className="text-2xl font-bold text-slate-900">{analytics.totalInspections}</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Across retail zones</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 block">Average Compliance Score</span>
          <span className="text-2xl font-bold text-emerald-700">
            {analytics.averageComplianceScore}/100
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Calculated metric index</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 block">Multi-Panel Submission Rate</span>
          <span className="text-2xl font-bold text-indigo-700">
            {analytics.totalInspections > 0
              ? Math.round((analytics.sideCoverageStats.multiSideCount / analytics.totalInspections) * 100)
              : 0}
            %
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            Avg {analytics.sideCoverageStats.averageSidesPerInspection} sides/pkg
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 block">Identified Non-Compliances</span>
          <span className="text-2xl font-bold text-rose-700">
            {analytics.commonViolations.reduce((acc, v) => acc + v.count, 0)}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Statutory rule infractions</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Compliance Determination Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            1. Statutory Determination Distribution
          </h3>
          <div className="h-64 flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`${value} Inspections`, 'Count']}
                    contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-xs text-slate-400">No inspection records</span>
            )}
          </div>
        </div>

        {/* Chart 2: Top Rule Violations */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            2. Most Common Statutory Non-Compliances (Rule Violations)
          </h3>
          <div className="h-64">
            {violationChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={violationChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value: any) => [`${value} Infractions`, 'Violations Count']}
                    labelFormatter={(label) => {
                      const item = violationChartData.find(v => v.name === label);
                      return item ? `${item.name}: ${item.fullName}` : label;
                    }}
                    contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#e11d48" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No statutory violations logged yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Common Violations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Detailed Non-Compliance Risk Frequency
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-6 py-3">Rule Identifier</th>
                <th className="px-6 py-3">Statutory Rule Description</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Violations Detected</th>
                <th className="px-6 py-3">Frequency Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {analytics.commonViolations.map((v) => (
                <tr key={v.ruleId}>
                  <td className="px-6 py-3 font-mono font-bold text-slate-900">{v.ruleId}</td>
                  <td className="px-6 py-3 font-semibold text-slate-800">{v.ruleName}</td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                      {v.category}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-bold text-rose-700">{v.count}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-rose-600 h-1.5 rounded-full"
                          style={{ width: `${Math.min(100, v.percentage)}%` }}
                        ></div>
                      </div>
                      <span className="font-medium text-slate-700">{v.percentage}%</span>
                    </div>
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
