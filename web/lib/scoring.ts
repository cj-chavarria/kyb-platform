import { Documento, DocumentType, ListadoFiscal } from "@prisma/client";

export type Decision = "safe" | "review_required" | "high_risk";

export interface ScoringFactor {
  id: string;
  category:
    | "sat_list"
    | "missing_doc"
    | "expired_doc"
    | "csf"
    | "discrepancy"
    | "stale_check"
    | "completitud";
  description: string;
  points: number;
  direction: "increase" | "decrease";
  critical: boolean;
}

export interface SuggestedAction {
  action: string;
  priority: "alta" | "media" | "baja";
}

export interface ScoringResult {
  score: number;
  decision: Decision;
  blocked: boolean;
  factors: ScoringFactor[];
  suggestedActions: SuggestedAction[];
  evaluatedAt: Date;
}

export interface ScoringInput {
  documentos: Pick<
    Documento,
    | "id"
    | "tipo"
    | "fechaEmision"
    | "fechaVencimiento"
  >[];
  consultasSat: {
    listado: ListadoFiscal;
    resultado: string;
    detalle: string | null;
    referencia: string;
    fechaHora: Date;
  }[];
  discrepancias: {
    campo: string;
    severidad: string;
  }[];
  representantesCount: number;
  sociosCount: number;
  beneficiariosCount: number;
}

// ---------------------------------------------------------------------------
// Pesos de factores (defaults; futuramente overridables desde FactorConfig)
// ---------------------------------------------------------------------------

const PESOS = {
  // Listas SAT
  sat_69b_definitivo: { puntos: 100, critico: true },
  sat_69b_presunto: { puntos: 70, critico: false },
  sat_69bbis_definitivo: { puntos: 90, critico: false },
  sat_69bbis_sentencia_favorable: { puntos: 0, critico: false },
  sat_69_firmes: { puntos: 40, critico: false },
  sat_69_exigibles: { puntos: 35, critico: false },
  sat_69_no_localizados: { puntos: 50, critico: false },
  sat_69_csd_sin_efectos: { puntos: 60, critico: false },
  sat_69_entes_publicos: { puntos: 30, critico: false },
  sat_69_sentencias: { puntos: 20, critico: false },
  sat_69_desvirtuados: { puntos: 0, critico: false },
  sat_69_sentencias_favorables: { puntos: 0, critico: false },
  // Docs faltantes
  missing_acta_constitutiva: { puntos: 50, critico: true },
  missing_required_doc: { puntos: 15, critico: false },
  // Docs vencidos
  expired_doc: { puntos: 20, critico: false },
  // CSF
  csf_out_of_month: { puntos: 25, critico: false },
  csf_missing: { puntos: 40, critico: false },
  // Discrepancias
  discrepancy_material: { puntos: 30, critico: false },
  discrepancy_menor: { puntos: 10, critico: false },
  // Stale check
  stale_sat_check: { puntos: 15, critico: false },
  // Completitud
  incomplete_representante: { puntos: 20, critico: false },
  incomplete_socios: { puntos: 15, critico: false },
  incomplete_beneficiario: { puntos: 15, critico: false },
} as const;

// Umbrales de decision
const UMBRAL_HIGH_RISK = 80;

// Documentos obligatorios
const REQUIRED_DOC_TYPES: DocumentType[] = [
  "acta_constitutiva",
  "identificacion_representante",
  "comprobante_domicilio",
  "constancia_situacion_fiscal",
  "manifestacion_protesta",
];

const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;

export function calculateScore(
  input: ScoringInput,
  now: Date = new Date()
): ScoringResult {
  const factors: ScoringFactor[] = [];
  const actions: SuggestedAction[] = [];

  // --- Listas SAT ---
  const satByArticulo = new Map<string, (typeof input.consultasSat)[number]>();
  for (const c of input.consultasSat) {
    satByArticulo.set(c.listado, c);
  }

  let satClean = true;

  for (const c of input.consultasSat) {
    if (c.resultado !== "found") continue;
    satClean = false;
    const ref = c.referencia;
    const detalle = c.detalle || "";
    let factor: ScoringFactor | null = null;

    if (c.listado === "ART_69_B") {
      if (ref.includes("Definitivos")) {
        factor = mkFactor(
          "sat_69b_definitivo",
          "sat_list",
          `RFC en Art. 69-B Definitivo: ${detalle || "operaciones presuntamente inexistentes"}`,
          PESOS.sat_69b_definitivo
        );
        actions.push({
          action: "Bloquear: el RFC está en Art. 69-B Definitivo (operaciones presuntamente inexistentes).",
          priority: "alta",
        });
      } else if (ref.includes("Presuntos")) {
        factor = mkFactor(
          "sat_69b_presunto",
          "sat_list",
          `RFC en Art. 69-B Presunto: ${detalle || "presunción de operaciones inexistentes"}`,
          PESOS.sat_69b_presunto
        );
        actions.push({
          action: "Verificar estatus del RFC en Art. 69-B Presunto antes de aprobar.",
          priority: "alta",
        });
      } else if (ref.includes("Desvirtuados")) {
        factor = mkFactor(
          "sat_69b_desvirtuado",
          "sat_list",
          `RFC en Art. 69-B Desvirtuado (no genera riesgo)`,
          PESOS.sat_69_desvirtuados
        );
      } else if (ref.includes("SentenciasFavorables")) {
        factor = mkFactor(
          "sat_69b_sentencia_favorable",
          "sat_list",
          `RFC en Art. 69-B Sentencia Favorable (no genera riesgo)`,
          PESOS.sat_69_sentencias_favorables
        );
      }
    } else if (c.listado === "ART_69_B_BIS") {
      if (ref.includes("Definitivo")) {
        factor = mkFactor(
          "sat_69bbis_definitivo",
          "sat_list",
          `RFC en Art. 69-B Bis Definitivo: ${detalle || "transmisión indebida de pérdidas"}`,
          PESOS.sat_69bbis_definitivo
        );
        actions.push({
          action: "Revisar transmisión indebida de pérdidas fiscales (Art. 69-B Bis Definitivo).",
          priority: "alta",
        });
      } else if (ref.includes("SentenciaFa")) {
        factor = mkFactor(
          "sat_69bbis_sentencia_favorable",
          "sat_list",
          `RFC en Art. 69-B Bis Sentencia Favorable (no genera riesgo)`,
          PESOS.sat_69bbis_sentencia_favorable
        );
      }
    } else if (c.listado === "ART_69") {
      if (ref.includes("Firmes")) {
        factor = mkFactor(
          "sat_69_firmes",
          "sat_list",
          `RFC en Art. 69 Firmes: ${detalle}`,
          PESOS.sat_69_firmes
        );
      } else if (ref.includes("Exigibles")) {
        factor = mkFactor(
          "sat_69_exigibles",
          "sat_list",
          `RFC en Art. 69 Exigibles: ${detalle}`,
          PESOS.sat_69_exigibles
        );
      } else if (ref.includes("No_localizados")) {
        factor = mkFactor(
          "sat_69_no_localizados",
          "sat_list",
          `RFC en Art. 69 No localizados: ${detalle}`,
          PESOS.sat_69_no_localizados
        );
      } else if (ref.includes("CSDsinefectos")) {
        factor = mkFactor(
          "sat_69_csd_sin_efectos",
          "sat_list",
          `RFC en Art. 69 CSD sin efectos: ${detalle} (proxy Art. 49 Bis)`,
          PESOS.sat_69_csd_sin_efectos
        );
        actions.push({
          action: "El CSD está sin efectos (suspensión de facturación). Verificar causa subyacente.",
          priority: "alta",
        });
      } else if (ref.includes("Entespublicos")) {
        factor = mkFactor(
          "sat_69_entes_publicos",
          "sat_list",
          `RFC en Art. 69 Entes Públicos Omisos: ${detalle}`,
          PESOS.sat_69_entes_publicos
        );
      } else if (ref.includes("Sentencias")) {
        factor = mkFactor(
          "sat_69_sentencias",
          "sat_list",
          `RFC en Art. 69 Sentencias: ${detalle}`,
          PESOS.sat_69_sentencias
        );
      }
    } else if (c.listado === "ART_49_BIS") {
      // Cobertura indirecta: si found, viene de CSD sin efectos / no localizados
      factor = mkFactor(
        "sat_49bis_indirect_found",
        "sat_list",
        `RFC con afectación Art. 49 Bis (cobertura indirecta): ${detalle}`,
        PESOS.sat_69_csd_sin_efectos
      );
    }

    if (factor) factors.push(factor);
  }

  if (satClean && input.consultasSat.length >= 4) {
    factors.push({
      id: "sat_clean",
      category: "sat_list",
      description: "Listas fiscales limpias (sin coincidencias en Art. 69, 69-B, 69-B Bis y 49 Bis)",
      points: 0,
      direction: "decrease",
      critical: false,
    });
  }

  // Stale check: listas fiscales > 3 meses
  if (input.consultasSat.length > 0) {
    const oldest = input.consultasSat.reduce((min, c) =>
      c.fechaHora < min ? c.fechaHora : min
    , input.consultasSat[0].fechaHora);
    if (now.getTime() - oldest.getTime() > THREE_MONTHS_MS) {
      factors.push(mkFactor(
        "stale_sat_check",
        "stale_check",
        "Revisión de listas fiscales con más de 3 meses (obsoleta)",
        PESOS.stale_sat_check
      ));
      actions.push({
        action: "Actualizar la consulta de listas fiscales del SAT (más de 3 meses).",
        priority: "media",
      });
    }
  }

  // --- Docs faltantes ---
  const presentTypes = new Set(input.documentos.map((d) => d.tipo));
  for (const tipo of REQUIRED_DOC_TYPES) {
    if (!presentTypes.has(tipo)) {
      if (tipo === "acta_constitutiva") {
        factors.push(mkFactor(
          "missing_acta_constitutiva",
          "missing_doc",
          "Documento obligatorio faltante: Acta constitutiva",
          PESOS.missing_acta_constitutiva
        ));
        actions.push({
          action: "Cargar acta constitutiva (obligatoria, bloquea aprobación).",
          priority: "alta",
        });
      } else {
        factors.push(mkFactor(
          `missing_${tipo}`,
          "missing_doc",
          `Documento obligatorio faltante: ${tipo.replace(/_/g, " ")}`,
          PESOS.missing_required_doc
        ));
      }
    }
  }

  // --- Docs vencidos ---
  for (const d of input.documentos) {
    if (d.fechaVencimiento && new Date(d.fechaVencimiento) < now) {
      factors.push(mkFactor(
        `expired_${d.id}`,
        "expired_doc",
        `Documento vencido: ${d.tipo.replace(/_/g, " ")}`,
        PESOS.expired_doc
      ));
      actions.push({
        action: `Renovar documento vencido: ${d.tipo.replace(/_/g, " ")}.`,
        priority: "media",
      });
    }
  }

  // --- CSF fuera del mes vigente ---
  const csf = input.documentos.find((d) => d.tipo === "constancia_situacion_fiscal");
  if (!csf || !csf.fechaEmision) {
    factors.push(mkFactor(
      "csf_missing",
      "csf",
      "No hay Constancia de situación fiscal cargada",
      PESOS.csf_missing
    ));
    actions.push({
      action: "Cargar Constancia de situación fiscal (CSF) del mes vigente.",
      priority: "alta",
    });
  } else {
    const emision = new Date(csf.fechaEmision);
    if (
      emision.getUTCMonth() !== now.getUTCMonth() ||
      emision.getUTCFullYear() !== now.getUTCFullYear()
    ) {
      factors.push(mkFactor(
        "csf_out_of_month",
        "csf",
        "La CSF no es del mes vigente (requiere actualización)",
        PESOS.csf_out_of_month
      ));
      actions.push({
        action: "Actualizar la Constancia de situación fiscal (debe ser del mes vigente).",
        priority: "media",
      });
    }
  }

  // --- Discrepancias ---
  for (const dis of input.discrepancias) {
    if (dis.severidad === "material") {
      factors.push(mkFactor(
        `discrepancy_material_${dis.campo}`,
        "discrepancy",
        `Discrepancia material en: ${dis.campo}`,
        PESOS.discrepancy_material
      ));
      actions.push({
        action: `Corregir discrepancia material en ${dis.campo} antes de aprobar.`,
        priority: "alta",
      });
    } else {
      factors.push(mkFactor(
        `discrepancy_menor_${dis.campo}`,
        "discrepancy",
        `Discrepancia menor en: ${dis.campo}`,
        PESOS.discrepancy_menor
      ));
    }
  }

  // --- Completitud ---
  if (input.representantesCount === 0) {
    factors.push(mkFactor(
      "incomplete_representante",
      "completitud",
      "Representante legal no capturado",
      PESOS.incomplete_representante
    ));
    actions.push({
      action: "Capturar representante legal.",
      priority: "media",
    });
  }
  if (input.sociosCount === 0) {
    factors.push(mkFactor(
      "incomplete_socios",
      "completitud",
      "Socios / accionistas no capturados",
      PESOS.incomplete_socios
    ));
  }
  if (input.beneficiariosCount === 0) {
    factors.push(mkFactor(
      "incomplete_beneficiario",
      "completitud",
      "Beneficiario controlador no capturado",
      PESOS.incomplete_beneficiario
    ));
  }

  // --- Calculo del score ---
  const score = factors.reduce((sum, f) => {
    if (f.direction === "decrease") return sum;
    return sum + f.points;
  }, 0);

  const hasCritical = factors.some((f) => f.critical);
  const blocked = hasCritical;

  let decision: Decision;
  if (blocked || score >= UMBRAL_HIGH_RISK) {
    decision = "high_risk";
  } else if (score === 0) {
    decision = "safe";
  } else {
    decision = "review_required";
  }

  // Ordenar acciones por prioridad
  const priorityOrder = { alta: 0, media: 1, baja: 2 };
  actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return {
    score: Math.min(score, 100),
    decision,
    blocked,
    factors,
    suggestedActions: actions,
    evaluatedAt: now,
  };
}

function mkFactor(
  id: string,
  category: ScoringFactor["category"],
  description: string,
  config: { puntos: number; critico: boolean }
): ScoringFactor {
  return {
    id,
    category,
    description,
    points: config.puntos,
    direction: config.puntos === 0 ? ("decrease" as const) : ("increase" as const),
    critical: config.critico,
  };
}