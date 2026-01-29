from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles # Para subir archivos estáticos
from app.api import routers
import os

app = FastAPI(
    title="Gestor de Eventos",
    description="API para gestionar usuarios, roles, contactos y eventos con autenticación JWT y PostgreSQL",
    version="1.0.0"
)
# 👇 2. CONFIGURAR LA CARPETA ESTÁTICA
# Creamos la carpeta si no existe para evitar errores
os.makedirs("static/uploads", exist_ok=True)

# "Mount" significa: Todo lo que vaya a la url /static, búscalo en la carpeta física "static"
app.mount("/static", StaticFiles(directory="static"), name="static")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    
