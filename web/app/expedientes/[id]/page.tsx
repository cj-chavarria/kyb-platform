"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  needs_update: "Requiere actualización",
  ready: "Listo",
  review_required: "Requiere revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-transparent",
  needs_update: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ready: "bg-[hsl(var(--safe))]/10 text-[hsl(var(--safe))] border-[hsl(var(--safe))]/20",
  review_required: "bg-[hsl(var(--review))]/10 text-[hsl(var(--review))] border-[hsl(var(--review))]/20",
  approved: "bg-[hsl(var(--safe))]/20 text-[hsl(var(--safe))] font-bold border-[hsl(var(--safe))]/30",
  rejected: "bg-[hsl(var(--high-risk))]/10 text-[hsl(var(--high-risk))] border-[hsl(var(--high-risk))]/20",
};

const DOCUMENT_TYPES: { value: string; label: string }[] = [
  { value: "acta_constitutiva", label: "Acta constitutiva" },
  { value: "identificacion_representante", label: "Identificación del representante" },
  { value: "poder_representacion", label: "Poder / representación" },
  { value: "comprobante_domicilio", label: "Comprobante de domicilio" },
  { value: "constancia_situacion_fiscal", label: "Constancia de situación fiscal" },
  { value: "manifestacion_protesta", label: "Manifestación bajo protesta" },
  { value: "socios_accionistas", label: "Socios / accionistas" },
  { value: "beneficiario_controlador", label: "Beneficiario controlador" },
  { value: "otro", label: "Otro" },
];

type Documento = {
  id: string;
  tipo: string;
  fileName: string | null;
  fileUrl: string | null;
  fechaEmision: string | null;
  fechaVencimiento: string | null;
  rfcEnDoc: string | null;
  razonSocialEnDoc: string | null;
  createdAt: string;
};

type ConsultaListaFiscalUI = {
  id: string;
  rfc: string;
  listado: string;
  resultado: string;
  detalle: string | null;
  fuenteUrl: string;
  fechaHora: string;
  referencia: string;
};

type ConsultaSatUI = {
  rfc: string;
  checkedAt: string;
  articulos: {
    ART_69: SatArticuloUI;
    ART_69_B: SatArticuloUI;
    ART_69_B_BIS: SatArticuloUI;
    ART_49_BIS: SatArticuloUI;
  };
  consultas: { id: string; listado: string; resultado: string; referencia: string }[];
  resumen: { clean: number; found: number };
};

type SatArticuloUI = {
  resultado: string;
  coincidencias: {
    razonSocial: string | null;
    situacion: string | null;
    referencia: string;
    fechaPublicacion: string | null;
  }[];
  fuenteUrl: string | null;
  fechaPublicacion: string | null;
  method?: string;
  justificacion?: string;
  proxyLists?: string[];
};

type DiscrepanciaUI = {
  id: string;
  campo: string;
  valorEsperado: string;
  valorEncontrado: string;
  documentoOrigen: string;
  severidad: string;
  resuelta: boolean;
};

type ConciliacionResultUI = {
  expedienteId: string;
  discrepancias: {
    campo: string;
    valorEsperado: string;
    valorEncontrado: string;
    documentoOrigen: string;
    severidad: string;
  }[];
  totalMateriales: number;
  totalMenores: number;
  checkedAt: string;
};

type RiskAssessmentUI = {
  id: string;
  score: number;
  decision: string;
  blocked: boolean;
  factors: { id: string; category: string; description: string; points: number; direction: string; critical: boolean }[];
  suggestedActions: { action: string; priority: string }[];
  createdAt: string;
};

type EvaluacionResultUI = {
  assessment: RiskAssessmentUI;
  previousStatus: string;
  newStatus: string;
};

type Expediente = {
  id: string;
  status: string;
  createdAt: string;
  personaMoral: {
    rfc: string;
    razonSocial: string;
    domicilioFiscal: string;
  };
  documentos: Documento[];
  representantes: { id: string; nombre: string; cargo: string | null; rfc: string | null }[];
  socios: { id: string; nombre: string; rfc: string | null; porcentaje: number | null; tipo: string }[];
  beneficiarios: { id: string; nombre: string; rfc: string | null; porcentaje: number | null }[];
  consultas: ConsultaListaFiscalUI[];
  discrepancias: DiscrepanciaUI[];
  riskAssessments: RiskAssessmentUI[];
  auditLogs: {
    id: string;
    actor: string;
    accion: string;
    createdAt: string;
  }[];
};

export default function ExpedienteDetallePage() {
  const params = useParams<{ id: string }>();
  const [expediente, setExpediente] = useState<Expediente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/expedientes/${params.id}`);
      if (!res.ok) throw new Error("No se pudo cargar el expediente");
      const data = await res.json();
      setExpediente(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background p-8">
        <p className="text-muted-foreground">Cargando expediente...</p>
      </main>
    );
  }

  if (error || !expediente) {
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="text-destructive">{error ?? "Expediente no encontrado"}</div>
        <Button asChild className="mt-4">
          <Link href="/expedientes">Volver</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="flex-1 p-8 sm:p-12 relative z-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <Link
            href="/expedientes"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Volver a expedientes
          </Link>
          <div className="mt-4 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {expediente.personaMoral.razonSocial}
              </h1>
              <p className="font-mono text-sm text-muted-foreground mt-1 flex items-center gap-2">
                RFC: <span className="text-primary font-bold">{expediente.personaMoral.rfc}</span>
              </p>
            </div>
            <div className="flex flex-col sm:items-end gap-3 shrink-0">
              <Badge className={`text-sm py-1.5 px-4 uppercase tracking-wider font-bold shadow-sm ${STATUS_STYLES[expediente.status] ?? STATUS_STYLES.draft}`} variant="outline">
                {STATUS_LABELS[expediente.status] ?? expediente.status}
              </Badge>
              <ReportarCambioDialog
                expedienteId={expediente.id}
                onChanged={load}
              />
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Datos de la persona moral</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Razón social</dt>
                <dd className="text-sm font-medium">
                  {expediente.personaMoral.razonSocial}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">RFC</dt>
                <dd className="text-sm font-mono font-medium">
                  {expediente.personaMoral.rfc}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Domicilio fiscal</dt>
                <dd className="text-sm font-medium">
                  {expediente.personaMoral.domicilioFiscal}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <DocumentosSection
          expedienteId={expediente.id}
          documentos={expediente.documentos}
          onChanged={load}
        />

        <ValidacionSection expedienteId={expediente.id} onChanged={load} />

        <ListasFiscalesSection
          expedienteId={expediente.id}
          consultasPrevias={expediente.consultas}
          onChanged={load}
        />

        <ScoringSection
          expedienteId={expediente.id}
          assessments={expediente.riskAssessments}
          onChanged={load}
        />

        <ConciliacionSection
          expedienteId={expediente.id}
          discrepanciasPrevias={expediente.discrepancias}
          onChanged={load}
        />

        <PartesSection
          expedienteId={expediente.id}
          representantes={expediente.representantes}
          socios={expediente.socios}
          beneficiarios={expediente.beneficiarios}
          onChanged={load}
        />

        <AuditLogSection logs={expediente.auditLogs} />
      </div>
    </main>
  );
}

function DocumentosSection({
  expedienteId,
  documentos,
  onChanged,
}: {
  expedienteId: string;
  documentos: Documento[];
  onChanged: () => void;
}) {
  const [tipo, setTipo] = useState("");
  const [fileName, setFileName] = useState("");
  const [fechaEmision, setFechaEmision] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [rfcEnDoc, setRfcEnDoc] = useState("");
  const [razonSocialEnDoc, setRazonSocialEnDoc] = useState("");
  const [domicilioEnDoc, setDomicilioEnDoc] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function addDoc(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/expedientes/${expedienteId}/documentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          fileName,
          fechaEmision: fechaEmision || undefined,
          fechaVencimiento: fechaVencimiento || undefined,
          rfcEnDoc: rfcEnDoc || undefined,
          razonSocialEnDoc: razonSocialEnDoc || undefined,
          domicilioEnDoc: domicilioEnDoc || undefined,
        }),
      });
      if (!res.ok) {
        const e2 = await res.json();
        throw new Error(e2.error ?? "Error");
      }
      setTipo("");
      setFileName("");
      setFechaEmision("");
      setFechaVencimiento("");
      setRfcEnDoc("");
      setRazonSocialEnDoc("");
      setDomicilioEnDoc("");
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos ({documentos.length})</CardTitle>
        <CardDescription>
          Registra la metadata auditable de cada documento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {documentos.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Emisión</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>RFC en doc</TableHead>
                <TableHead>Razón social en doc</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentos.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    {DOCUMENT_TYPES.find((t) => t.value === doc.tipo)?.label ??
                      doc.tipo}
                  </TableCell>
                  <TableCell>{doc.fileName ?? "—"}</TableCell>
                  <TableCell>
                    {doc.fechaEmision
                      ? new Date(doc.fechaEmision).toLocaleDateString("es-MX")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {doc.fechaVencimiento
                      ? new Date(doc.fechaVencimiento).toLocaleDateString("es-MX")
                      : "—"}
                  </TableCell>
                  <TableCell className="font-mono">{doc.rfcEnDoc ?? "—"}</TableCell>
                  <TableCell>{doc.razonSocialEnDoc ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <form onSubmit={addDoc} className="grid gap-4 border-t pt-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Tipo de documento</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v ?? "")} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un tipo" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="fileName">Nombre del archivo / referencia</Label>
            <Input
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="CSF_2026-06.pdf"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fechaEmision">Fecha de emisión</Label>
            <Input
              id="fechaEmision"
              type="date"
              value={fechaEmision}
              onChange={(e) => setFechaEmision(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fechaVencimiento">Fecha de vencimiento</Label>
            <Input
              id="fechaVencimiento"
              type="date"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rfcEnDoc">RFC (en documento)</Label>
            <Input
              id="rfcEnDoc"
              value={rfcEnDoc}
              onChange={(e) => setRfcEnDoc(e.target.value)}
              placeholder="ABC123456X1"
              className="font-mono uppercase"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="razonSocialEnDoc">Razón social (en documento)</Label>
            <Input
              id="razonSocialEnDoc"
              value={razonSocialEnDoc}
              onChange={(e) => setRazonSocialEnDoc(e.target.value)}
              placeholder="Mi Empresa S.A. de C.V."
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="domicilioEnDoc">Domicilio (en documento)</Label>
            <Input
              id="domicilioEnDoc"
              value={domicilioEnDoc}
              onChange={(e) => setDomicilioEnDoc(e.target.value)}
              placeholder="Av. Reforma 100, CDMX"
            />
          </div>

          {err && (
            <p className="sm:col-span-2 text-sm text-destructive">{err}</p>
          )}

          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving || !tipo}>
              {saving ? "Agregando..." : "Agregar documento"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

type ValidationFactorUI = {
  id: string;
  category: string;
  description: string;
  severity: "info" | "warning" | "critical";
};

type ValidationResultUI = {
  missingRequired: { tipo: string; label: string; required: boolean }[];
  missingConditional: { tipo: string; label: string; required: boolean }[];
  expiredDocuments: { id: string; tipo: string; label: string; diasVencido: number }[];
  csfOutOfMonth: boolean;
  csfPresent: boolean;
  statusChanged: boolean;
  factors: ValidationFactorUI[];
};

function ValidacionSection({
  expedienteId,
  onChanged,
}: {
  expedienteId: string;
  onChanged: () => void;
}) {
  const [result, setResult] = useState<ValidationResultUI | null>(null);
  const [validating, setValidating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function validar() {
    setValidating(true);
    setErr(null);
    try {
      const res = await fetch(`/api/expedientes/${expedienteId}/validar`, {
        method: "POST",
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? "Error al validar");
      }
      const data = (await res.json()) as ValidationResultUI & {
        statusChanged: boolean;
      };
      setResult(data);
      if (data.statusChanged) onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setValidating(false);
    }
  }

  const severityColor: Record<string, string> = {
    critical: "text-destructive",
    warning: "text-yellow-600",
    info: "text-muted-foreground",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Validación de documentos</CardTitle>
            <CardDescription>
              Verifica documentos obligatorios, vencimientos y vigencia de la CSF.
            </CardDescription>
          </div>
          <Button onClick={validar} disabled={validating}>
            {validating ? "Validando..." : "Validar"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {err && <p className="text-sm text-destructive">{err}</p>}

        {!result && !validating && (
          <p className="text-sm text-muted-foreground">
            Presiona &quot;Validar&quot; para ejecutar las reglas de vigencia y
            completitud.
          </p>
        )}

        {result && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Faltantes oblig.</p>
                <p className="text-xl font-bold">
                  {result.missingRequired.length}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Faltantes condic.</p>
                <p className="text-xl font-bold">
                  {result.missingConditional.length}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Vencidos</p>
                <p className="text-xl font-bold">
                  {result.expiredDocuments.length}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">CSF mes vigente</p>
                <p
                  className={`text-xl font-bold ${
                    result.csfOutOfMonth || !result.csfPresent
                      ? "text-destructive"
                      : "text-green-600"
                  }`}
                >
                  {result.csfPresent
                    ? result.csfOutOfMonth
                      ? "No"
                      : "Sí"
                    : "Sin CSF"}
                </p>
              </div>
            </div>

            {result.statusChanged && (
              <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm">
                El expediente cambió a status{" "}
                <strong>needs_update</strong> por requerir actualización.
              </div>
            )}

            {result.factors.length > 0 ? (
              <ul className="space-y-1.5">
                {result.factors.map((f) => (
                  <li
                    key={f.id}
                    className={`text-sm ${severityColor[f.severity] ?? ""}`}
                  >
                    <span className="font-medium">[{f.severity}]</span>{" "}
                    {f.description}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-green-600">
                Sin hallazgos: todos los documentos obligatorios están presentes
                y vigentes.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

const ARTICULO_LABELS: Record<string, string> = {
  ART_69: "Art. 69 CFF",
  ART_69_B: "Art. 69-B CFF",
  ART_69_B_BIS: "Art. 69-B Bis CFF",
  ART_49_BIS: "Art. 49 Bis CFF",
};

function ListasFiscalesSection({
  expedienteId,
  consultasPrevias,
  onChanged,
}: {
  expedienteId: string;
  consultasPrevias: ConsultaListaFiscalUI[];
  onChanged: () => void;
}) {
  const [resultado, setResultado] = useState<ConsultaSatUI | null>(null);
  const [consultando, setConsultando] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function consultarListas() {
    setConsultando(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/expedientes/${expedienteId}/consultar-listas`,
        { method: "POST" }
      );
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? "Error al consultar listas");
      }
      const data = (await res.json()) as ConsultaSatUI;
      setResultado(data);
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setConsultando(false);
    }
  }

  const mostrarConsultas = resultado
    ? resultado.consultas
    : consultasPrevias.map((c) => ({
        id: c.id,
        listado: c.listado,
        resultado: c.resultado,
        referencia: c.referencia,
      }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Listas fiscales del SAT</CardTitle>
            <CardDescription>
              Consulta en tiempo real contra la mirror local de datos abiertos del SAT.
            </CardDescription>
          </div>
          <Button onClick={consultarListas} disabled={consultando}>
            {consultando ? "Consultando..." : "Consultar SAT"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {err && <p className="text-sm text-destructive">{err}</p>}

        {mostrarConsultas.length > 0 ? (
          <> 
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artículo</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Fecha/hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mostrarConsultas.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {ARTICULO_LABELS[c.listado] ?? c.listado}
                    </TableCell>
                    <TableCell>
                      {c.resultado === "found" ? (
                        <Badge variant="destructive">Encontrado</Badge>
                      ) : c.referencia.includes("indirect") ? (
                        <Badge variant="outline">Limpio (indirecto)</Badge>
                      ) : (
                        <Badge variant="secondary">Limpio</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.referencia}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {consultasPrevias.find((p) => p.id === c.id)
                        ? new Date(
                            consultasPrevias.find((p) => p.id === c.id)!.fechaHora
                          ).toLocaleString("es-MX")
                        : resultado?.checkedAt
                        ? new Date(resultado.checkedAt).toLocaleString("es-MX")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {resultado && (
              <div className="space-y-3 border-t pt-4">
                {Object.entries(resultado.articulos).map(([art, data]) => (
                  <div key={art} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {ARTICULO_LABELS[art] ?? art}
                      </span>
                      {data.resultado === "found" ? (
                        <Badge variant="destructive">Encontrado</Badge>
                      ) : (
                        <Badge variant="secondary">Limpio</Badge>
                      )}
                      {data.method === "indirect_coverage" && (
                        <Badge variant="outline">Cobertura indirecta</Badge>
                      )}
                    </div>
                    {data.coincidencias.length > 0 && (
                      <ul className="ml-4 space-y-0.5">
                        {data.coincidencias.map((co, i) => (
                          <li key={i} className="text-xs text-muted-foreground">
            Situación: <strong>{co.situacion ?? "N/A"}</strong> | Ref: {co.referencia}
                          </li>
                        ))}
                      </ul>
                    )}
                    {data.justificacion && (
                      <p className="ml-4 text-xs text-muted-foreground italic">
                        {data.justificacion}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Presiona &quot;Consultar SAT&quot; para verificar el RFC en las listas
            fiscales del SAT (Art. 69, 69-B, 69-B Bis y 49 Bis).
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ScoringSection({
  expedienteId,
  assessments,
  onChanged,
}: {
  expedienteId: string;
  assessments: RiskAssessmentUI[];
  onChanged: () => void;
}) {
  const [result, setResult] = useState<EvaluacionResultUI | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function evaluar() {
    setEvaluating(true);
    setErr(null);
    try {
      const res = await fetch(`/api/expedientes/${expedienteId}/evaluar`, {
        method: "POST",
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? "Error al evaluar");
      }
      const data = (await res.json()) as EvaluacionResultUI;
      setResult(data);
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setEvaluating(false);
    }
  }

  const latest = result
    ? result.assessment
    : assessments.length > 0
    ? assessments[0]
    : null;

  const decisionColors: Record<string, string> = {
    safe: "bg-[hsl(var(--safe))]/20 text-[hsl(var(--safe))] border-[hsl(var(--safe))]/30",
    review_required: "bg-[hsl(var(--review))]/20 text-[hsl(var(--review))] border-[hsl(var(--review))]/30",
    high_risk: "bg-[hsl(var(--high-risk))]/20 text-[hsl(var(--high-risk))] border-[hsl(var(--high-risk))]/30",
  };

  const decisionLabels: Record<string, string> = {
    safe: "Operable (Bajo Riesgo)",
    review_required: "Requiere revisión (Riesgo Medio)",
    high_risk: "Alto riesgo (Inoperable)",
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-[hsl(var(--high-risk))]";
    if (score > 0) return "text-[hsl(var(--review))]";
    return "text-[hsl(var(--safe))]";
  };
  
  const getStrokeColor = (score: number) => {
    if (score >= 80) return "stroke-[hsl(var(--high-risk))]";
    if (score > 0) return "stroke-[hsl(var(--review))]";
    return "stroke-[hsl(var(--safe))]";
  };

  const circleRadius = 42;
  const circleCircumference = 2 * Math.PI * circleRadius;

  return (
    <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-2xl relative overflow-hidden">
      {latest && (
        <div className={`absolute -right-20 -top-20 w-64 h-64 opacity-[0.15] blur-[80px] rounded-full pointer-events-none ${
          latest.score >= 80 ? 'bg-[hsl(var(--high-risk))]' : latest.score > 0 ? 'bg-[hsl(var(--review))]' : 'bg-[hsl(var(--safe))]'
        }`} />
      )}

      <CardHeader className="border-b border-border/50 bg-muted/10 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Score de Riesgo</CardTitle>
            <CardDescription>
              Motor determinista y explicable de evaluación KYC/KYB.
            </CardDescription>
          </div>
          <Button onClick={evaluar} disabled={evaluating} size="lg" className="font-bold tracking-wide shadow-lg shrink-0">
            {evaluating ? "Evaluando..." : "Evaluar Riesgo"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-8 relative z-10">
        {err && <p className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">{err}</p>}

        {!latest && !evaluating && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Presiona &quot;Evaluar Riesgo&quot; para correr el motor determinista.
            </p>
          </div>
        )}

        {latest && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
            <div className="flex flex-col sm:flex-row items-center gap-8 bg-background/50 p-6 rounded-xl border border-border/50 shadow-inner">
              <div className="relative flex items-center justify-center shrink-0">
                <svg width="120" height="120" className="transform -rotate-90 drop-shadow-md">
                  <circle
                    cx="60"
                    cy="60"
                    r={circleRadius}
                    className="stroke-muted/20 fill-none"
                    strokeWidth="10"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r={circleRadius}
                    className={`${getStrokeColor(latest.score)} fill-none transition-all duration-1000 ease-out`}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circleCircumference}
                    strokeDashoffset={circleCircumference - ((Math.max(1, latest.score)) / 100) * circleCircumference}
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className={`text-4xl font-black tracking-tighter ${getScoreColor(latest.score)}`}>
                    {latest.score}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Score</span>
                </div>
              </div>

              <div className="flex-1 space-y-4 text-center sm:text-left w-full">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Decisión del Motor</p>
                  <Badge
                    className={`text-sm py-1.5 px-4 font-bold uppercase tracking-wider shadow-sm ${decisionColors[latest.decision] ?? ""}`}
                    variant="outline"
                  >
                    {decisionLabels[latest.decision] ?? latest.decision}
                  </Badge>
                  {latest.blocked && (
                    <div className="mt-3 inline-flex items-center gap-2 bg-[hsl(var(--high-risk))]/10 px-3 py-1.5 rounded-md border border-[hsl(var(--high-risk))]/20 mx-auto sm:mx-0">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--high-risk))] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(var(--high-risk))]"></span>
                      </span>
                      <span className="text-sm text-[hsl(var(--high-risk))] font-bold">BLOQUEADO (Rechazo Automático)</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-6 pt-2 border-t border-border/30">
                  <div>
                    <p className="text-xl font-bold text-foreground">{latest.factors.length}</p>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Factores</p>
                  </div>
                  <div className="w-px h-6 bg-border/50"></div>
                  <div>
                    <p className="text-xl font-bold text-[hsl(var(--high-risk))]">{latest.factors.filter((f) => f.critical).length}</p>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Críticos</p>
                  </div>
                </div>
              </div>
            </div>

            {result && (
              <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg flex items-center justify-center gap-2 text-sm text-primary">
                <span className="font-medium text-muted-foreground">Status cambiado:</span>
                <Badge variant="outline" className="opacity-70">{result.previousStatus}</Badge>
                <span>→</span>
                <Badge variant="default" className="font-bold shadow-sm">{result.newStatus}</Badge>
              </div>
            )}

            {latest.factors.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Desglose de factores</h4>
                <div className="rounded-md border border-border/50 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/20">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[120px]">Categoría</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right">Puntos</TableHead>
                        <TableHead className="w-[100px] text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {latest.factors.map((f) => (
                        <TableRow key={f.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="text-xs text-muted-foreground font-medium capitalize">
                            {f.category.replace(/_/g, " ")}
                          </TableCell>
                          <TableCell className="text-sm font-medium">{f.description}</TableCell>
                          <TableCell
                            className={`text-right font-mono font-bold ${
                              f.direction === "increase"
                                ? "text-[hsl(var(--high-risk))]"
                                : "text-[hsl(var(--safe))]"
                            }`}
                          >
                            {f.direction === "increase" ? "+" : ""}
                            {f.points}
                          </TableCell>
                          <TableCell className="text-right">
                            {f.critical && (
                              <Badge variant="outline" className="bg-[hsl(var(--high-risk))]/10 text-[hsl(var(--high-risk))] border-[hsl(var(--high-risk))]/20">Crítico</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-[hsl(var(--safe))]/10 border border-[hsl(var(--safe))]/20 rounded-lg text-center">
                <p className="text-sm font-bold text-[hsl(var(--safe))]">
                  Sin factores de riesgo encontrados. Cliente 100% operable.
                </p>
              </div>
            )}

            {latest.suggestedActions.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Acciones Sugeridas</h4>
                <ul className="grid gap-2">
                  {latest.suggestedActions.map((a, i) => (
                    <li key={i} className="flex items-start gap-3 bg-muted/20 p-3 rounded-lg border border-border/30">
                      <Badge
                        variant="outline"
                        className={`shrink-0 uppercase text-[10px] tracking-wider ${
                          a.priority === "alta"
                            ? "bg-[hsl(var(--high-risk))]/10 text-[hsl(var(--high-risk))] border-[hsl(var(--high-risk))]/20"
                            : a.priority === "media"
                            ? "bg-[hsl(var(--review))]/10 text-[hsl(var(--review))] border-[hsl(var(--review))]/20"
                            : "bg-muted text-muted-foreground border-transparent"
                        }`}
                      >
                        {a.priority}
                      </Badge>
                      <span className="text-sm font-medium leading-tight pt-0.5">{a.action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PartesSection({
  expedienteId,
  representantes,
  socios,
  beneficiarios,
  onChanged,
}: {
  expedienteId: string;
  representantes: { id: string; nombre: string; cargo: string | null; rfc: string | null }[];
  socios: { id: string; nombre: string; rfc: string | null; porcentaje: number | null; tipo: string }[];
  beneficiarios: { id: string; nombre: string; rfc: string | null; porcentaje: number | null }[];
  onChanged: () => void;
}) {
  type Tab = "representantes" | "socios" | "beneficiarios";
  const [tab, setTab] = useState<Tab>("representantes");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Partes</CardTitle>
        <CardDescription>
          Representante legal, socios/accionistas y beneficiario controlador.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 border-b mb-4">
          <button
            type="button"
            onClick={() => setTab("representantes")}
            className={`px-3 py-2 text-sm ${tab === "representantes" ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}
          >
            Representante ({representantes.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("socios")}
            className={`px-3 py-2 text-sm ${tab === "socios" ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}
          >
            Socios / Accionistas ({socios.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("beneficiarios")}
            className={`px-3 py-2 text-sm ${tab === "beneficiarios" ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}
          >
            Beneficiario controlador ({beneficiarios.length})
          </button>
        </div>

        {tab === "representantes" && (
          <RepresentantesTab
            expedienteId={expedienteId}
            representantes={representantes}
            onChanged={onChanged}
          />
        )}
        {tab === "socios" && (
          <SociosTab
            expedienteId={expedienteId}
            socios={socios}
            onChanged={onChanged}
          />
        )}
        {tab === "beneficiarios" && (
          <BeneficiariosTab
            expedienteId={expedienteId}
            beneficiarios={beneficiarios}
            onChanged={onChanged}
          />
        )}
      </CardContent>
    </Card>
  );
}

function RepresentantesTab({
  expedienteId,
  representantes,
  onChanged,
}: {
  expedienteId: string;
  representantes: { id: string; nombre: string; cargo: string | null; rfc: string | null }[];
  onChanged: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [cargo, setCargo] = useState("");
  const [rfc, setRfc] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/expedientes/${expedienteId}/representantes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, cargo: cargo || null, rfc: rfc || null }),
      });
      if (!res.ok) {
        const e2 = await res.json();
        throw new Error(e2.error ?? "Error");
      }
      setNombre(""); setCargo(""); setRfc("");
      onChanged();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (!confirm("¿Eliminar este representante?")) return;
    await fetch(`/api/expedientes/${expedienteId}/representantes/${id}`, {
      method: "DELETE",
    });
    onChanged();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="rep-nombre">Nombre</Label>
          <Input
            id="rep-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Juan Pérez"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rep-cargo">Cargo</Label>
          <Input
            id="rep-cargo"
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            placeholder="Director General"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rep-rfc">RFC</Label>
          <Input
            id="rep-rfc"
            value={rfc}
            onChange={(e) => setRfc(e.target.value)}
            placeholder="PEPJ800101XXX"
            className="font-mono uppercase"
          />
        </div>
        {err && <p className="sm:col-span-3 text-sm text-destructive">{err}</p>}
        <div className="sm:col-span-3">
          <Button type="submit" disabled={saving || !nombre}>
            {saving ? "Agregando..." : "Agregar representante"}
          </Button>
        </div>
      </form>

      {representantes.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>RFC</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {representantes.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.nombre}</TableCell>
                <TableCell>{r.cargo ?? "—"}</TableCell>
                <TableCell className="font-mono">{r.rfc ?? "—"}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => del(r.id)}
                  >
                    Eliminar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function SociosTab({
  expedienteId,
  socios,
  onChanged,
}: {
  expedienteId: string;
  socios: { id: string; nombre: string; rfc: string | null; porcentaje: number | null; tipo: string }[];
  onChanged: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [rfc, setRfc] = useState("");
  const [porcentaje, setPorcentaje] = useState("");
  const [tipo, setTipo] = useState<"socio" | "accionista">("socio");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/expedientes/${expedienteId}/socios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          rfc: rfc || null,
          porcentaje: porcentaje ? Number(porcentaje) : null,
          tipo,
        }),
      });
      if (!res.ok) {
        const e2 = await res.json();
        throw new Error(e2.error ?? "Error");
      }
      setNombre(""); setRfc(""); setPorcentaje(""); setTipo("socio");
      onChanged();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (!confirm("¿Eliminar este socio/accionista?")) return;
    await fetch(`/api/expedientes/${expedienteId}/socios/${id}`, {
      method: "DELETE",
    });
    onChanged();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="soc-nombre">Nombre</Label>
          <Input
            id="soc-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Empresa X S.A. de C.V."
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="soc-tipo">Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo((v ?? "socio") as "socio" | "accionista")}>
            <SelectTrigger id="soc-tipo"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="socio">Socio</SelectItem>
              <SelectItem value="accionista">Accionista</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="soc-rfc">RFC</Label>
          <Input
            id="soc-rfc"
            value={rfc}
            onChange={(e) => setRfc(e.target.value)}
            className="font-mono uppercase"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="soc-pct">% Participación</Label>
          <Input
            id="soc-pct"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={porcentaje}
            onChange={(e) => setPorcentaje(e.target.value)}
            placeholder="25.5"
          />
        </div>
        {err && <p className="sm:col-span-4 text-sm text-destructive">{err}</p>}
        <div className="sm:col-span-4">
          <Button type="submit" disabled={saving || !nombre}>
            {saving ? "Agregando..." : "Agregar socio/accionista"}
          </Button>
        </div>
      </form>

      {socios.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>RFC</TableHead>
              <TableHead className="text-right">%</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {socios.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.nombre}</TableCell>
                <TableCell className="capitalize">{s.tipo}</TableCell>
                <TableCell className="font-mono">{s.rfc ?? "—"}</TableCell>
                <TableCell className="text-right">
                  {s.porcentaje != null ? `${s.porcentaje}%` : "—"}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => del(s.id)}>
                    Eliminar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function BeneficiariosTab({
  expedienteId,
  beneficiarios,
  onChanged,
}: {
  expedienteId: string;
  beneficiarios: { id: string; nombre: string; rfc: string | null; porcentaje: number | null }[];
  onChanged: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [rfc, setRfc] = useState("");
  const [porcentaje, setPorcentaje] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/expedientes/${expedienteId}/beneficiarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          rfc: rfc || null,
          porcentaje: porcentaje ? Number(porcentaje) : null,
        }),
      });
      if (!res.ok) {
        const e2 = await res.json();
        throw new Error(e2.error ?? "Error");
      }
      setNombre(""); setRfc(""); setPorcentaje("");
      onChanged();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (!confirm("¿Eliminar este beneficiario?")) return;
    await fetch(`/api/expedientes/${expedienteId}/beneficiarios/${id}`, {
      method: "DELETE",
    });
    onChanged();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="bc-nombre">Nombre</Label>
          <Input
            id="bc-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Juan Pérez"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="bc-rfc">RFC</Label>
          <Input
            id="bc-rfc"
            value={rfc}
            onChange={(e) => setRfc(e.target.value)}
            className="font-mono uppercase"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="bc-pct">% Participación</Label>
          <Input
            id="bc-pct"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={porcentaje}
            onChange={(e) => setPorcentaje(e.target.value)}
            placeholder="50"
          />
        </div>
        {err && <p className="sm:col-span-3 text-sm text-destructive">{err}</p>}
        <div className="sm:col-span-3">
          <Button type="submit" disabled={saving || !nombre}>
            {saving ? "Agregando..." : "Agregar beneficiario"}
          </Button>
        </div>
      </form>

      {beneficiarios.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>RFC</TableHead>
              <TableHead className="text-right">%</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {beneficiarios.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.nombre}</TableCell>
                <TableCell className="font-mono">{b.rfc ?? "—"}</TableCell>
                <TableCell className="text-right">
                  {b.porcentaje != null ? `${b.porcentaje}%` : "—"}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => del(b.id)}>
                    Eliminar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function ConciliacionSection({
  expedienteId,
  discrepanciasPrevias,
  onChanged,
}: {
  expedienteId: string;
  discrepanciasPrevias: DiscrepanciaUI[];
  onChanged: () => void;
}) {
  const [resultado, setResultado] = useState<ConciliacionResultUI | null>(null);
  const [conciliando, setConciliando] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function conciliar() {
    setConciliando(true);
    setErr(null);
    try {
      const res = await fetch(`/api/expedientes/${expedienteId}/conciliar`, {
        method: "POST",
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? "Error al conciliar");
      }
      const data = (await res.json()) as ConciliacionResultUI;
      setResultado(data);
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setConciliando(false);
    }
  }

  const mostrar = resultado ? resultado.discrepancias : discrepanciasPrevias;
  const totalMat = resultado ? resultado.totalMateriales : discrepanciasPrevias.filter((d) => d.severidad === "material").length;
  const totalMen = resultado ? resultado.totalMenores : discrepanciasPrevias.filter((d) => d.severidad === "menor").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Conciliación de datos</CardTitle>
            <CardDescription>
              Compara datos entre documentos y el formulario del expediente.
            </CardDescription>
          </div>
          <Button onClick={conciliar} disabled={conciliando}>
            {conciliando ? "Conciliando..." : "Conciliar"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {err && <p className="text-sm text-destructive">{err}</p>}

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Discrepancias materiales</p>
            <p className={`text-xl font-bold ${totalMat > 0 ? "text-destructive" : "text-green-600"}`}>
              {totalMat}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Discrepancias menores</p>
            <p className={`text-xl font-bold ${totalMen > 0 ? "text-yellow-600" : "text-green-600"}`}>
              {totalMen}
            </p>
          </div>
        </div>

        {mostrar.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campo</TableHead>
                <TableHead>Esperado</TableHead>
                <TableHead>Encontrado</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Severidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mostrar.map((d, i) => (
                <TableRow key={(d as { id?: string }).id ?? i}>
                  <TableCell className="font-medium">{d.campo}</TableCell>
                  <TableCell className="text-sm">{d.valorEsperado}</TableCell>
                  <TableCell className="text-sm">{d.valorEncontrado}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.documentoOrigen}</TableCell>
                  <TableCell>
                    {d.severidad === "material" ? (
                      <Badge variant="destructive">Material</Badge>
                    ) : (
                      <Badge variant="outline">Menor</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-green-600">
            Sin discrepancias: los datos coinciden entre documentos y formulario.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AuditLogSection({
  logs,
}: {
  logs: Expediente["auditLogs"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit log</CardTitle>
        <CardDescription>Registro de cambios en el expediente.</CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin registros.</p>
        ) : (
          <ul className="space-y-2">
            {logs.map((log) => (
                <li key={log.id} className="flex items-start gap-3 text-sm">
                <span className="text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString("es-MX")}
                </span>
                <span className="font-medium">{log.accion}</span>
                <span className="text-muted-foreground">por {log.actor}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ReportarCambioDialog({
  expedienteId,
  onChanged,
}: {
  expedienteId: string;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function enviar() {
    setSending(true);
    setErr(null);
    setOk(false);
    try {
      const res = await fetch(
        `/api/expedientes/${expedienteId}/reportar-cambio`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ motivo, descripcion }),
        }
      );
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? "Error al reportar cambio");
      }
      setOk(true);
      setMotivo("");
      setDescripcion("");
      onChanged();
      setTimeout(() => {
        setOpen(false);
        setOk(false);
      }, 1500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Reportar cambio
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reportar cambio</DialogTitle>
          <DialogDescription>
            Indica qué cambió. El expediente pasará a <strong>requiere actualización</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {err && <p className="text-sm text-destructive">{err}</p>}
          {ok && (
            <p className="text-sm text-green-600">
              Cambio reportado. El expediente ahora requiere actualización.
            </p>
          )}
          <div className="space-y-1">
            <Label htmlFor="rc-motivo">Motivo</Label>
            <Select value={motivo} onValueChange={(v) => setMotivo(v ?? "")}>
              <SelectTrigger id="rc-motivo">
                <SelectValue placeholder="Selecciona un motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cambio_domicilio">Cambio de domicilio</SelectItem>
                <SelectItem value="cambio_representante">Cambio de representante</SelectItem>
                <SelectItem value="cambio_razon_social">Cambio de razón social</SelectItem>
                <SelectItem value="cambio_socios">Cambio de socios/accionistas</SelectItem>
                <SelectItem value="actualizacion_documentos">Actualización de documentos</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="rc-descripcion">Descripción</Label>
            <Input
              id="rc-descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Detalle del cambio (opcional)"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancelar
          </DialogClose>
          <Button onClick={enviar} disabled={sending || !motivo}>
            {sending ? "Enviando..." : "Reportar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
