from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import routers

app = FastAPI(
    title="Gestor de Eventos",
    description="API para gestionar usuarios, roles, contactos y eventos con autenticación JWT y PostgreSQL",
    version="1.0.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Cuando pase a produccion, cambiar esto al dominio permitido
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
    
