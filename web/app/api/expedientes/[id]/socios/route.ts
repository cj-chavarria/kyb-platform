import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const socios = await prisma.socioAccionista.findMany({
      where: { expedienteId: params.id },
      orderBy: { id: "asc" },
    });
    return NextResponse.json(socios);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al obtener socios", detail: String(error) },
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
    const { nombre, rfc, porcentaje, tipo } = body;

    if (!nombre) {
      return NextResponse.json(
        { error: "nombre es obligatorio" },
        { status: 400 }
      );
    }
    const tipoValido = tipo === "accionista" ? "accionista" : "socio";

    const expediente = await prisma.expediente.findUnique({
      where: { id: params.id },
    });
    if (!expediente) {
      return NextResponse.json(
        { error: "Expediente no encontrado" },
        { status: 404 }
      );
    }

    const socio = await prisma.socioAccionista.create({
      data: {
        expedienteId: params.id,
        nombre: String(nombre).trim(),
        rfc: rfc ? String(rfc).toUpperCase().trim() : null,
        porcentaje: porcentaje != null ? Number(porcentaje) : null,
        tipo: tipoValido,
      },
    });

    await prisma.auditLog.create({
      data: {
        expedienteId: params.id,
        actor: "user",
        accion: "socio.agregado",
        entidad: "SocioAccionista",
        entityId: socio.id,
        despues: { nombre, rfc, porcentaje, tipo: tipoValido } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(socio, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al crear socio", detail: String(error) },
      { status: 500 }
    );
  }
}