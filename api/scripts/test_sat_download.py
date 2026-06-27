"""
Prueba de descarga y parseo de un archivo CSV del SAT (Datos Abiertos).
Valida: descarga HTTP, encoding, columnas, muestra de datos.
"""
import sys
import io
import requests
import pandas as pd

URLS = {
    "ART_69_Exigibles": "https://wu1agsprosta001.blob.core.windows.net/agsc-publicaciones/Datos_abiertos/Documents_AGR/Exigibles.csv",
    "ART_69_Firmes": "https://wu1agsprosta001.blob.core.windows.net/agsc-publicaciones/Datos_abiertos/Documents_AGR/Firmes.csv",
    "ART_69_B_Definitivos": "https://wu1agsprosta001.blob.core.windows.net/agsc-publicaciones/Datos_abiertos/Documents_AGAFF/Definitivos.csv",
    "ART_69_B_Presuntos": "https://wu1agsprosta001.blob.core.windows.net/agsc-publicaciones/Datos_abiertos/Documents_AGAFF/Presuntos.csv",
    "ART_69_B_Bis_Completo": "https://wu1agsprosta001.blob.core.windows.net/agsc-publicaciones/Datos_abiertos/Documents_AGGC/Listado_69_B_Bis_Completo.csv",
}

ENCODINGS = ["latin-1", "utf-8", "cp1252"]


def probar_url(nombre: str, url: str) -> None:
    print(f"\n{'=' * 70}")
    print(f"Archivo: {nombre}")
    print(f"URL: {url}")
    print("=" * 70)

    # 1. Descarga
    try:
        resp = requests.get(url, timeout=60)
        resp.raise_for_status()
        print(f"[OK] Descarga HTTP {resp.status_code} - {len(resp.content)} bytes")
        print(f"      Content-Type: {resp.headers.get('Content-Type', 'N/A')}")
    except Exception as e:
        print(f"[FAIL] Descarga: {e}")
        return

    # 2. Detección de encoding
    raw = resp.content
    contenido_texto = None
    encoding_usado = None
    for enc in ENCODINGS:
        try:
            contenido_texto = raw.decode(enc)
            encoding_usado = enc
            print(f"[OK] Encoding: {enc} (decodificó sin error)")
            break
        except (UnicodeDecodeError, LookupError) as e:
            print(f"[--] Encoding {enc}: fallo ({type(e).__name__})")

    if contenido_texto is None:
        print("[FAIL] No se pudo decodificar con ningún encoding probado")
        return

    # 3. Parseo con pandas
    df = None
    separadores = [",", ";", "\t", "|"]
    for sep in separadores:
        try:
            df = pd.read_csv(io.StringIO(contenido_texto), sep=sep, dtype=str, nrows=5)
            num_cols = df.shape[1]
            # Heurística: si solo detecta 1 columna con este separador, probablemente no es el correcto
            if num_cols > 1:
                print(f"[OK] Separador: '{sep}' detectado ({num_cols} columnas)")
                break
            else:
                print(f"[--] Separador '{sep}': solo 1 columna (probablemente incorrecto)")
        except Exception as e:
            print(f"[--] Separador '{sep}': {type(e).__name__}: {e}")

    if df is None or df.shape[1] <= 1:
        print("[FAIL] No se pudo parsear el CSV con ningún separador")
        # Mostrar primeros 500 chars para inspección
        print("\nPrimeros 500 caracteres del contenido:")
        print(contenido_texto[:500])
        return

    # 4. Información del DataFrame completo (conteo real)
    try:
        df_full = pd.read_csv(io.StringIO(contenido_texto), sep=sep, dtype=str)
        print(f"[OK] Filas totales: {len(df_full)}")
    except Exception as e:
        print(f"[WARN] No se pudo leer el archivo completo: {e}")

    # 5. Columnas
    print(f"\nColumnas ({len(df.columns)}):")
    for i, col in enumerate(df.columns):
        print(f"  [{i}] {repr(col)}")

    # 6. Muestra de datos
    print("\nMuestra (primeras 5 filas, primeras 6 columnas):")
    muestra = df.iloc[:5, :6]
    for idx, row in muestra.iterrows():
        print(f"  Fila {idx}:")
        for col in muestra.columns:
            val = str(row[col])[:80]
            print(f"    {col}: {val}")


def main() -> int:
    print("PRUEBA DE DESCARGA Y PARSEO DE ARCHIVOS DEL SAT - DATOS ABIERTOS")
    print("=" * 70)
    for nombre, url in URLS.items():
        try:
            probar_url(nombre, url)
        except Exception as e:
            print(f"\n[FAIL] Error inesperado procesando {nombre}: {e}")
    print("\n" + "=" * 70)
    print("PRUEBA COMPLETADA")
    return 0


if __name__ == "__main__":
    sys.exit(main())
