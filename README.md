# KYB Platform

Plataforma de Know Your Business para agencia aduanal mexicana. Determina si una persona moral es `safe`, `review_required` o `high_risk` para operar comercio exterior, cumpliendo con la Regla 1.4.14 de las RGCE.

## Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui → desplegado en **Vercel**
- **Backend**: FastAPI (Python) → desplegado en **Render**
- **Base de datos**: PostgreSQL en **Neon** (free tier)
- **Listas fiscales**: datos reales descargados de los portales abiertos del SAT (394,762 registros cargados)

> Nota: LangChain quedó fuera del alcance de las 48h para preservar el requisito de score determinista, explicable y testeable.

## Estructura

```
/
├── web/                 # Next.js frontend
├── api/                 # FastAPI backend
├── prisma/              # Schema maestro (Next.js)
├── vercel.json          # Config de Vercel (root project = web/)
├── render.yaml          # Config de Render (root service = api/)
├── .env.example
└── README.md
```

## Despliegue

### Prerrequisitos

- Cuenta en [Vercel](https://vercel.com) (gratis, sin tarjeta).
- Cuenta en [Render](https://render.com) (gratis, sin tarjeta).
- Cuenta en [Neon](https://neon.tech) con la BD ya configurada (la URL ya está en el proyecto).
- Repositorio público en GitHub con el código.

### 1. Subir el código a GitHub

Si no lo has hecho, sube todo a un repositorio público:

```bash
cd "C:\Users\Chava\Desktop\prueba-tecnica-camtom"
git init
git add .
git commit -m "Initial commit"
# Crea un repo en github.com y luego:
git remote add origin https://github.com/TU_USUARIO/kyb-platform.git
git branch -M main
git push -u origin main
```

### 2. Desplegar el backend (FastAPI) en Render

1. Ve a https://dashboard.render.com → **New +** → **Web Service**.
2. Conecta tu repositorio de GitHub `kyb-platform`.
3. Configura:
   - **Name**: `kyb-api`
   - **Region**: Oregon o el más cercano a ti
   - **Branch**: `main`
   - **Root Directory**: `api`
   - **Runtime**: Python
   - **Build Command**: `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free
4. En **Environment Variables** añade:
   - `DATABASE_URL` = la URL de Neon (postgresql://...neon.../neondb?sslmode=require)
   - `CORS_ORIGINS` = (lo dejaremos vacío por ahora, lo pondremos después de desplegar Vercel)
   - `PYTHON_VERSION` = `3.12.5`
5. Click **Create Web Service**.
6. Espera el deploy (5-10 min). Te dará una URL tipo `https://kyb-api-xxxx.onrender.com`.
7. **Anota esta URL**, la necesitaremos para Vercel.

> Nota: Render en el plan Free se "duerme" tras 15 min sin uso. La primera carga tarda ~30s.

### 3. Desplegar el frontend (Next.js) en Vercel

1. Ve a https://vercel.com/dashboard → **Add New...** → **Project**.
2. Importa tu repo `kyb-platform` de GitHub.
3. Configura:
   - **Project Name**: `kyb-platform`
   - **Root Directory**: `web` (clic en "Edit" para cambiarlo)
   - **Framework Preset**: Next.js (se detecta automático)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
4. En **Environment Variables** añade:
   - `DATABASE_URL` = la URL de Neon (la misma que en Render)
   - `NEXT_PUBLIC_API_URL` = la URL de Render del paso anterior (https://kyb-api-xxxx.onrender.com)
5. Click **Deploy**.
6. Espera el deploy (2-5 min). Te dará una URL tipo `https://kyb-platform.vercel.app`.
7. **Anota esta URL**, la necesitaremos para volver a Render.

### 4. Configurar CORS

Vuelve a Render → tu servicio `kyb-api` → **Environment** y edita:

- `CORS_ORIGINS` = la URL de Vercel (https://kyb-platform.vercel.app) — SIN barra al final.

Render redepleará automáticamente. Espera 2-3 min.

### 5. Cargar los datos del SAT en producción (opcional pero recomendado)

Render tiene un plan Free sin acceso a terminal. Para cargar los 394k registros del SAT en producción, hay dos opciones:

**Opción A: Cargar localmente apuntando a la BD de Neon (más fácil)**
```bash
cd api
.venv\Scripts\python.exe scripts/seed_sat.py
```
(Esto usa el `.env` que ya tiene la URL de Neon, así que cargará los datos en la BD de producción.)

**Opción B: Render Shell (plan pago)**
Si tienes plan de pago de Render, puedes abrir un shell y correr el script ahí.

Recomendamos la Opción A.

### 6. Prueba final

Visita tu URL de Vercel (https://kyb-platform.vercel.app) y:
1. Crea una persona moral y un expediente de prueba.
2. Agrega un documento CSF con RFC/razón social correctos.
3. Click en "Validar" → debería pasar la mayoría de checks.
4. Click en "Consultar SAT" → debería mostrar todos los artículos en clean (RFC inventado).
5. Click en "Evaluar riesgo" → debería mostrar el score y decisión.

Si algo falla, revisa los logs de Vercel/Render.

## Setup local (para desarrollo)

### Requisitos

- Node.js >= 20
- Python >= 3.10 (usa `py` en Windows)
- PostgreSQL o URL de Neon

### 1. Instalar dependencias

```bash
# Frontend
npm install
cd web && npm install && cd ..

# Backend
cd api
py -m venv .venv
.venv\Scripts\pip install -r requirements.txt
cd ..
```

### 2. Variables de entorno

Copia `.env.example` a `.env` y llena:
- `DATABASE_URL`: tu URL de Neon
- `NEXT_PUBLIC_API_URL`: `http://localhost:8000`

### 3. Migraciones de Prisma

```bash
npx prisma migrate dev --name init --schema=web/prisma/schema.prisma
```

### 4. Cargar datos del SAT (opcional)

```bash
cd api
.venv\Scripts\python.exe scripts/seed_sat.py
```

### 5. Correr en desarrollo

```bash
# Terminal 1: backend
npm run dev:api

# Terminal 2: frontend
npm run dev:web
```

## Scripts útiles

- `npm run dev:web` — frontend en http://localhost:3000
- `npm run dev:api` — backend en http://localhost:8000
- `npm run db:migrate` — crear/aplicar migraciones
- `npm run db:generate` — regenerar cliente Prisma
- `npm run db:studio` — explorar base de datos
- `npm run test:api` — tests de FastAPI
- `npm test` (en `/web`) — tests del motor de scoring (21/21 pasando)

## Decisiones de arquitectura

- **Score determinista**: el motor de riesgo es puro (sin LLM). Cada factor tiene peso fijo y 21 tests unitarios.
- **Listas SAT reales**: se descargan los archivos abiertos del SAT (Azure Blob Storage público) y se importan a PostgreSQL vía COPY. 394,762 registros cargados.
- **Art 49 Bis CFF**: cobertura indirecta justificada usando CSD sin efectos y No localizados como proxy, documentado en código y README.
- **FastAPI stateless**: recibe el RFC, consulta las listas locales y devuelve resultados. Next.js orquesta, guarda y registra.
- **Auditoría completa**: cada acción (crear, validar, consultar SAT, conciliar, evaluar, cambiar status) genera un registro en `AuditLog`.

## Licencia

MIT
