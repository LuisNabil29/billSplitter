'use client';

import { BillItem } from '@/lib/types';

interface VerificationPanelProps {
  item: BillItem;
  onAcceptFix: (itemId: string) => void;
  onDismissIssue: (itemId: string) => void;
  onManualEdit: (itemId: string) => void;
}

export default function VerificationPanel({
  item,
  onAcceptFix,
  onDismissIssue,
  onManualEdit,
}: VerificationPanelProps) {
  if (!item.verificationIssue) {
    return null;
  }

  const issue = item.verificationIssue;
  const hasSuggestedFix = issue.suggestedFix && (
    issue.suggestedFix.price !== undefined || issue.suggestedFix.quantity !== undefined
  );

  // Determinar el color del badge según el tipo de issue
  const badgeColor = {
    'unit_price_mismatch': 'bg-yellow-100 border-yellow-400 text-yellow-800',
    'sum_mismatch': 'bg-red-100 border-red-400 text-red-800',
    'suspicious_quantity': 'bg-orange-100 border-orange-400 text-orange-800',
  }[issue.type] || 'bg-gray-100 border-gray-400 text-gray-800';

  const iconColor = {
    'unit_price_mismatch': 'text-yellow-600',
    'sum_mismatch': 'text-red-600',
    'suspicious_quantity': 'text-orange-600',
  }[issue.type] || 'text-gray-600';

  return (
    <div className={`mt-3 p-3 rounded-lg border-2 ${badgeColor}`}>
      <div className="flex items-start gap-2">
        <svg 
          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path 
            fillRule="evenodd" 
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
            clipRule="evenodd" 
          />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium mb-1">Posible error detectado</p>
          <p className="text-xs mb-2">{issue.message}</p>

          {hasSuggestedFix && (
            <div className="mb-2 text-xs font-medium bg-white/60 p-2 rounded border border-current/20">
              Corrección sugerida:
              {issue.suggestedFix.price !== undefined && (
                <div>
                  Precio unitario: ${item.price.toFixed(2)} → ${issue.suggestedFix.price.toFixed(2)}
                </div>
              )}
              {issue.suggestedFix.quantity !== undefined && (
                <div>
                  Cantidad: {item.quantity} → {issue.suggestedFix.quantity}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {hasSuggestedFix && (
              <button
                onClick={() => onAcceptFix(item.id)}
                className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs font-medium transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Aceptar corrección
              </button>
            )}
            <button
              onClick={() => onManualEdit(item.id)}
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs font-medium transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Editar manualmente
            </button>
            <button
              onClick={() => onDismissIssue(item.id)}
              className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-xs font-medium transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Ignorar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

