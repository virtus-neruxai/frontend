/**
 * ReportModal Component
 * 
 * Purpose:
 * - Display report submission modal
 * - Allow selecting report reason
 * - Handle report submission
 * 
 * Props:
 * - submission: Submission being reported
 * - isOpen: Boolean modal open state
 * - onClose: Close handler
 * - reportReason: Selected reason (controlled)
 * - onReasonChange: Reason change handler
 * - onSubmit: Report submission handler
 * 
 * Mobile Migration:
 * - Android: AlertDialog or BottomSheet composable
 * - iOS: Alert or ActionSheet SwiftUI
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';

// Report reasons (same as original ArenaPage)
const REPORT_REASONS = [
  { value: 'inappropriate', label: '📢 Contenido inapropiado' },
  { value: 'spam', label: '🚫 Spam o publicidad' },
  { value: 'offensive', label: '😡 Lenguaje ofensivo' },
  { value: 'plagiarism', label: '📋 Plagio' },
  { value: 'other', label: '❓ Otro motivo' }
];

export function ReportModal({
  submission,
  isOpen,
  onClose,
  reportReason,
  onReasonChange,
  onSubmit
}) {
  if (!submission) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Reportar reflexión
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-[#71717A]">
            Selecciona el motivo del reporte:
          </p>
          <div className="space-y-2">
            {REPORT_REASONS.map(reason => (
              <label 
                key={reason.value} 
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                  reportReason === reason.value 
                    ? 'border-orange-500 bg-orange-50' 
                    : 'hover:bg-[#F4F4F5]'
                }`}
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={reason.value}
                  checked={reportReason === reason.value}
                  onChange={(e) => onReasonChange(e.target.value)}
                  className="accent-orange-500"
                />
                <span className="text-sm">{reason.label}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              className="flex-1 bg-red-500 hover:bg-red-600" 
              onClick={onSubmit} 
              disabled={!reportReason}
            >
              Enviar Reporte
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
