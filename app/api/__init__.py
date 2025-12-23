from .auth import router as auth_router
from .registro_evento import router as eventos_router 
from .editar_evento import router as editar_evento_router 

routers = [
    auth_router,
    eventos_router,
    editar_evento_router
]
