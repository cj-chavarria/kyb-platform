import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; bcId: string } }
) {
  try {
    const antes = await prisma.beneficiarioControlador.findUnique({
      where: { id: params.bcId },
    });
    if (!antes || antes.expedienteId !== params.id) {
      return NextResponse.json(
        { error: "Beneficiario no encontrado" },
        { status: 404 }
      );
    }

    await prisma.beneficiarioControlador.delete({
      where: { id: params.bcId },
    });

    await prisma.auditLog.create({
      data: {
        expedienteId: params.id,
        actor: "user",
        accion: "beneficiario.eliminado",
        entidad: "BeneficiarioControlador",
        entityId: params.bcId,
        antes: { nombre: antes.nombre, rfc: antes.rfc, porcentaje: antes.porcentaje } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al eliminar beneficiario", detail: String(error) },
      { status: 500 }
    );
  }
}