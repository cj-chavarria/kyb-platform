from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db

router = APIRouter(prefix="/sat", tags=["sat"])

JUSTIFICACION_49_BIS = (
    "El Art. 49 Bis CFF (reforma 2026) establece un procedimiento de verificacion "
    "expres de maximo 24 dias. No genera una lista publica independiente. Su efecto "
    "principal (suspension inmediata del Certificado de Sello Digital) se refleja en "
    "el listado de 'CSD sin efectos' publicado bajo el Art. 69 CFF. Se verifica "
    "indirectamente consultando dicho listado y el de 'No localizados' como proxy."
)


@router.get("/{rfc}")
def consultar_rfc(rfc: str, db: Session = Depends(get_db)):
    rfc = rfc.strip().upper()
    if not rfc:
        raise HTTPException(status_code=400, detail="RFC requerido")

    # --- Art 69 ---
    art69 = consultar_articulo(db, rfc, "ART_69")

    # --- Art 69-B ---
    art69b = consultar_articulo(db, rfc, "ART_69_B")

    # --- Art 69-B Bis ---
    art69bbis = consultar_articulo(db, rfc, "ART_69_B_BIS")

    # --- Art 49 Bis: cobertura indirecta ---
    art49bis = consultar_49_bis_indirecto(db, rfc)

    return {
        "rfc": rfc,
        "checkedAt": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "articulos": {
            "ART_69": art69,
            "ART_69_B": art69b,
            "ART_69_B_BIS": art69bbis,
            "ART_49_BIS": art49bis,
        },
    }


def consultar_articulo(db: Session, rfc: str, listado: str) -> dict:
    sql = text(
        'SELECT "razonSocial", "situacion", "detalle", "fuenteUrl", "referencia", '
        '"fechaPublicacion" FROM "SatListRecord" '
        'WHERE "rfc" = :rfc AND "listado" = :listado'
    )
    rows = db.execute(sql, {"rfc": rfc, "listado": listado}).fetchall()

    if not rows:
        return {
            "resultado": "clean",
            "coincidencias": [],
            "fuenteUrl": None,
            "fechaPublicacion": None,
        }

    coincidencias = []
    for r in rows:
        coincidencias.append({
            "razonSocial": r[0],
            "situacion": r[1],
            "detalle": r[2],
            "fuenteUrl": r[3],
            "referencia": r[4],
            "fechaPublicacion": r[5].isoformat() if r[5] else None,
        })

    return {
        "resultado": "found",
        "coincidencias": coincidencias,
        "fuenteUrl": coincidencias[0]["fuenteUrl"],
        "fechaPublicacion": coincidencias[0]["fechaPublicacion"],
    }


def consultar_49_bis_indirecto(db: Session, rfc: str) -> dict:
    # Proxy 1: CSD sin efectos (referencia ART_69/CSDsinefectos)
    # Proxy 2: No localizados (referencia ART_69/No_localizados)
    sql = text(
        'SELECT "razonSocial", "situacion", "fuenteUrl", "referencia", "fechaPublicacion" '
        'FROM "SatListRecord" '
        'WHERE "rfc" = :rfc AND "referencia" IN (:ref1, :ref2)'
    )
    rows = db.execute(sql, {
        "rfc": rfc,
        "ref1": "ART_69/CSDsinefectos",
        "ref2": "ART_69/No_localizados",
    }).fetchall()

    if not rows:
        return {
            "resultado": "clean",
            "method": "indirect_coverage",
            "justificacion": JUSTIFICACION_49_BIS,
            "proxyLists": ["CSD sin efectos (Art. 69)", "No localizados (Art. 69)"],
            "coincidencias": [],
            "fuenteUrl": "https://www.sat.gob.mx/minisitio/DatosAbiertos/contribuyentes_publicados.html",
            "fechaPublicacion": None,
        }

    coincidencias = []
    for r in rows:
        coincidencias.append({
            "razonSocial": r[0],
            "situacion": r[1],
            "fuenteUrl": r[2],
            "referencia": r[3],
            "fechaPublicacion": r[4].isoformat() if r[4] else None,
        })

    return {
        "resultado": "found",
        "method": "indirect_coverage",
        "justificacion": JUSTIFICACION_49_BIS,
        "proxyLists": ["CSD sin efectos (Art. 69)", "No localizados (Art. 69)"],
        "coincidencias": coincidencias,
        "fuenteUrl": "https://www.sat.gob.mx/minisitio/DatosAbiertos/contribuyentes_publicados.html",
        "fechaPublicacion": coincidencias[0]["fechaPublicacion"],
    }
