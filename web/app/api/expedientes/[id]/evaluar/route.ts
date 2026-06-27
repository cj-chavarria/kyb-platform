import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { calculateScore } from "@/lib/scoring";

const STATUS_BY_DECISION: Record<string, string> = {
  safe: "ready",
  review_required: "review_required",
  high_risk: "high_risk",
};

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const expediente = await prisma.expediente.findUnique({
      where: { id: params.id },
      include: {
        personaMoral: true,
        documentos: true,
        representantes: true,
        socios: true,
        beneficiarios: true,
        consultas: { orderBy: { fechaHora: "desc" } },
        discrepancias: { where: { resuelta: false } },
      },
    });

    if (!expediente) {
      return NextResponse.json(
        { error: "Expediente no encontrado" },
        { status: 404 }
      );
    }

    // Construir ScoringInput
    // Tomar la consulta SAT más reciente por artículo
    const consultasPorArticulo = new Map<
      string,
      (typeof expediente.consultas)[number]
    >();
    for (const c of expediente.consultas) {
      if (!consultasPorArticulo.has(c.listado)) {
        consultasPorArticulo.set(c.listado, c);
      }
    }
    const consultasSat = Array.from(consultasPorArticulo.values());

    const scoringResult = calculateScore(
      {
        documentos: expediente.documentos,
        consultasSat,
        discrepancias: expediente.discrepancias,
        representantesCount: expediente.representantes.length,
        sociosCount: expediente.socios.length,
        beneficiariosCount: expediente.beneficiarios.length,
      },
      new Date()
    );

    const newStatus = STATUS_BY_DECISION[scoringResult.decision] || "draft";

    // Persistir RiskAssessment
    const assessment = await prisma.riskAssessment.create({
      data: {
        expedienteId: params.id,
        score: scoringResult.score,
        decision: scoringResult.decision,
        blocked: scoringResult.blocked,
        factors: scoringResult.factors as unknown as Prisma.InputJsonValue,
        suggestedActions:
          scoringResult.suggestedActions as unknown as Prisma.InputJsonValue,
      },
    });

    // Actualizar status
    const updated = await prisma.expediente.update({
      where: { id: params.id },
      data: { status: newStatus },
    });

    await prisma.auditLog.create({
      data: {
        expedienteId: params.id,
        actor: "system",
        accion: "expediente.evaluado",
        entidad: "RiskAssessment",
        entityId: assessment.id,
        antes: { status: expediente.status } as Prisma.InputJsonValue,
        despues: {
          status: newStatus,
          score: scoringResult.score,
          decision: scoringResult.decision,
          blocked: scoringResult.blocked,
          factorsCount: scoringResult.factors.length,
        } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      expedienteId: params.id,
      assessment: {
        id: assessment.id,
        score: scoringResult.score,
        decision: scoringResult.decision,
        blocked: scoringResult.blocked,
        factors: scoringResult.factors,
        suggestedActions: scoringResult.suggestedActions,
        evaluatedAt: scoringResult.evaluatedAt.toISOString(),
      },
      previousStatus: expediente.status,
      newStatus: updated.status,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al evaluar expediente", detail: String(error) },
      { status: 500 }
    );
  }
}