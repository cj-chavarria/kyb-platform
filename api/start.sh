#!/usr/bin/env bash
# Script de inicio para Render
# Genera el cliente Prisma (aunque no se use directamente en FastAPI,
# asegura que @prisma/client y las dependencias esten listas) y arranca uvicorn.

set -e

echo "[start] Generando cliente Prisma..."
cd ..
npx prisma generate || echo "[warn] prisma generate fallo, continuando..."

echo "[start] Iniciando uvicorn..."
exec uvicorn main:app --host 0.0.0.0 --port $PORT
