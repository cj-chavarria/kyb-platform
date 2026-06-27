import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  needs_update: "Requiere actualización",
  ready: "Listo",
  review_required: "Requiere revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  needs_update: "outline",
  ready: "default",
  review_required: "outline",
  approved: "default",
  rejected: "destructive",
};

export const dynamic = "force-dynamic";

export default async function ExpedientesPage() {
  const expedientes = await prisma.expediente.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      personaMoral: true,
      _count: {
        select: {
          documentos: true,
          discrepancias: true,
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Expedientes KYB</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona y evalúa el riesgo de personas morales.
            </p>
          </div>
          <Button asChild>
            <Link href="/expedientes/nuevo">Nuevo expediente</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Expedientes ({expedientes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {expedientes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No hay expedientes registrados.</p>
                <Button asChild className="mt-4">
                  <Link href="/expedientes/nuevo">Crear el primero</Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RFC</TableHead>
                    <TableHead>Razón social</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Documentos</TableHead>
                    <TableHead className="text-center">Discrepancias</TableHead>
                    <TableHead>Creado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expedientes.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell className="font-mono">
                        <Link
                          href={`/expedientes/${exp.id}`}
                          className="text-primary hover:underline"
                        >
                          {exp.personaMoral.rfc}
                        </Link>
                      </TableCell>
                      <TableCell>{exp.personaMoral.razonSocial}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[exp.status] ?? "secondary"}>
                          {STATUS_LABELS[exp.status] ?? exp.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {exp._count.documentos}
                      </TableCell>
                      <TableCell className="text-center">
                        {exp._count.discrepancias}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(exp.createdAt).toLocaleDateString("es-MX")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
