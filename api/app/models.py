from sqlalchemy import Column, String, DateTime, Integer, Boolean
from sqlalchemy.dialects.postgresql import ENUM
from app.database import Base
import datetime

# Mirror mínimo de las tablas que FastAPI necesita consultar.
# El schema maestro vive en prisma/schema.prisma (Next.js).

class SatListRecord(Base):
    __tablename__ = "SatListRecord"

    id = Column(String, primary_key=True)
    listado = Column(String, nullable=False)
    rfc = Column(String, nullable=False, index=True)
    razonSocial = Column(String, nullable=True)
    situacion = Column(String, nullable=True)
    detalle = Column(String, nullable=True)
    fuenteUrl = Column(String, nullable=False)
    referencia = Column(String, nullable=False)
    fechaPublicacion = Column(DateTime, nullable=True)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
