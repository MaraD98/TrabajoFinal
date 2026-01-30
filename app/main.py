from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles 
from app.api import routers
import os

app = FastAPI(
    title="Gestor de Eventos",
    description="API para gestionar usuarios, roles, contactos y eventos con autenticación JWT y PostgreSQL",
    version="1.0.0"
)

# 👇 2. CONFIGURAR LA CARPETA ESTÁTICA
os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


# ==========================================
# 👇 ACÁ ESTÁ EL CAMBIO CLAVE (CORS) 👇
# ==========================================

# Definimos la lista de quiénes tienen permiso para pedir datos
origins = [
    "http://localhost:5173",             # Tu frontend en tu compu (Vite suele usar este)
    "http://localhost:3000",             # Por si usas otro puerto local
    "http://localhost:8000",             # Tu backend local
    "https://trabajofinal-1-5r4j.onrender.com"  # 👈 TU FRONTEND EN RENDER (Sin la barra / al final)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # 👈 Antes tenías ["*"], ahora va la lista "origins"
    allow_credentials=True,      # Esto obliga a que la lista sea específica
    allow_methods=["*"],
    allow_headers=["*"],
)
# ==========================================


# Incluir todos los routers
for r in routers:
    app.include_router(r, prefix="/api/v1")


@app.get("/", tags=["General"], summary="Página principal de la API")
def read_root():
    return {
    "message": "Bienvenido a la API de gestión de eventos",
    "version": "1.0.0",
    "endpoints": {
        "registro": "/api/v1/register",
        "login": "/api/v1/login",
        "perfil": "/api/v1/me"
    },
    "docs": "/docs",
    "redoc": "/redoc"
}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)