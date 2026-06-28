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
import { FileText, PlusCircle, Search } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  needs_update: "Requiere actualización",
  ready: "Listo",
  review_required: "Requiere revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-transparent",
  needs_update: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ready: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  review_required: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  approved: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  rejected: "bg-rose-500/10 text-rose-400 border-rose-500/20",
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
    <main className="flex-1 p-8 sm:p-12 relative z-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Volver al Inicio
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Expedientes KYB</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona y evalúa el riesgo de personas morales.
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link href="/expedientes/nuevo">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo expediente
            </Link>
          </Button>
        </div>

        <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-2xl overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <CardTitle className="text-lg flex items-center">
              <FileText className="mr-2 h-5 w-5 text-muted-foreground" />
              Listado ({expedientes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {expedientes.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Search className="mx-auto h-12 w-12 opacity-20 mb-4" />
                <p>No hay expedientes registrados.</p>
                <Button asChild variant="outline" className="mt-6">
                  <Link href="/expedientes/nuevo">Crear el primero</Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/10">
                    <TableRow className="hover:bg-transparent border-border/50">
                      <TableHead className="py-4">RFC</TableHead>
                      <TableHead>Razón social</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Documentos</TableHead>
                      <TableHead className="text-center">Discrepancias</TableHead>
                      <TableHead className="text-right pr-6">Creado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expedientes.map((exp) => (
                      <TableRow 
                        key={exp.id} 
                        className="group hover:bg-muted/30 border-border/50 transition-colors"
                      >
                        <TableCell className="font-mono font-medium">
                          <Link
                            href={`/expedientes/${exp.id}`}
                            className="text-primary hover:text-primary-foreground hover:underline transition-colors block"
                          >
                            {exp.personaMoral.rfc}
                          </Link>
                        </TableCell>
                        <TableCell className="text-foreground/90 font-medium">
                          {exp.personaMoral.razonSocial}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`font-medium ${STATUS_STYLES[exp.status] ?? STATUS_STYLES.draft}`}>
                            {STATUS_LABELS[exp.status] ?? exp.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center bg-muted/50 rounded-full h-6 px-3 text-xs font-medium border border-border/50">
                            {exp._count.documentos}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center justify-center rounded-full h-6 px-3 text-xs font-medium border ${exp._count.discrepancias > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-muted/50 text-muted-foreground border-border/50'}`}>
                            {exp._count.discrepancias}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground text-right pr-6">
                          {new Date(exp.createdAt).toLocaleDateString("es-MX", { year: 'numeric', month: 'short', day: 'numeric' })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
