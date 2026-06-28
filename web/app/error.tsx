"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error Boundary:", error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] p-8 text-center space-y-6">
      <div className="size-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center animate-pulse">
        <AlertCircle className="size-10" />
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Algo salió mal</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Ocurrió un error inesperado al procesar tu solicitud. Por favor, intenta de nuevo o regresa al inicio.
        </p>
      </div>
      <div className="flex items-center gap-4">
        <Button onClick={() => reset()} variant="default">
          Intentar de nuevo
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
