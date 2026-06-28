import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { motivo, descripcion } = body;

    if (!motivo || !descripcion) {
      return NextResponse.json(
        { error: "motivo y descripcion son obligatorios" },
        { status: 400 }
      );
    }

    const expediente = await prisma.expediente.findUnique({
      where: { id: params.id },
    });
    if (!expediente) {
      return NextResponse.json(
        { error: "Expediente no encontrado" },
        { status: 404 }
      );
    }

    const statusAnterior = expediente.status;
    const updated = await prisma.expediente.update({
      where: { id: params.id },
      data: { status: "needs_update" },
    });

    await prisma.auditLog.create({
      data: {
        expedienteId: params.id,
        actor: "cliente",
        accion: "cambio.reportado",
        entidad: "Expediente",
        entityId: params.id,
        antes: { status: statusAnterior } as Prisma.InputJsonValue,
        despues: { status: "needs_update", motivo, descripcion } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      expedienteId: params.id,
      previousStatus: statusAnterior,
      newStatus: updated.status,
      motivo,
      descripcion,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al reportar cambio", detail: String(error) },
      { status: 500 }
    );
  }
}
