import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { reconciliarExpediente } from "@/lib/reconciliacion";

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
      },
    });

    if (!expediente) {
      return NextResponse.json(
        { error: "Expediente no encontrado" },
        { status: 404 }
      );
    }

    const result = reconciliarExpediente(
      expediente.documentos,
      {
        rfc: expediente.personaMoral.rfc,
        razonSocial: expediente.personaMoral.razonSocial,
        domicilioFiscal: expediente.personaMoral.domicilioFiscal,
      }
    );

    // Borrar discrepancias previas no resueltas, luego insertar las nuevas
    await prisma.discrepancia.deleteMany({
      where: { expedienteId: params.id, resuelta: false },
    });

    if (result.discrepancias.length > 0) {
      await prisma.discrepancia.createMany({
        data: result.discrepancias.map((d) => ({
          expedienteId: params.id,
          campo: d.campo,
          valorEsperado: d.valorEsperado,
          valorEncontrado: d.valorEncontrado,
          documentoOrigen: d.documentoOrigen,
          severidad: d.severidad,
        })),
      });
    }

    await prisma.auditLog.create({
      data: {
        expedienteId: params.id,
        actor: "system",
        accion: "expediente.conciliado",
        entidad: "Discrepancia",
        entityId: params.id,
        despues: {
          totalDiscrepancias: result.discrepancias.length,
          materiales: result.totalMateriales,
          menores: result.totalMenores,
        } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      expedienteId: params.id,
      discrepancias: result.discrepancias,
      totalMateriales: result.totalMateriales,
      totalMenores: result.totalMenores,
      checkedAt: result.checkedAt.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al conciliar expediente", detail: String(error) },
      { status: 500 }
    );
  }
}