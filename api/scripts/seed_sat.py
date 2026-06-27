"""
Seed de las listas fiscales del SAT hacia la tabla SatListRecord en Postgres.

Descarga los CSVs reales y publicos del portal de Datos Abiertos del SAT,
los parsea (manejando los dos formatos: plano para Art 69, con preambulo para
69-B y 69-B Bis) e inserta los registros en la base de datos.

Uso:
    python api/scripts/seed_sat.py

Requiere DATABASE_URL en el .env de la raiz del monorepo.
"""
from __future__ import annotations

import io
import os
import sys
import time
import uuid
import csv
import unicodedata
import datetime
from pathlib import Path

import requests
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from sqlalchemy import create_engine, text

# ---------------------------------------------------------------------------
# Configuracion de fuentes del SAT (Datos Abiertos)
# ---------------------------------------------------------------------------

SAT_BASE = "https://wu1agsprosta001.blob.core.windows.net/agsc-publicaciones/Datos_abiertos"

# Estructura: referencia -> (url, listado, fecha_publicacion_texto)
# listado coincide con el enum de Prisma: ART_69, ART_69_B, ART_69_B_BIS
FUENTES: dict[str, dict] = {
    # --- Articulo 69 (formato plano, cabecera en fila 0) ---
    "ART_69/Exigibles": {
        "url": f"{SAT_BASE}/Documents_AGR/Exigibles.csv",
        "listado": "ART_69",
        "fecha_publicacion": "2026-04-01",
        "formato": "plano",
    },
    "ART_69/Firmes": {
        "url": f"{SAT_BASE}/Documents_AGR/Firmes.csv",
        "listado": "ART_69",
        "fecha_publicacion": "2026-04-01",
        "formato": "plano",
    },
    "ART_69/No_localizados": {
        "url": f"{SAT_BASE}/Documents_AGR/No_localizados.csv",
        "listado": "ART_69",
        "fecha_publicacion": "2026-04-01",
        "formato": "plano",
    },
    "ART_69/Sentencias": {
        "url": f"{SAT_BASE}/Documents_AGR/Sentencias.csv",
        "listado": "ART_69",
        "fecha_publicacion": "2026-04-01",
        "formato": "plano",
    },
    "ART_69/CSDsinefectos": {
        "url": f"{SAT_BASE}/Documents_AGR/CSDsinefectos.csv",
        "listado": "ART_69",
        "fecha_publicacion": "2026-04-01",
        "formato": "plano",
    },
    "ART_69/EntespublicosydeGobiernoomisos": {
        "url": f"{SAT_BASE}/Documents_AGR/EntespublicosydeGobiernoomisos.csv",
        "listado": "ART_69",
        "fecha_publicacion": "2026-04-01",
        "formato": "plano",
    },
    # --- Articulo 69-B (formato con preambulo, cabecera en fila 1) ---
    "ART_69_B/Definitivos": {
        "url": f"{SAT_BASE}/Documents_AGAFF/Definitivos.csv",
        "listado": "ART_69_B",
        "fecha_publicacion": "2026-05-31",
        "formato": "preambulo",
    },
    "ART_69_B/Presuntos": {
        "url": f"{SAT_BASE}/Documents_AGAFF/Presuntos.csv",
        "listado": "ART_69_B",
        "fecha_publicacion": "2026-05-31",
        "formato": "preambulo",
    },
    "ART_69_B/Desvirtuados": {
        "url": f"{SAT_BASE}/Documents_AGAFF/Desvirtuados.csv",
        "listado": "ART_69_B",
        "fecha_publicacion": "2026-05-31",
        "formato": "preambulo",
    },
    "ART_69_B/SentenciasFavorables": {
        "url": f"{SAT_BASE}/Documents_AGAFF/SentenciasFavorables.csv",
        "listado": "ART_69_B",
        "fecha_publicacion": "2026-05-31",
        "formato": "preambulo",
    },
    # --- Articulo 69-B Bis (formato con preambulo, cabecera en fila 1) ---
    "ART_69_B_BIS/Completo": {
        "url": f"{SAT_BASE}/Documents_AGGC/Listado_69_B_Bis_Completo.csv",
        "listado": "ART_69_B_BIS",
        "fecha_publicacion": "2026-03-12",
        "formato": "preambulo",
    },
    "ART_69_B_BIS/Definitivo": {
        "url": f"{SAT_BASE}/Documents_AGGC/Listado_69_B_Bis_Definitivo.csv",
        "listado": "ART_69_B_BIS",
        "fecha_publicacion": "2026-03-12",
        "formato": "preambulo",
    },
}

ENCODINGS = ["latin-1", "utf-8", "cp1252"]
CHUNK_SIZE = 5000


def load_env() -> str:
    """Carga DATABASE_URL desde el .env de la raiz del monorepo."""
    root = Path(__file__).resolve().parent.parent.parent
    env_path = root / ".env"
    db_url = os.getenv("DATABASE_URL")
    if not db_url and env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("DATABASE_URL="):
                db_url = line.split("=", 1)[1].strip().strip('"').strip("'")
                break
    if not db_url:
        print("ERROR: No se encontro DATABASE_URL en variables de entorno ni en .env")
        sys.exit(1)
    return db_url


def descargar_csv(url: str) -> str:
    """Descarga un CSV y devuelve el contenido como texto (latin-1)."""
    resp = requests.get(url, timeout=120)
    resp.raise_for_status()
    raw = resp.content
    for enc in ENCODINGS:
        try:
            return raw.decode(enc)
        except (UnicodeDecodeError, LookupError):
            continue
    return raw.decode("latin-1", errors="replace")


def parsear_csv(contenido: str, formato: str) -> pd.DataFrame:
    """Parsea el CSV segun el formato (plano o preambulo)."""
    if formato == "plano":
        df = pd.read_csv(io.StringIO(contenido), sep=",", dtype=str, encoding_errors="replace")
    else:
        # Formato con preambulo: las filas 0 y 1 son texto legal/titulo,
        # la cabecera real esta en la fila 2, y los datos desde la fila 3.
        df = pd.read_csv(
            io.StringIO(contenido),
            sep=",",
            dtype=str,
            skiprows=2,
            encoding_errors="replace",
        )
    return df


def normalizar_columnas(df: pd.DataFrame) -> pd.DataFrame:
    """Normaliza nombres de columnas a minusculas sin acentos ni espacios."""
    def limpiar(col):
        col = str(col).strip().lower()
        col = unicodedata.normalize("NFKD", col)
        col = "".join(c for c in col if not unicodedata.combining(c))
        col = col.replace(" ", "_")
        return col
    df.columns = [limpiar(c) for c in df.columns]
    return df


def extraer_registro(row, listado: str, fuente_url: str, referencia: str, fecha_pub):
    """Extrae un registro normalizado de una fila del DataFrame."""
    # RFC: columna 'rfc' en ambos formatos
    rfc = str(row.get("rfc", "")).strip().upper()
    if not rfc or rfc == "nan":
        return None

    # Razon social: 'razon_social' (Art 69) o 'nombre_del_contribuyente' (69-B/Bis)
    razon = row.get("razon_social")
    if razon is None or str(razon) == "nan":
        razon = row.get("nombre_del_contribuyente")
    razon = str(razon).strip() if razon and str(razon) != "nan" else None

    # Situacion: 'supuesto' (Art 69) o 'situacion_del_contribuyente' (69-B/Bis)
    situacion = row.get("supuesto")
    if situacion is None or str(situacion) == "nan":
        situacion = row.get("situacion_del_contribuyente")
    situacion = str(situacion).strip() if situacion and str(situacion) != "nan" else None

    return {
        "id": "c" + uuid.uuid4().hex[:24],
        "listado": listado,
        "rfc": rfc,
        "razonSocial": razon,
        "situacion": situacion,
        "detalle": None,
        "fuenteUrl": fuente_url,
        "referencia": referencia,
        "fechaPublicacion": fecha_pub,
        "createdAt": datetime.datetime.utcnow(),
    }


COLUMNS = [
    "id", "listado", "rfc", "razonSocial", "situacion", "detalle",
    "fuenteUrl", "referencia", "fechaPublicacion", "createdAt",
]


def insertar_bulk_copy(conn, registros: list[dict]) -> int:
    """Inserta registros en bulk usando COPY FROM STDIN."""
    if not registros:
        return 0
    col_list = ",".join('"' + c + '"' for c in COLUMNS)
    output = io.StringIO()
    writer = csv.writer(output, delimiter="\t", quoting=csv.QUOTE_MINIMAL)
    for r in registros:
        row = []
        for c in COLUMNS:
            val = r.get(c)
            if val is None:
                row.append("")
            elif isinstance(val, datetime.datetime):
                row.append(val.isoformat())
            else:
                row.append(str(val))
        writer.writerow(row)
    output.seek(0)
    with conn.cursor() as cur:
        cur.copy_expert(
            'COPY "SatListRecord" (' + col_list + ') FROM STDIN WITH (FORMAT CSV, DELIMITER E\'\t\', NULL \'\')',
            output,
        )
    return len(registros)


def limpiar_listado(conn, referencia: str):
    """Borra los registros previos de una referencia (sub-listado) para idempotencia."""
    with conn.cursor() as cur:
        cur.execute('DELETE FROM "SatListRecord" WHERE "referencia" = %s', (referencia,))


def procesar_fuente(conn, nombre: str, config: dict) -> int:
    """Descarga, parsea e inserta una fuente completa."""
    url = config["url"]
    listado = config["listado"]
    fecha_pub = datetime.datetime.strptime(config["fecha_publicacion"], "%Y-%m-%d")
    formato = config["formato"]
    referencia = nombre

    print(f"\n  Descargando {nombre}...")
    t0 = time.time()
    contenido = descargar_csv(url)
    print(f"    Descargado: {len(contenido)} bytes en {time.time()-t0:.1f}s")

    df = parsear_csv(contenido, formato)
    df = normalizar_columnas(df)
    total = len(df)
    print(f"    Parseado: {total} filas, {len(df.columns)} columnas")

    limpiar_listado(conn, referencia)

    insertados = 0
    batch = []
    for _, row in df.iterrows():
        reg = extraer_registro(row, listado, url, referencia, fecha_pub)
        if reg:
            batch.append(reg)
            if len(batch) >= CHUNK_SIZE:
                insertados += insertar_bulk_copy(conn, batch)
                batch = []
                print(f"    ...{insertados}/{total} insertados")
    if batch:
        insertados += insertar_bulk_copy(conn, batch)

    print(f"    Total insertados: {insertados}/{total} en {time.time()-t0:.1f}s")
    return insertados


def main():
    print("=" * 70)
    print("SEED DE LISTAS FISCALES DEL SAT")
    print("=" * 70)

    db_url = load_env()
    engine = create_engine(db_url)
    print(f"Conectado a: {db_url.split('@')[-1].split('/')[0]}...")

    # Usar conexion psycopg2 directa para COPY
    raw_conn = engine.raw_connection()
    total_insertados = 0
    try:
        for nombre, config in FUENTES.items():
            try:
                total_insertados += procesar_fuente(raw_conn, nombre, config)
                raw_conn.commit()
            except Exception as e:
                print(f"  ERROR en {nombre}: {e}")
                raw_conn.rollback()

        # Resumen final
        print("\n" + "=" * 70)
        print("RESUMEN")
        print("=" * 70)
        with raw_conn.cursor() as cur:
            for listado in ["ART_69", "ART_69_B", "ART_69_B_BIS", "ART_49_BIS"]:
                cur.execute('SELECT COUNT(*) FROM "SatListRecord" WHERE "listado" = %s', (listado,))
                count = cur.fetchone()[0]
                print(f"  {listado}: {count} registros")
            cur.execute('SELECT COUNT(*) FROM "SatListRecord"')
            print(f"  TOTAL: {cur.fetchone()[0]} registros")
    finally:
        raw_conn.close()
    print("\nSeed completado.")


if __name__ == "__main__":
    main()
