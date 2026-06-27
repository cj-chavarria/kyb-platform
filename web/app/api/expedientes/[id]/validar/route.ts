import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { validateExpediente } from "@/lib/validations";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const expediente = await prisma.expediente.findUnique({
      where: { id: params.id },
      include: {
        documentos: true,
        personaMoral: true,
        consultas: { orderBy: { fechaHora: "desc" } },
      },
    });

    if (!expediente) {
      return NextResponse.json(
        { error: "Expediente no encontrado" },
        { status: 404 }
      );
    }

    // Tomar la consulta mas reciente por articulo
    const consultasPorArticulo = new Map<string, typeof expediente.consultas[number]>();
    for (const c of expediente.consultas) {
      if (!consultasPorArticulo.has(c.listado)) {
        consultasPorArticulo.set(c.listado, c);
      }
    }
    const consultasSat = Array.from(consultasPorArticulo.values()).map((c) => ({
      listado: c.listado,
      resultado: c.resultado,
      fechaHora: c.fechaHora,
    }));

    const result = validateExpediente(expediente.documentos, consultasSat);

    let statusChanged = false;
    const previousStatus = expediente.status;

    if (result.needsUpdate && expediente.status !== "needs_update") {
      await prisma.expediente.update({
        where: { id: params.id },
        data: { status: "needs_update" },
      });
      statusChanged = true;
    }

    await prisma.auditLog.create({
      data: {
        expedienteId: params.id,
        actor: "system",
        accion: "expediente.validado",
        entidad: "Expediente",
        entityId: params.id,
        antes: { status: previousStatus } as Prisma.InputJsonValue,
        despues: {
          needsUpdate: result.needsUpdate,
          statusChanged,
          missingRequired: result.missingRequired.length,
          expiredDocuments: result.expiredDocuments.length,
          csfOutOfMonth: result.csfOutOfMonth,
          factorsCount: result.factors.length,
        } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      expedienteId: params.id,
      ...result,
      checkedAt: result.checkedAt.toISOString(),
      csfFechaEmision: result.csfFechaEmision?.toISOString() ?? null,
      staleSatCheck: result.staleSatCheck
        ? {
            oldestDate: result.staleSatCheck.oldestDate.toISOString(),
            diasAntiguedad: result.staleSatCheck.diasAntiguedad,
          }
        : null,
      expiredDocuments: result.expiredDocuments.map((d) => ({
        ...d,
        fechaVencimiento: d.fechaVencimiento.toISOString(),
      })),
      previousStatus,
      statusChanged,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al validar expediente", detail: String(error) },
      { status: 500 }
    );
  }
}
