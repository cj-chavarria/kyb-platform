import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rfc = searchParams.get("rfc");

    const personas = await prisma.personaMoral.findMany({
      where: rfc ? { rfc: { equals: rfc.toUpperCase(), mode: "insensitive" } } : undefined,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { expedientes: true } } },
    });
    return NextResponse.json(personas);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al obtener personas morales", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rfc, razonSocial, domicilioFiscal } = body;

    if (!rfc || !razonSocial || !domicilioFiscal) {
      return NextResponse.json(
        { error: "rfc, razonSocial y domicilioFiscal son obligatorios" },
        { status: 400 }
      );
    }

    const persona = await prisma.personaMoral.create({
      data: {
        rfc: String(rfc).toUpperCase().trim(),
        razonSocial: String(razonSocial).trim(),
        domicilioFiscal: String(domicilioFiscal).trim(),
      },
    });

    return NextResponse.json(persona, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al crear persona moral", detail: String(error) },
      { status: 500 }
    );
  }
}
