-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('acta_constitutiva', 'identificacion_representante', 'poder_representacion', 'comprobante_domicilio', 'rfc', 'constancia_situacion_fiscal', 'manifestacion_protesta', 'socios_accionistas', 'beneficiario_controlador', 'otro');

-- CreateEnum
CREATE TYPE "ListadoFiscal" AS ENUM ('ART_69', 'ART_69_B', 'ART_69_B_BIS', 'ART_49_BIS');

-- CreateTable
CREATE TABLE "PersonaMoral" (
    "id" TEXT NOT NULL,
    "rfc" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "domicilioFiscal" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonaMoral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepresentanteLegal" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cargo" TEXT,
    "rfc" TEXT,
    "identificacionId" TEXT,

    CONSTRAINT "RepresentanteLegal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocioAccionista" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rfc" TEXT,
    "porcentaje" DOUBLE PRECISION,
    "tipo" TEXT NOT NULL,

    CONSTRAINT "SocioAccionista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BeneficiarioControlador" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rfc" TEXT,
    "porcentaje" DOUBLE PRECISION,

    CONSTRAINT "BeneficiarioControlador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expediente" (
    "id" TEXT NOT NULL,
    "personaMoralId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expediente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "tipo" "DocumentType" NOT NULL,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileHash" TEXT,
    "fechaEmision" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "rfcEnDoc" TEXT,
    "razonSocialEnDoc" TEXT,
    "domicilioEnDoc" TEXT,
    "representanteEnDoc" TEXT,
    "emitidoPor" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultaListaFiscal" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "rfc" TEXT NOT NULL,
    "listado" "ListadoFiscal" NOT NULL,
    "resultado" TEXT NOT NULL,
    "detalle" TEXT,
    "fuenteUrl" TEXT NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referencia" TEXT NOT NULL,

    CONSTRAINT "ConsultaListaFiscal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discrepancia" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "campo" TEXT NOT NULL,
    "valorEsperado" TEXT NOT NULL,
    "valorEncontrado" TEXT NOT NULL,
    "documentoOrigen" TEXT NOT NULL,
    "severidad" TEXT NOT NULL,
    "resuelta" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Discrepancia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAssessment" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "decision" TEXT NOT NULL,
    "blocked" BOOLEAN NOT NULL,
    "factors" JSONB NOT NULL,
    "suggestedActions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT,
    "actor" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entityId" TEXT,
    "antes" JSONB,
    "despues" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SatListRecord" (
    "id" TEXT NOT NULL,
    "listado" "ListadoFiscal" NOT NULL,
    "rfc" TEXT NOT NULL,
    "razonSocial" TEXT,
    "situacion" TEXT,
    "detalle" TEXT,
    "fuenteUrl" TEXT NOT NULL,
    "referencia" TEXT NOT NULL,
    "fechaPublicacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SatListRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactorConfig" (
    "id" TEXT NOT NULL,
    "factorId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "puntos" INTEGER NOT NULL,
    "direccion" TEXT NOT NULL,
    "critico" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FactorConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonaMoral_rfc_key" ON "PersonaMoral"("rfc");

-- CreateIndex
CREATE INDEX "RepresentanteLegal_expedienteId_idx" ON "RepresentanteLegal"("expedienteId");

-- CreateIndex
CREATE INDEX "SocioAccionista_expedienteId_idx" ON "SocioAccionista"("expedienteId");

-- CreateIndex
CREATE INDEX "BeneficiarioControlador_expedienteId_idx" ON "BeneficiarioControlador"("expedienteId");

-- CreateIndex
CREATE INDEX "Expediente_personaMoralId_idx" ON "Expediente"("personaMoralId");

-- CreateIndex
CREATE INDEX "Documento_expedienteId_idx" ON "Documento"("expedienteId");

-- CreateIndex
CREATE INDEX "ConsultaListaFiscal_expedienteId_idx" ON "ConsultaListaFiscal"("expedienteId");

-- CreateIndex
CREATE INDEX "ConsultaListaFiscal_rfc_idx" ON "ConsultaListaFiscal"("rfc");

-- CreateIndex
CREATE INDEX "Discrepancia_expedienteId_idx" ON "Discrepancia"("expedienteId");

-- CreateIndex
CREATE INDEX "RiskAssessment_expedienteId_idx" ON "RiskAssessment"("expedienteId");

-- CreateIndex
CREATE INDEX "AuditLog_expedienteId_idx" ON "AuditLog"("expedienteId");

-- CreateIndex
CREATE INDEX "SatListRecord_rfc_idx" ON "SatListRecord"("rfc");

-- CreateIndex
CREATE INDEX "SatListRecord_listado_idx" ON "SatListRecord"("listado");

-- CreateIndex
CREATE UNIQUE INDEX "FactorConfig_factorId_key" ON "FactorConfig"("factorId");

-- AddForeignKey
ALTER TABLE "RepresentanteLegal" ADD CONSTRAINT "RepresentanteLegal_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "Expediente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocioAccionista" ADD CONSTRAINT "SocioAccionista_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "Expediente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeneficiarioControlador" ADD CONSTRAINT "BeneficiarioControlador_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "Expediente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expediente" ADD CONSTRAINT "Expediente_personaMoralId_fkey" FOREIGN KEY ("personaMoralId") REFERENCES "PersonaMoral"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "Expediente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultaListaFiscal" ADD CONSTRAINT "ConsultaListaFiscal_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "Expediente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discrepancia" ADD CONSTRAINT "Discrepancia_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "Expediente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "Expediente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "Expediente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
