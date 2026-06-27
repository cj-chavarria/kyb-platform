const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_URL_WEB ||
  "http://localhost:8000";

export interface SatCoincidencia {
  razonSocial: string | null;
  situacion: string | null;
  detalle: string | null;
  fuenteUrl: string;
  referencia: string;
  fechaPublicacion: string | null;
}

export interface SatArticuloResultado {
  resultado: string;
  coincidencias: SatCoincidencia[];
  fuenteUrl: string | null;
  fechaPublicacion: string | null;
  method?: string;
  justificacion?: string;
  proxyLists?: string[];
}

export interface SatConsultaResponse {
  rfc: string;
  checkedAt: string;
  articulos: {
    ART_69: SatArticuloResultado;
    ART_69_B: SatArticuloResultado;
    ART_69_B_BIS: SatArticuloResultado;
    ART_49_BIS: SatArticuloResultado;
  };
}

export async function consultarSat(rfc: string): Promise<SatConsultaResponse> {
  const url = `${API_URL}/sat/${encodeURIComponent(rfc)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Error al consultar SAT: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as SatConsultaResponse;
}

export function getApiUrl(): string {
  return API_URL;
}