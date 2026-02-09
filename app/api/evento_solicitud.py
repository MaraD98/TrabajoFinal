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


@router.post(
    "/",
    response_model=SolicitudPublicacionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear solicitud de evento externo",
    description="Permite a un usuario autenticado enviar una solicitud para publicar un evento ciclista."
)
def crear_solicitud_evento(
    solicitud: SolicitudPublicacionCreate,
    enviar: bool = Query(True, description="True: Enviar directamente (estado 2) | False: Guardar borrador (estado 1)"),  # ✅ NUEVO PARÁMETRO
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Crea una solicitud de publicación.
    
    **Parámetros:**
    - `enviar=True` (default): Crea en estado 2 (Pendiente) → Botón "ENVIAR SOLICITUD"
    - `enviar=False`: Crea en estado 1 (Borrador) → Autoguardado automático
    
    **Flujo normal:**
    Usuario completa formulario → Click "ENVIAR SOLICITUD" → enviar=True → Estado 2
    """
    # ✅ CAMBIO: Determinar estado según parámetro
    estado_inicial = 2 if enviar else 1
    
    nueva_solicitud = EventoSolicitudService.crear_solicitud(
        db, 
        solicitud, 
        current_user.id_usuario,
        id_estado_inicial=estado_inicial  # ✅ PASAR ESTADO AL SERVICIO
    )
    return nueva_solicitud


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