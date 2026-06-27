import { Documento, DocumentType } from "@prisma/client";

export type Seveidad = "material" | "menor";

export interface DiscrepanciaResult {
  campo: string;
  valorEsperado: string;
  valorEncontrado: string;
  documentoOrigen: string;
  severidad: Seveidad;
}

export interface ReconciliacionResult {
  discrepancias: DiscrepanciaResult[];
  totalMateriales: number;
  totalMenores: number;
  checkedAt: Date;
}

function normalize(value: string): string {
  return value
    .toUpperCase()
    .trim()
    .replace(/[.\,;:]/g, "")
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isMateriallyDifferent(a: string, b: string): boolean {
  return normalize(a) !== normalize(b);
}

const DOC_LABELS: Record<DocumentType, string> = {
  acta_constitutiva: "Acta constitutiva",
  identificacion_representante: "Identificación del representante",
  poder_representacion: "Poder / representación",
  comprobante_domicilio: "Comprobante de domicilio",
  rfc: "RFC",
  constancia_situacion_fiscal: "Constancia de situación fiscal",
  manifestacion_protesta: "Manifestación bajo protesta",
  socios_accionistas: "Socios / accionistas",
  beneficiario_controlador: "Beneficiario controlador",
  otro: "Otro",
};

type FormularioData = {
  rfc: string;
  razonSocial: string;
  domicilioFiscal: string;
};

export function reconciliarExpediente(
  documentos: Pick<
    Documento,
    | "id"
    | "tipo"
    | "rfcEnDoc"
    | "razonSocialEnDoc"
    | "domicilioEnDoc"
    | "representanteEnDoc"
    | "fechaEmision"
    | "fechaVencimiento"
  >[],
  formulario: FormularioData
): ReconciliacionResult {
  const discrepancias: DiscrepanciaResult[] = [];

  const csf = documentos.find((d) => d.tipo === "constancia_situacion_fiscal");
  const acta = documentos.find((d) => d.tipo === "acta_constitutiva");
  const comprobante = documentos.find((d) => d.tipo === "comprobante_domicilio");
  const poder = documentos.find((d) => d.tipo === "poder_representacion");
  const identificacion = documentos.find((d) => d.tipo === "identificacion_representante");

  // --- RFC ---
  if (csf?.rfcEnDoc && isMateriallyDifferent(csf.rfcEnDoc, formulario.rfc)) {
    discrepancias.push({
      campo: "RFC",
      valorEsperado: formulario.rfc,
      valorEncontrado: csf.rfcEnDoc,
      documentoOrigen: DOC_LABELS.constancia_situacion_fiscal,
      severidad: "material",
    });
  }
  if (acta?.rfcEnDoc && isMateriallyDifferent(acta.rfcEnDoc, formulario.rfc)) {
    discrepancias.push({
      campo: "RFC",
      valorEsperado: formulario.rfc,
      valorEncontrado: acta.rfcEnDoc,
      documentoOrigen: DOC_LABELS.acta_constitutiva,
      severidad: "material",
    });
  }
  if (csf?.rfcEnDoc && acta?.rfcEnDoc && isMateriallyDifferent(csf.rfcEnDoc, acta.rfcEnDoc)) {
    discrepancias.push({
      campo: "RFC",
      valorEsperado: csf.rfcEnDoc,
      valorEncontrado: acta.rfcEnDoc,
      documentoOrigen: `${DOC_LABELS.constancia_situacion_fiscal} vs ${DOC_LABELS.acta_constitutiva}`,
      severidad: "material",
    });
  }

  // --- Razon social ---
  if (csf?.razonSocialEnDoc && isMateriallyDifferent(csf.razonSocialEnDoc, formulario.razonSocial)) {
    discrepancias.push({
      campo: "Razón social",
      valorEsperado: formulario.razonSocial,
      valorEncontrado: csf.razonSocialEnDoc,
      documentoOrigen: DOC_LABELS.constancia_situacion_fiscal,
      severidad: "material",
    });
  }
  if (acta?.razonSocialEnDoc && isMateriallyDifferent(acta.razonSocialEnDoc, formulario.razonSocial)) {
    discrepancias.push({
      campo: "Razón social",
      valorEsperado: formulario.razonSocial,
      valorEncontrado: acta.razonSocialEnDoc,
      documentoOrigen: DOC_LABELS.acta_constitutiva,
      severidad: "material",
    });
  }

  // --- Domicilio ---
  if (csf?.domicilioEnDoc && isMateriallyDifferent(csf.domicilioEnDoc, formulario.domicilioFiscal)) {
    discrepancias.push({
      campo: "Domicilio",
      valorEsperado: formulario.domicilioFiscal,
      valorEncontrado: csf.domicilioEnDoc,
      documentoOrigen: DOC_LABELS.constancia_situacion_fiscal,
      severidad: "material",
    });
  }
  if (comprobante?.domicilioEnDoc && isMateriallyDifferent(comprobante.domicilioEnDoc, formulario.domicilioFiscal)) {
    discrepancias.push({
      campo: "Domicilio",
      valorEsperado: formulario.domicilioFiscal,
      valorEncontrado: comprobante.domicilioEnDoc,
      documentoOrigen: DOC_LABELS.comprobante_domicilio,
      severidad: "menor",
    });
  }

  // --- Representante legal ---
  if (poder?.representanteEnDoc && identificacion?.representanteEnDoc) {
    if (isMateriallyDifferent(poder.representanteEnDoc, identificacion.representanteEnDoc)) {
      discrepancias.push({
        campo: "Representante legal",
        valorEsperado: poder.representanteEnDoc,
        valorEncontrado: identificacion.representanteEnDoc,
        documentoOrigen: `${DOC_LABELS.poder_representacion} vs ${DOC_LABELS.identificacion_representante}`,
        severidad: "material",
      });
    }
  }

  // --- Fechas: documento vencido antes de emision de otro (inconsistencia cronologica) ---
  const docsConFechas = documentos.filter((d) => d.fechaEmision && d.fechaVencimiento);
  for (const d of docsConFechas) {
    const emision = new Date(d.fechaEmision!);
    const vencimiento = new Date(d.fechaVencimiento!);
    if (vencimiento < emision) {
      discrepancias.push({
        campo: "Cronología de fechas",
        valorEsperado: `Emisión ${emision.toISOString().split("T")[0]}`,
        valorEncontrado: `Vencimiento ${vencimiento.toISOString().split("T")[0]} (anterior a emisión)`,
        documentoOrigen: DOC_LABELS[d.tipo],
        severidad: "menor",
      });
    }
  }

  return {
    discrepancias,
    totalMateriales: discrepancias.filter((d) => d.severidad === "material").length,
    totalMenores: discrepancias.filter((d) => d.severidad === "menor").length,
    checkedAt: new Date(),
  };
}