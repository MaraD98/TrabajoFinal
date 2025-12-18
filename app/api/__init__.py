from .auth import router as auth_router
from .registro_evento import router as eventos_router 


routers = [
    auth_router,
    eventos_router
]