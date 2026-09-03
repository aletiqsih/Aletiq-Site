import React from 'react';
import { ComplianceStatus, RuleEvaluationStatus } from '../types';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, MinusCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: ComplianceStatus | RuleEvaluationStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'COMPLIANT':
      case 'PASS':
        return {
          label: status === 'PASS' ? 'Pass' : 'Compliant',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
        };
      case 'NON_COMPLIANT':
      case 'FAIL':
        return {
          label: status === 'FAIL' ? 'Non-Compliant (Fail)' : 'Non-Compliant',
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          icon: <XCircle className="w-4 h-4 text-rose-600 shrink-0" />,
        };
      case 'WARNING':
      case 'NEEDS_REVIEW':
        return {
          label: status === 'WARNING' ? 'Warning' : 'Needs Review',
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />,
        };
      case 'INSUFFICIENT_EVIDENCE':
      case 'NOT_DETERMINABLE':
        return {
          label: status === 'NOT_DETERMINABLE' ? 'Not Determinable' : 'Insufficient Evidence',
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />,
        };
      case 'NOT_APPLICABLE':
        return {
          label: 'Not Applicable',
          bg: 'bg-gray-100 text-gray-600 border-gray-200',
          icon: <MinusCircle className="w-4 h-4 text-gray-400 shrink-0" />,
        };
      default:
        return {
          label: status,
          bg: 'bg-gray-100 text-gray-700 border-gray-300',
          icon: null,
        };
    }
  };

  const config = getStatusConfig();
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-md border ${config.bg} ${sizeClasses} ${className}`}
    >
      {showIcon && config.icon}
      <span>{config.label}</span>
    </span>
  );
};
