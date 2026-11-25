'use client';

import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileArchive,
  FileText,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { PreflightReport } from '@/lib/export/buildPrintBundle';
import { PillButton } from './Primitives';

export const PreflightModal: React.FC<{
  open: boolean;
  report: PreflightReport;
  pdfFilename?: string;
  isBuilding: boolean;
  isBuildingPdf?: boolean;
  error?: string;
  onClose: () => void;
  onConfirmExport: () => void;
  onConfirmExportPdf?: () => void;
}> = ({
  open,
  report,
  pdfFilename,
  isBuilding,
  isBuildingPdf = false,
  error,
  onClose,
  onConfirmExport,
  onConfirmExportPdf,
}) => {
  if (!open) return null;

  const hasWarnings = report.checks.some((c) => c.status === 'warn');
  const busy = isBuilding || isBuildingPdf;

  return (
    <div className="gf-modal-backdrop" onClick={() => !isBuilding && onClose()}>
      <div className="gf-modal-card gf-preflight-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gf-modal-head">
          <div className="gf-preflight-title-row">
            <div className={`gf-preflight-badge ${hasWarnings ? 'is-warn' : 'is-ok'}`}>
              {hasWarnings ? (
                <AlertTriangle size={18} strokeWidth={2} className="gf-icon-shrink" />
              ) : (
                <ShieldCheck size={18} strokeWidth={2} className="gf-icon-shrink" />
              )}
            </div>
            <div>
              <h3 className="gf-modal-title">Semáforo Pre-Flight de Imprenta</h3>
              <p className="gf-preflight-sub">
                Verificación automática antes de aplanar capas L1 → L5
              </p>
            </div>
          </div>
          <button
            type="button"
            className="gf-modal-close-btn"
            onClick={onClose}
            disabled={isBuilding}
            aria-label="Cerrar verificación Pre-Flight"
          >
            <X size={16} strokeWidth={1.75} className="gf-icon-shrink" />
          </button>
        </div>

        <div className="gf-preflight-list">
          {report.checks.map((check) => (
            <div
              key={check.id}
              className={`gf-preflight-item ${check.status === 'warn' ? 'is-warn' : 'is-ok'}`}
            >
              <div className="gf-preflight-icon">
                {check.status === 'ok' ? (
                  <CheckCircle2 size={16} strokeWidth={2} className="gf-icon-shrink" />
                ) : (
                  <AlertTriangle size={16} strokeWidth={2} className="gf-icon-shrink" />
                )}
              </div>
              <div className="gf-preflight-copy">
                <p className="gf-preflight-item-title">{check.title}</p>
                <p className="gf-preflight-item-detail">{check.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="gf-preflight-filename">
          <FileArchive size={15} strokeWidth={1.75} className="gf-icon-shrink" />
          <code>{report.zipFilename}</code>
        </div>
        {pdfFilename && (
          <div className="gf-preflight-filename">
            <FileText size={15} strokeWidth={1.75} className="gf-icon-shrink" />
            <code>{pdfFilename}</code>
          </div>
        )}

        {error && <div className="gf-inline-error">{error}</div>}

        <div className="gf-modal-actions">
          <PillButton variant="outline" onClick={onClose} disabled={busy}>
            Revisar Lienzo
          </PillButton>
          {onConfirmExportPdf && (
            <PillButton
              variant="outline"
              icon={
                isBuildingPdf ? (
                  <RefreshCw size={15} strokeWidth={2} className="gf-spin gf-icon-shrink" />
                ) : (
                  <FileText size={15} strokeWidth={1.75} className="gf-icon-shrink" />
                )
              }
              onClick={onConfirmExportPdf}
              disabled={busy}
            >
              {isBuildingPdf ? 'Generando PDF KDP...' : 'Exportar PDF KDP'}
            </PillButton>
          )}
          <PillButton
            variant="solid"
            icon={
              isBuilding ? (
                <RefreshCw size={15} strokeWidth={2} className="gf-spin gf-icon-shrink" />
              ) : (
                <PackageCheck size={15} strokeWidth={1.75} className="gf-icon-shrink" />
              )
            }
            onClick={onConfirmExport}
            disabled={busy}
          >
            {isBuilding ? 'Aplanando L1→L5 y Empaquetando...' : 'Confirmar y Descargar ZIP'}
          </PillButton>
        </div>
      </div>
    </div>
  );
};
