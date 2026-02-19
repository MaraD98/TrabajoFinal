from fastapi import APIRouter, Depends, status, Query
from fastapi import security
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.models.auth_models import Usuario
from app.schemas.evento_solicitud_schema import (SolicitudPublicacionCreate, SolicitudPublicacionResponse,TipoEventoResponse, NivelDificultadResponse)
from app.services.evento_solicitud_service import EventoSolicitudService
from app.db.crud.evento_solicitud_crud import Solicitud_PublicacionCRUD
from app.db.database import get_db
from app.core.security import security
from app.services.auth_services import AuthService

router = APIRouter(prefix="/solicitudes-eventos", tags=["Solicitudes de Eventos Externos"])

# --- DEPENDENCIA DE SEGURIDAD (El Portero) ---
def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    # Esto verifica que el token sea válido usando el servicio de tu compañera
    return AuthService.get_current_usuario_from_token(db, credentials.credentials)


# ============================================================================
# ✅ MODIFICADO: CREAR SOLICITUD CON AUTO-APROBACIÓN
# ============================================================================
@router.post(
    "/",
    response_model=SolicitudPublicacionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear solicitud de evento",
    description="""
    Crea una solicitud de publicación de evento.
    
    ✅ NUEVO COMPORTAMIENTO:
    - Admin/Supervisor (rol 1, 2): Auto-aprueba y crea el evento inmediatamente
    - Externo (rol 3): Solicitud pendiente, espera aprobación manual
    
    En ambos casos queda registrada la solicitud → trazabilidad completa.
    """
)
def crear_solicitud_evento(
    solicitud: SolicitudPublicacionCreate,
    enviar: bool = Query(True, description="True: Enviar directamente (estado 2) | False: Guardar borrador (estado 1)"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    ✅ CAMBIO: Ahora se pasa id_rol al servicio para detectar admin y auto-aprobar
    """
    estado_inicial = 2 if enviar else 1
    
    nueva_solicitud = EventoSolicitudService.crear_solicitud(
        db=db,
        solicitud=solicitud,
        id_usuario=current_user.id_usuario,
        id_rol=current_user.id_rol  # ← NUEVO: pasar el rol
    )
    
    return nueva_solicitud
# ============================================================================
# ✅ NUEVO ENDPOINT: Actualizar solicitud (para autoguardado)
# ============================================================================
@router.put(
    "/{id_solicitud}",
    response_model=SolicitudPublicacionResponse,
    summary="Actualizar solicitud existente",
    description="Actualiza una solicitud de evento. Usado para autoguardado de borradores."
)
def actualizar_solicitud_evento(
    id_solicitud: int,
    solicitud: SolicitudPublicacionCreate,
    enviar: bool = Query(False, description="True: Cambiar a Pendiente | False: Mantener como Borrador"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Actualiza una solicitud existente.
    
    **Uso principal:** Autoguardado de borradores cada 30 segundos.
    
    **Parámetros:**
    - `enviar=False` (default): Actualiza sin cambiar estado (borrador)
    - `enviar=True`: Actualiza y envía para revisión (estado 2)
    """
    solicitud_actualizada = EventoSolicitudService.actualizar_solicitud(
        db,
        id_solicitud,
        solicitud,
        current_user.id_usuario,
        enviar=enviar
    )
    return solicitud_actualizada

# ============ Obtener mis solicitudes ============
@router.get(
    "/mis-solicitudes",
    response_model=list[SolicitudPublicacionResponse],
    summary="Obtener mis solicitudes",
    description="Lista todas las solicitudes creadas por el usuario autenticado"
)
def obtener_mis_solicitudes(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    solicitudes = EventoSolicitudService.obtener_mis_solicitudes(db, current_user.id_usuario)
    return solicitudes

# ============ Consultar solicitud por ID ============
@router.get(
    "/{id_solicitud}",
    response_model=SolicitudPublicacionResponse,
    summary="Consultar solicitud por ID",
    description="Obtiene el detalle y estado actual de una solicitud específica"
)
def consultar_solicitud(
    id_solicitud: int, 
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    solicitud = EventoSolicitudService.obtener_solicitud(
        db, id_solicitud, current_user
    )
    return solicitud

@router.patch(
    "/{id_solicitud}/enviar",
    response_model=SolicitudPublicacionResponse,
    summary="Enviar solicitud para revisión",
    description="Cambia el estado del evento de Borrador (1) a Pendiente (2). Solo para borradores guardados."
)
def enviar_solicitud_para_revision(
    id_solicitud: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Envía una solicitud que estaba en borrador.
    
    **Uso:** Cuando el usuario completa un borrador guardado automáticamente
    y hace clic en "📤 Enviar" desde "Mis Eventos → Borradores".
    """
    solicitud_enviada = EventoSolicitudService.enviar_solicitud_para_revision(
        db, id_solicitud, current_user
    )
    return solicitud_enviada

# ============ Listar tipos de evento ============
@router.get(
    "/catalogos/tipos",
    response_model=list[TipoEventoResponse],
    summary="Listar tipos de evento",
    description="Obtiene el catálogo completo de tipos de evento disponibles"
)
def listar_tipos_evento(db: Session = Depends(get_db)):
    tipos = Solicitud_PublicacionCRUD.obtener_tipos_evento(db)
    return tipos

# ============ Listar niveles de dificultad ============
@router.get(
    "/catalogos/dificultades",
    response_model=list[NivelDificultadResponse],
    summary="Listar niveles de dificultad",
    description="Obtiene el catálogo completo de niveles de dificultad"
)
def listar_niveles_dificultad(db: Session = Depends(get_db)):
    dificultades = Solicitud_PublicacionCRUD.obtener_niveles_dificultad(db)
    return dificultades