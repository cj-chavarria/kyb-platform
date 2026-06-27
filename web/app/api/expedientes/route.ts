import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET() {
  try {
    const expedientes = await prisma.expediente.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        personaMoral: true,
        _count: {
          select: {
            documentos: true,
            discrepancias: true,
            riskAssessments: true,
          },
        },
      },
    });
    return NextResponse.json(expedientes);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al obtener expedientes", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { personaMoralId } = body;

    if (!personaMoralId) {
      return NextResponse.json(
        { error: "personaMoralId es obligatorio" },
        { status: 400 }
      );
    }

    const persona = await prisma.personaMoral.findUnique({
      where: { id: personaMoralId },
    });
    if (!persona) {
      return NextResponse.json(
        { error: "Persona moral no encontrada" },
        { status: 404 }
      );
    }

    const expediente = await prisma.expediente.create({
      data: {
        personaMoralId,
        status: "draft",
      },
      include: { personaMoral: true },
    });

    await prisma.auditLog.create({
      data: {
        expedienteId: expediente.id,
        actor: "system",
        accion: "expediente.creado",
        entidad: "Expediente",
        entityId: expediente.id,
        despues: { status: "draft", personaMoralId } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(expediente, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al crear expediente", detail: String(error) },
      { status: 500 }
    );
  }
}
