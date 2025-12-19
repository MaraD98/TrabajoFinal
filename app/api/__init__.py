from .auth import router as auth_router
from .evento_solicitud import router as router_evento_solicitud 
from .admin_eventos import router as admin_eventos_router

routers = [auth_router, router_evento_solicitud, admin_eventos_router]
