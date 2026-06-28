import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, ListadoFiscal } from "@prisma/client";
import { consultarSat, SatArticuloResultado } from "@/lib/sat-client";

const ARTICULO_TO_LISTADO: Record<string, ListadoFiscal> = {
  ART_69: "ART_69",
  ART_69_B: "ART_69_B",
  ART_69_B_BIS: "ART_69_B_BIS",
  ART_49_BIS: "ART_49_BIS",
};

const REFERENCIA_49_BIS = "ART_49_BIS/indirect";

function construirDetalle(articulo: SatArticuloResultado): string | null {
  if (articulo.coincidencias.length === 0) {
    if (articulo.justificacion) {
      return articulo.justificacion;
    }
    return null;
  }
  const situaciones = articulo.coincidencias
    .map((c) => c.situacion || c.referencia)
    .filter(Boolean);
  const detalle = situaciones.join(", ");
  if (articulo.justificacion) {
    return `${detalle}. ${articulo.justificacion}`;
  }
  return detalle || null;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const expediente = await prisma.expediente.findUnique({
      where: { id: params.id },
      include: { personaMoral: true },
    });

    if (!expediente) {
      return NextResponse.json(
        { error: "Expediente no encontrado" },
        { status: 404 }
      );
    }

    const rfc = expediente.personaMoral.rfc;

    const satResult = await consultarSat(rfc);

    // Borrar consultas previas del mismo expediente para evitar duplicados.
    // Cada click en "Consultar SAT" crea 4 registros nuevos; sin esta limpieza
    // la tabla crece innecesariamente y la UI muestra filas repetidas.
    await prisma.consultaListaFiscal.deleteMany({
      where: { expedienteId: params.id },
    });

    const consultas = await Promise.all(
      Object.entries(satResult.articulos).map(async ([articulo, data]) => {
        const listado = ARTICULO_TO_LISTADO[articulo];
        const detalle = construirDetalle(data);
        const referencia =
          articulo === "ART_49_BIS"
            ? REFERENCIA_49_BIS
            : data.coincidencias[0]?.referencia || articulo;

        return prisma.consultaListaFiscal.create({
          data: {
            expedienteId: params.id,
            rfc,
            listado,
            resultado: data.resultado,
            detalle,
            fuenteUrl:
              data.fuenteUrl ||
              "https://www.sat.gob.mx/minisitio/DatosAbiertos/contribuyentes_publicados.html",
            referencia,
          },
        });
      })
    );

    const resumen = {
      rfc,
      clean: consultas.filter((c) => c.resultado === "clean").length,
      found: consultas.filter((c) => c.resultado === "found").length,
    };

    await prisma.auditLog.create({
      data: {
        expedienteId: params.id,
        actor: "system",
        accion: "listas_fiscales.consultadas",
        entidad: "ConsultaListaFiscal",
        entityId: params.id,
        despues: {
          rfc,
          clean: resumen.clean,
          found: resumen.found,
          checkedAt: satResult.checkedAt,
          detalle: Object.fromEntries(
            Object.entries(satResult.articulos).map(([k, v]) => [
              k,
              v.resultado,
            ])
          ),
        } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      expedienteId: params.id,
      rfc,
      checkedAt: satResult.checkedAt,
      articulos: satResult.articulos,
      consultas: consultas.map((c) => ({
        id: c.id,
        listado: c.listado,
        resultado: c.resultado,
        referencia: c.referencia,
      })),
      resumen,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al consultar listas fiscales", detail: String(error) },
      { status: 500 }
    );
  }
}