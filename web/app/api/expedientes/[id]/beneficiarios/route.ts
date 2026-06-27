import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const beneficiarios = await prisma.beneficiarioControlador.findMany({
      where: { expedienteId: params.id },
      orderBy: { id: "asc" },
    });
    return NextResponse.json(beneficiarios);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al obtener beneficiarios", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { nombre, rfc, porcentaje } = body;

    if (!nombre) {
      return NextResponse.json(
        { error: "nombre es obligatorio" },
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

    const bc = await prisma.beneficiarioControlador.create({
      data: {
        expedienteId: params.id,
        nombre: String(nombre).trim(),
        rfc: rfc ? String(rfc).toUpperCase().trim() : null,
        porcentaje: porcentaje != null ? Number(porcentaje) : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        expedienteId: params.id,
        actor: "user",
        accion: "beneficiario.agregado",
        entidad: "BeneficiarioControlador",
        entityId: bc.id,
        despues: { nombre, rfc, porcentaje } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(bc, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al crear beneficiario", detail: String(error) },
      { status: 500 }
    );
  }
}