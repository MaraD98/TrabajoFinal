from .auth import router as auth_router
from .evento_solicitud import router as router_evento_solicitud 
from .admin_eventos import router as admin_eventos_router
from .registro_evento import router as eventos_router 
from .editar_evento import router as editar_evento_router 
from .calendario import router as calendario_router
from .reportes import router as reportes_router
from .perfil import router as perfil_router
from .inscripcion import router as inscripcion_router
from .eliminacion_evento import router as eliminacion_evento_router

routers = [ 
           auth_router,
           calendario_router,
           eventos_router,
           router_evento_solicitud,
           admin_eventos_router,
           editar_evento_router,
           perfil_router,
           eliminacion_evento_router,
           inscripcion_router,
           reportes_router
           ]

