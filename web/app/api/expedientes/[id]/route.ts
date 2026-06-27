import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const expediente = await prisma.expediente.findUnique({
      where: { id: params.id },
      include: {
        personaMoral: true,
        documentos: { orderBy: { createdAt: "desc" } },
        representantes: true,
        socios: true,
        beneficiarios: true,
        consultas: { orderBy: { fechaHora: "desc" } },
        discrepancias: { orderBy: { createdAt: "desc" } },
        riskAssessments: { orderBy: { createdAt: "desc" }, take: 1 },
        auditLogs: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });

    if (!expediente) {
      return NextResponse.json(
        { error: "Expediente no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(expediente);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al obtener expediente", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { status } = body;

    const validStatuses = [
      "draft",
      "needs_update",
      "ready",
      "review_required",
      "approved",
      "rejected",
    ];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status inválido. Válidos: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const antes = await prisma.expediente.findUnique({
      where: { id: params.id },
    });
    if (!antes) {
      return NextResponse.json(
        { error: "Expediente no encontrado" },
        { status: 404 }
      );
    }

    // Bloquear aprobación manual si el último RiskAssessment tiene blocked=true
    if (status === "approved") {
      const lastAssessment = await prisma.riskAssessment.findFirst({
        where: { expedienteId: params.id },
        orderBy: { createdAt: "desc" },
      });
      if (lastAssessment?.blocked) {
        return NextResponse.json(
          {
            error:
              "No se puede aprobar un expediente con evaluación de alto riesgo (bloqueado).",
          },
          { status: 403 }
        );
      }
    }

    const updated = await prisma.expediente.update({
      where: { id: params.id },
      data: { status },
      include: { personaMoral: true },
    });

    await prisma.auditLog.create({
      data: {
        expedienteId: params.id,
        actor: "user",
        accion: "expediente.status_actualizado",
        entidad: "Expediente",
        entityId: params.id,
        antes: { status: antes.status } as Prisma.InputJsonValue,
        despues: { status } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al actualizar expediente", detail: String(error) },
      { status: 500 }
    );
  }
}
