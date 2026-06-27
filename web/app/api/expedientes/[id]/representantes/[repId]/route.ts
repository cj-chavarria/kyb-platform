import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; repId: string } }
) {
  try {
    const antes = await prisma.representanteLegal.findUnique({
      where: { id: params.repId },
    });
    if (!antes || antes.expedienteId !== params.id) {
      return NextResponse.json(
        { error: "Representante no encontrado" },
        { status: 404 }
      );
    }

    await prisma.representanteLegal.delete({
      where: { id: params.repId },
    });

    await prisma.auditLog.create({
      data: {
        expedienteId: params.id,
        actor: "user",
        accion: "representante.eliminado",
        entidad: "RepresentanteLegal",
        entityId: params.repId,
        antes: { nombre: antes.nombre, cargo: antes.cargo, rfc: antes.rfc } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al eliminar representante", detail: String(error) },
      { status: 500 }
    );
  }
}