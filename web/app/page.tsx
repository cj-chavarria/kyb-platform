import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, PlusCircle, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <main className="flex-1 p-8 sm:p-12 relative overflow-hidden">
      {/* Subtle background glow effect for dark mode */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="mx-auto max-w-6xl space-y-12 relative z-10">
        <div className="text-center space-y-4 max-w-2xl mx-auto pt-10">
          <div className="inline-flex items-center justify-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-2 ring-1 ring-inset ring-primary/20">
            <ShieldCheck className="mr-2 h-4 w-4" />
            Compliance Seguro
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
            KYB para Comercio Exterior
          </h1>
          <p className="text-lg text-muted-foreground">
            Evalúa el riesgo de personas morales en segundos. Consulta listas del SAT, concilia documentos y obtén una decisión clara.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto mt-10">
          <Card className="bg-card/40 backdrop-blur-md border-border/50 hover:border-border transition-all shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <PlusCircle className="mr-3 h-5 w-5 text-primary" />
                Nuevo Expediente
              </CardTitle>
              <CardDescription>
                Crea un nuevo expediente y comienza la evaluación.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="lg" className="w-full font-medium">
                <Link href="/expedientes/nuevo">Comenzar</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur-md border-border/50 hover:border-border transition-all shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <FileText className="mr-3 h-5 w-5 text-muted-foreground" />
                Listado de Expedientes
              </CardTitle>
              <CardDescription>
                Revisa expedientes existentes y su nivel de riesgo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary" size="lg" className="w-full font-medium">
                <Link href="/expedientes">Ver todos</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
