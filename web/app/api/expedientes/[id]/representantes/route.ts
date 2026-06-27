import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const representantes = await prisma.representanteLegal.findMany({
      where: { expedienteId: params.id },
      orderBy: { id: "asc" },
    });
    return NextResponse.json(representantes);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al obtener representantes", detail: String(error) },
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
    const { nombre, cargo, rfc } = body;

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

    const rep = await prisma.representanteLegal.create({
      data: {
        expedienteId: params.id,
        nombre: String(nombre).trim(),
        cargo: cargo ? String(cargo).trim() : null,
        rfc: rfc ? String(rfc).toUpperCase().trim() : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        expedienteId: params.id,
        actor: "user",
        accion: "representante.agregado",
        entidad: "RepresentanteLegal",
        entityId: rep.id,
        despues: { nombre, cargo, rfc } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(rep, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al crear representante", detail: String(error) },
      { status: 500 }
    );
  }
}