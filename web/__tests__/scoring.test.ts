import { calculateScore, ScoringInput } from "@/lib/scoring";

function buildInput(overrides: Partial<ScoringInput> = {}): ScoringInput {
  // Por defecto, todos los docs obligatorios presentes con CSF del mes vigente
  const docsPresentes = [
    { id: "d-acta", tipo: "acta_constitutiva" as const, fechaEmision: null, fechaVencimiento: null },
    { id: "d-ine", tipo: "identificacion_representante" as const, fechaEmision: null, fechaVencimiento: null },
    { id: "d-dom", tipo: "comprobante_domicilio" as const, fechaEmision: null, fechaVencimiento: null },
    { id: "d-csf", tipo: "constancia_situacion_fiscal" as const, fechaEmision: new Date("2026-06-01"), fechaVencimiento: null },
    { id: "d-prot", tipo: "manifestacion_protesta" as const, fechaEmision: null, fechaVencimiento: null },
  ];
  return {
    documentos: docsPresentes,
    consultasSat: [],
    discrepancias: [],
    representantesCount: 1,
    sociosCount: 1,
    beneficiariosCount: 1,
    ...overrides,
  };
}

const NOW = new Date("2026-06-27T12:00:00Z");

describe("Scoring engine", () => {
  describe("Expediente limpio", () => {
    it("retorna safe con score 0 cuando no hay factores", () => {
      const result = calculateScore(buildInput(), NOW);
      expect(result.score).toBe(0);
      expect(result.decision).toBe("safe");
      expect(result.blocked).toBe(false);
    });

    it("agrega factor sat_clean cuando las listas estan limpias", () => {
      const result = calculateScore(
        buildInput({
          consultasSat: [
            { listado: "ART_69", resultado: "clean", detalle: null, referencia: "ART_69", fechaHora: NOW },
            { listado: "ART_69_B", resultado: "clean", detalle: null, referencia: "ART_69_B", fechaHora: NOW },
            { listado: "ART_69_B_BIS", resultado: "clean", detalle: null, referencia: "ART_69_B_BIS", fechaHora: NOW },
            { listado: "ART_49_BIS", resultado: "clean", detalle: null, referencia: "ART_49_BIS/indirect", fechaHora: NOW },
          ],
        }),
        NOW
      );
      expect(result.decision).toBe("safe");
      const satClean = result.factors.find((f) => f.id === "sat_clean");
      expect(satClean).toBeDefined();
    });
  });

  describe("Listas SAT", () => {
    it("Art 69-B Definitivo genera high_risk con blocked", () => {
      const result = calculateScore(
        buildInput({
          consultasSat: [
            { listado: "ART_69_B", resultado: "found", detalle: "Definitivo", referencia: "ART_69_B/Definitivos", fechaHora: NOW },
          ],
        }),
        NOW
      );
      expect(result.decision).toBe("high_risk");
      expect(result.blocked).toBe(true);
      const factor = result.factors.find((f) => f.id === "sat_69b_definitivo");
      expect(factor).toBeDefined();
      expect(factor!.points).toBe(100);
      expect(factor!.critical).toBe(true);
    });

    it("Art 69-B Presunto genera review_required", () => {
      const result = calculateScore(
        buildInput({
          consultasSat: [
            { listado: "ART_69_B", resultado: "found", detalle: "Presunto", referencia: "ART_69_B/Presuntos", fechaHora: NOW },
          ],
        }),
        NOW
      );
      expect(result.decision).toBe("review_required");
      expect(result.blocked).toBe(false);
    });

    it("Art 69 Firmes suma 40 puntos", () => {
      const result = calculateScore(
        buildInput({
          consultasSat: [
            { listado: "ART_69", resultado: "found", detalle: "FIRMES", referencia: "ART_69/Firmes", fechaHora: NOW },
          ],
        }),
        NOW
      );
      const factor = result.factors.find((f) => f.id === "sat_69_firmes");
      expect(factor!.points).toBe(40);
    });

    it("Art 49 Bis indirecto con found (CSD sin efectos) suma 60 puntos", () => {
      const result = calculateScore(
        buildInput({
          consultasSat: [
            { listado: "ART_49_BIS", resultado: "found", detalle: "CSD sin efectos", referencia: "ART_49_BIS/indirect", fechaHora: NOW },
          ],
        }),
        NOW
      );
      const factor = result.factors.find((f) => f.id === "sat_49bis_indirect_found");
      expect(factor!.points).toBe(60);
    });

    it("Desvirtuados y Sentencias Favorables suman 0 puntos", () => {
      const result = calculateScore(
        buildInput({
          consultasSat: [
            { listado: "ART_69_B", resultado: "found", detalle: "Desvirtuado", referencia: "ART_69_B/Desvirtuados", fechaHora: NOW },
            { listado: "ART_69_B", resultado: "found", detalle: "Sentencia Favorable", referencia: "ART_69_B/SentenciasFavorables", fechaHora: NOW },
          ],
        }),
        NOW
      );
      const increase = result.factors
        .filter((f) => f.direction === "increase")
        .reduce((s, f) => s + f.points, 0);
      expect(increase).toBe(0);
    });
  });

  describe("Documentos faltantes", () => {
    it("Acta constitutiva faltante genera high_risk con blocked", () => {
      const result = calculateScore(
        buildInput({
          documentos: [
            { id: "d1", tipo: "identificacion_representante", fechaEmision: null, fechaVencimiento: null },
          ],
        }),
        NOW
      );
      expect(result.decision).toBe("high_risk");
      expect(result.blocked).toBe(true);
    });

    it("Otro documento obligatorio faltante suma 15 puntos", () => {
      const result = calculateScore(
        buildInput({
          documentos: [
            { id: "d1", tipo: "acta_constitutiva", fechaEmision: null, fechaVencimiento: null },
          ],
        }),
        NOW
      );
      const factor = result.factors.find((f) => f.id === "missing_manifestacion_protesta");
      expect(factor!.points).toBe(15);
    });
  });

  describe("CSF y vigencias", () => {
    it("CSF del mes vigente NO genera factor", () => {
      const result = calculateScore(
        buildInput({
          documentos: [
            { id: "csf", tipo: "constancia_situacion_fiscal", fechaEmision: new Date("2026-06-01"), fechaVencimiento: null },
          ],
        }),
        NOW
      );
      const factor = result.factors.find((f) => f.id === "csf_out_of_month");
      expect(factor).toBeUndefined();
    });

    it("CSF fuera del mes vigente genera factor +25", () => {
      const result = calculateScore(
        buildInput({
          documentos: [
            { id: "csf", tipo: "constancia_situacion_fiscal", fechaEmision: new Date("2025-01-01"), fechaVencimiento: null },
          ],
        }),
        NOW
      );
      const factor = result.factors.find((f) => f.id === "csf_out_of_month");
      expect(factor!.points).toBe(25);
    });

    it("CSF faltante genera factor +40", () => {
      const result = calculateScore(buildInput({ documentos: [] }), NOW);
      const factor = result.factors.find((f) => f.id === "csf_missing");
      expect(factor!.points).toBe(40);
    });

    it("Documento vencido genera factor +20", () => {
      const result = calculateScore(
        buildInput({
          documentos: [
            { id: "d1", tipo: "comprobante_domicilio", fechaEmision: new Date("2024-01-01"), fechaVencimiento: new Date("2025-01-01") },
          ],
        }),
        NOW
      );
      const factor = result.factors.find((f) => f.id === "expired_d1");
      expect(factor!.points).toBe(20);
    });
  });

  describe("Discrepancias", () => {
    it("Discrepancia material suma 30 puntos", () => {
      const result = calculateScore(
        buildInput({
          discrepancias: [
            { campo: "RFC", severidad: "material" },
            { campo: "Razon social", severidad: "menor" },
          ],
        }),
        NOW
      );
      const mat = result.factors.find((f) => f.id === "discrepancy_material_RFC");
      const men = result.factors.find((f) => f.id === "discrepancy_menor_Razon social");
      expect(mat!.points).toBe(30);
      expect(men!.points).toBe(10);
    });
  });

  describe("Completitud", () => {
    it("Representante, socios y beneficiarios faltantes suman puntos", () => {
      const result = calculateScore(
        buildInput({
          representantesCount: 0,
          sociosCount: 0,
          beneficiariosCount: 0,
        }),
        NOW
      );
      const rep = result.factors.find((f) => f.id === "incomplete_representante");
      const soc = result.factors.find((f) => f.id === "incomplete_socios");
      const bc = result.factors.find((f) => f.id === "incomplete_beneficiario");
      expect(rep!.points).toBe(20);
      expect(soc!.points).toBe(15);
      expect(bc!.points).toBe(15);
    });
  });

  describe("Stale check", () => {
    it("Suma +15 si la consulta SAT mas antigua tiene mas de 3 meses", () => {
      const fourMonthsAgo = new Date("2026-02-01T00:00:00Z");
      const result = calculateScore(
        buildInput({
          consultasSat: [
            { listado: "ART_69", resultado: "clean", detalle: null, referencia: "ART_69", fechaHora: fourMonthsAgo },
          ],
        }),
        NOW
      );
      const factor = result.factors.find((f) => f.id === "stale_sat_check");
      expect(factor!.points).toBe(15);
    });
  });

  describe("Score y decision", () => {
    it("El score se cappea a 100", () => {
      const result = calculateScore(
        buildInput({
          consultasSat: [
            { listado: "ART_69_B", resultado: "found", detalle: "Definitivo", referencia: "ART_69_B/Definitivos", fechaHora: NOW },
            { listado: "ART_69_B_BIS", resultado: "found", detalle: "Definitivo", referencia: "ART_69_B_BIS/Definitivo", fechaHora: NOW },
          ],
        }),
        NOW
      );
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("Score 0 sin factores criticos = safe", () => {
      const result = calculateScore(buildInput(), NOW);
      expect(result.decision).toBe("safe");
    });

    it("Score > 0 y < 80 sin factores criticos = review_required", () => {
      const result = calculateScore(
        buildInput({
          documentos: [
            { id: "d-acta", tipo: "acta_constitutiva", fechaEmision: null, fechaVencimiento: null },
            { id: "d-ine", tipo: "identificacion_representante", fechaEmision: null, fechaVencimiento: null },
            { id: "d-dom", tipo: "comprobante_domicilio", fechaEmision: new Date("2024-01-01"), fechaVencimiento: new Date("2025-01-01") },
            { id: "d-csf", tipo: "constancia_situacion_fiscal", fechaEmision: new Date("2026-06-01"), fechaVencimiento: null },
            { id: "d-prot", tipo: "manifestacion_protesta", fechaEmision: null, fechaVencimiento: null },
          ],
        }),
        NOW
      );
      expect(result.decision).toBe("review_required");
      expect(result.score).toBeLessThan(80);
      expect(result.blocked).toBe(false);
    });

    it("Factor critico = high_risk bloqueado sin importar score", () => {
      const result = calculateScore(
        buildInput({
          documentos: [
            { id: "d1", tipo: "constancia_situacion_fiscal", fechaEmision: new Date("2026-06-01"), fechaVencimiento: null },
          ],
        }),
        NOW
      );
      expect(result.decision).toBe("high_risk");
      expect(result.blocked).toBe(true);
    });
  });

  describe("Determinismo", () => {
    it("El mismo input produce el mismo output", () => {
      const input = buildInput({
        consultasSat: [
          { listado: "ART_69", resultado: "found", detalle: "X", referencia: "ART_69/Firmes", fechaHora: NOW },
          { listado: "ART_69_B", resultado: "found", detalle: "Y", referencia: "ART_69_B/Definitivos", fechaHora: NOW },
        ],
        documentos: [
          { id: "d1", tipo: "acta_constitutiva", fechaEmision: null, fechaVencimiento: null },
        ],
      });
      const r1 = calculateScore(input, NOW);
      const r2 = calculateScore(input, NOW);
      expect(r1.score).toBe(r2.score);
      expect(r1.decision).toBe(r2.decision);
      expect(r1.factors.length).toBe(r2.factors.length);
    });
  });
});