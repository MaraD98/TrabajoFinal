from .auth import router as auth_router

# Importamos TU router (asegurate que el nombre del archivo sea registro_evento)
from .registro_evento import router as eventos_router 

# Agregamos ambos a la lista que FastAPI va a leer
routers = [
    auth_router,
    eventos_router
]