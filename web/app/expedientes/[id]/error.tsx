"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SearchX } from "lucide-react";
import Link from "next/link";

export default function ExpedienteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Expediente Error Boundary:", error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] p-8 text-center space-y-6">
      <div className="size-20 bg-muted text-muted-foreground rounded-full flex items-center justify-center">
        <SearchX className="size-10" />
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Expediente no disponible</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          No pudimos cargar los detalles de este expediente. Puede que no exista o haya un error de conexión.
        </p>
      </div>
      <div className="flex items-center gap-4">
        <Button onClick={() => reset()} variant="default">
          Reintentar
        </Button>
        <Button asChild variant="outline">
          <Link href="/expedientes">Ver todos los expedientes</Link>
        </Button>
      </div>
    </div>
  );
}
