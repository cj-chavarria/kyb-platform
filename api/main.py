from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.routers import health, sat

app = FastAPI(
    title="KYB Platform API",
    description="Motor de scoring, conciliacion y consulta de listas fiscales para KYB de personas morales mexicanas.",
    version="0.1.0",
)

origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(sat.router)


@app.get("/")
def root():
    return {"message": "KYB Platform API"}