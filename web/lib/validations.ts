import { Documento, DocumentType } from "@prisma/client";

export const REQUIRED_DOCUMENT_TYPES: DocumentType[] = [
  "acta_constitutiva",
  "identificacion_representante",
  "comprobante_domicilio",
  "rfc",
  "constancia_situacion_fiscal",
  "manifestacion_protesta",
];

export const CONDITIONAL_DOCUMENT_TYPES: DocumentType[] = [
  "poder_representacion",
  "socios_accionistas",
  "beneficiario_controlador",
];

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  acta_constitutiva: "Acta constitutiva",
  identificacion_representante: "Identificación del representante legal",
  poder_representacion: "Poder / evidencia de representación",
  comprobante_domicilio: "Comprobante de domicilio",
  rfc: "RFC",
  constancia_situacion_fiscal: "Constancia de situación fiscal",
  manifestacion_protesta: "Manifestación bajo protesta",
  socios_accionistas: "Socios / accionistas",
  beneficiario_controlador: "Beneficiario controlador",
  otro: "Otro",
};

export interface MissingDocument {
  tipo: DocumentType;
  label: string;
  required: boolean;
}

export interface ExpiredDocument {
  id: string;
  tipo: DocumentType;
  label: string;
  fechaVencimiento: Date;
  diasVencido: number;
}

export interface ValidationFactor {
  id: string;
  category: "missing" | "expired" | "csf" | "completitud" | "stale_sat";
  description: string;
  severity: "info" | "warning" | "critical";
}

export interface ConsultaSatForValidation {
  listado: string;
  resultado: string;
  fechaHora: Date;
}

export interface ValidationResult {
  missingRequired: MissingDocument[];
  missingConditional: MissingDocument[];
  expiredDocuments: ExpiredDocument[];
  csfOutOfMonth: boolean;
  csfPresent: boolean;
  csfFechaEmision: Date | null;
  staleSatCheck: { oldestDate: Date; diasAntiguedad: number } | null;
  needsUpdate: boolean;
  factors: ValidationFactor[];
  checkedAt: Date;
}

export function findMissingDocuments(
  documentos: Pick<Documento, "tipo">[]
): { missingRequired: MissingDocument[]; missingConditional: MissingDocument[] } {
  const present = new Set(documentos.map((d) => d.tipo));

  const missingRequired = REQUIRED_DOCUMENT_TYPES.filter(
    (tipo) => !present.has(tipo)
  ).map((tipo) => ({
    tipo,
    label: DOCUMENT_LABELS[tipo],
    required: true,
  }));

  const missingConditional = CONDITIONAL_DOCUMENT_TYPES.filter(
    (tipo) => !present.has(tipo)
  ).map((tipo) => ({
    tipo,
    label: DOCUMENT_LABELS[tipo],
    required: false,
  }));

  return { missingRequired, missingConditional };
}

export function findExpiredDocuments(
  documentos: Pick<Documento, "id" | "tipo" | "fechaVencimiento">[],
  now: Date = new Date()
): ExpiredDocument[] {
  return documentos
    .filter((d) => d.fechaVencimiento && new Date(d.fechaVencimiento) < now)
    .map((d) => {
      const venc = new Date(d.fechaVencimiento!);
      const diasVencido = Math.floor(
        (now.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        id: d.id,
        tipo: d.tipo,
        label: DOCUMENT_LABELS[d.tipo],
        fechaVencimiento: venc,
        diasVencido,
      };
    });
}

export function isCsfCurrentMonth(
  csfDoc: Pick<Documento, "fechaEmision"> | null | undefined,
  now: Date = new Date()
): boolean {
  if (!csfDoc || !csfDoc.fechaEmision) return false;
  const emision = new Date(csfDoc.fechaEmision);
  return (
    emision.getUTCMonth() === now.getUTCMonth() &&
    emision.getUTCFullYear() === now.getUTCFullYear()
  );
}

export function findCsfDocument(
  documentos: Pick<Documento, "tipo" | "fechaEmision">[]
): Pick<Documento, "tipo" | "fechaEmision"> | null {
  return documentos.find((d) => d.tipo === "constancia_situacion_fiscal") ?? null;
}

const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;

export function validateExpediente(
  documentos: Pick<
    Documento,
    "id" | "tipo" | "fechaEmision" | "fechaVencimiento"
  >[],
  consultasSat: ConsultaSatForValidation[] = [],
  now: Date = new Date()
): ValidationResult {
  const { missingRequired, missingConditional } = findMissingDocuments(documentos);
  const expiredDocuments = findExpiredDocuments(documentos, now);
  const csfDoc = findCsfDocument(documentos);
  const csfPresent = !!csfDoc;
  const csfOutOfMonth = csfPresent ? !isCsfCurrentMonth(csfDoc, now) : false;

  const factors: ValidationFactor[] = [];

  // Stale SAT check
  let staleSatCheck: ValidationResult["staleSatCheck"] = null;
  if (consultasSat.length > 0) {
    const oldest = consultasSat.reduce(
      (min, c) => (c.fechaHora < min ? c.fechaHora : min),
      consultasSat[0].fechaHora
    );
    const diasAntiguedad = Math.floor(
      (now.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (now.getTime() - oldest.getTime() > THREE_MONTHS_MS) {
      staleSatCheck = { oldestDate: oldest, diasAntiguedad };
      factors.push({
        id: "stale_sat_check",
        category: "stale_sat",
        description: `La consulta de listas fiscales tiene ${diasAntiguedad} días de antigüedad (>3 meses). Requiere actualización.`,
        severity: "warning",
      });
    }
  }

  missingRequired.forEach((m, i) => {
    factors.push({
      id: `missing_required_${m.tipo}_${i}`,
      category: "missing",
      description: `Documento obligatorio faltante: ${m.label}`,
      severity: m.tipo === "acta_constitutiva" ? "critical" : "warning",
    });
  });

  missingConditional.forEach((m, i) => {
    factors.push({
      id: `missing_conditional_${m.tipo}_${i}`,
      category: "missing",
      description: `Documento condicional faltante: ${m.label}`,
      severity: "info",
    });
  });

  expiredDocuments.forEach((d, i) => {
    factors.push({
      id: `expired_${d.id}_${i}`,
      category: "expired",
      description: `Documento vencido: ${d.label} (venció hace ${d.diasVencido} días)`,
      severity: "warning",
    });
  });

  if (csfPresent && csfOutOfMonth) {
    factors.push({
      id: "csf_out_of_month",
      category: "csf",
      description:
        "La CSF no es del mes vigente (requiere actualización)",
      severity: "warning",
    });
  }

  if (!csfPresent) {
    factors.push({
      id: "csf_missing",
      category: "csf",
      description: "No hay Constancia de situación fiscal cargada",
      severity: "critical",
    });
  }

  const needsUpdate =
    expiredDocuments.length > 0 ||
    csfOutOfMonth ||
    missingRequired.length > 0 ||
    staleSatCheck !== null;

  return {
    missingRequired,
    missingConditional,
    expiredDocuments,
    csfOutOfMonth,
    csfPresent,
    csfFechaEmision: csfDoc?.fechaEmision ? new Date(csfDoc.fechaEmision) : null,
    staleSatCheck,
    needsUpdate,
    factors,
    checkedAt: now,
  };
}
