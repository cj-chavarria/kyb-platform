import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Expedientes</CardTitle>
              <CardDescription>Crea y gestiona expedientes KYB.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/expedientes">Ver expedientes</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Score de riesgo</CardTitle>
              <CardDescription>Determinista, explicable y testeable.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" disabled>
                Ver metodología
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
