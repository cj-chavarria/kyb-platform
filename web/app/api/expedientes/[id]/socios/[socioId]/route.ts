import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; socioId: string } }
) {
  try {
    const antes = await prisma.socioAccionista.findUnique({
      where: { id: params.socioId },
    });
    if (!antes || antes.expedienteId !== params.id) {
      return NextResponse.json(
        { error: "Socio no encontrado" },
        { status: 404 }
      );
    }

    await prisma.socioAccionista.delete({
      where: { id: params.socioId },
    });

    await prisma.auditLog.create({
      data: {
        expedienteId: params.id,
        actor: "user",
        accion: "socio.eliminado",
        entidad: "SocioAccionista",
        entityId: params.socioId,
        antes: { nombre: antes.nombre, rfc: antes.rfc, tipo: antes.tipo, porcentaje: antes.porcentaje } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al eliminar socio", detail: String(error) },
      { status: 500 }
    );
  }
}