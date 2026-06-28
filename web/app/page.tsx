import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">KYB Platform</h1>
          <p className="text-muted-foreground">
            Evaluación de riesgo para personas morales que operan comercio exterior.
          </p>
        </div>

        <div>
          <Button asChild size="lg">
            <Link href="/expedientes/nuevo">Añadir nuevo expediente</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Expedientes</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/expedientes">Ver expedientes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
