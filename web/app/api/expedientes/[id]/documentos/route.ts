import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DocumentType, Prisma } from "@prisma/client";

const VALID_TYPES: DocumentType[] = [
  "acta_constitutiva",
  "identificacion_representante",
  "poder_representacion",
  "comprobante_domicilio",
  "rfc",
  "constancia_situacion_fiscal",
  "manifestacion_protesta",
  "socios_accionistas",
  "beneficiario_controlador",
  "otro",
];

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentos = await prisma.documento.findMany({
      where: { expedienteId: params.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(documentos);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al obtener documentos", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const expediente = await prisma.expediente.findUnique({
      where: { id: params.id },
    });
    if (!expediente) {
      return NextResponse.json(
        { error: "Expediente no encontrado" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      tipo,
      fileUrl,
      fileName,
      fileHash,
      fechaEmision,
      fechaVencimiento,
      rfcEnDoc,
      razonSocialEnDoc,
      domicilioEnDoc,
      representanteEnDoc,
      emitidoPor,
      observaciones,
    } = body;

    if (!tipo || !VALID_TYPES.includes(tipo)) {
      return NextResponse.json(
        { error: `tipo inválido. Válidos: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const documento = await prisma.documento.create({
      data: {
        expedienteId: params.id,
        tipo,
        fileUrl: fileUrl ?? null,
        fileName: fileName ?? null,
        fileHash: fileHash ?? null,
        fechaEmision: fechaEmision ? new Date(fechaEmision) : null,
        fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
        rfcEnDoc: rfcEnDoc ?? null,
        razonSocialEnDoc: razonSocialEnDoc ?? null,
        domicilioEnDoc: domicilioEnDoc ?? null,
        representanteEnDoc: representanteEnDoc ?? null,
        emitidoPor: emitidoPor ?? null,
        observaciones: observaciones ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        expedienteId: params.id,
        actor: "user",
        accion: "documento.agregado",
        entidad: "Documento",
        entityId: documento.id,
        despues: { tipo, fileName } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(documento, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al crear documento", detail: String(error) },
      { status: 500 }
    );
  }
}
