"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NuevoExpedientePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [personaId, setPersonaId] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [personaEncontrada, setPersonaEncontrada] = useState<{
    id: string;
    rfc: string;
    razonSocial: string;
  } | null>(null);

  const [rfc, setRfc] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [domicilioFiscal, setDomicilioFiscal] = useState("");

  async function buscarPorRfc() {
    setError(null);
    setBuscando(true);
    try {
      const res = await fetch(`/api/personas?rfc=${encodeURIComponent(rfc)}`);
      if (res.ok) {
        const personas = await res.json();
        if (personas.length > 0) {
          setPersonaEncontrada(personas[0]);
          setPersonaId(personas[0].id);
          setRazonSocial(personas[0].razonSocial);
        } else {
          setPersonaEncontrada(null);
          setPersonaId(null);
        }
      }
    } catch {
      setPersonaEncontrada(null);
    } finally {
      setBuscando(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let pId = personaId;

      if (!pId) {
        const personaRes = await fetch("/api/personas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rfc: rfc.toUpperCase().trim(),
            razonSocial: razonSocial.trim(),
            domicilioFiscal: domicilioFiscal.trim(),
          }),
        });
        if (!personaRes.ok) {
          const err = await personaRes.json();
          throw new Error(err.error ?? "Error al crear persona moral");
        }
        const persona = await personaRes.json();
        pId = persona.id;
      }

      const expRes = await fetch("/api/expedientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaMoralId: pId }),
      });
      if (!expRes.ok) {
        const err = await expRes.json();
        throw new Error(err.error ?? "Error al crear expediente");
      }
      const expediente = await expRes.json();

      router.push(`/expedientes/${expediente.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Link
            href="/expedientes"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Volver a expedientes
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            Nuevo expediente KYB
          </h1>
          <p className="text-sm text-muted-foreground">
            Registra una persona moral y crea su expediente.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Persona moral</CardTitle>
              <CardDescription>
                Busca por RFC o ingresa los datos para registrarla.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rfc">RFC</Label>
                <div className="flex gap-2">
                  <Input
                    id="rfc"
                    value={rfc}
                    onChange={(e) => setRfc(e.target.value)}
                    placeholder="ABC123456X1"
                    required
                    className="font-mono uppercase"
                    onBlur={buscarPorRfc}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={buscarPorRfc}
                    disabled={buscando || !rfc}
                  >
                    {buscando ? "Buscando..." : "Buscar"}
                  </Button>
                </div>
                {personaEncontrada && (
                  <p className="text-xs text-green-600">
                    Persona moral encontrada. Se reutilizará el registro
                    existente.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="razonSocial">Razón social</Label>
                <Input
                  id="razonSocial"
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  placeholder="Mi Empresa S.A. de C.V."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="domicilioFiscal">Domicilio fiscal</Label>
                <Input
                  id="domicilioFiscal"
                  value={domicilioFiscal}
                  onChange={(e) => setDomicilioFiscal(e.target.value)}
                  placeholder="Av. Reforma 100, CDMX, C.P. 06600"
                  required
                  disabled={!!personaId}
                />
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" asChild>
              <Link href="/expedientes">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear expediente"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
