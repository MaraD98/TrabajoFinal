from fastapi import APIRouter, Depends, status
from fastapi import security
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
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
    description="Permite a un usuario autenticado enviar una solicitud para publicar un evento ciclista. Estado inicial: Pendiente de revisión."
)
def crear_solicitud_evento(
    solicitud: SolicitudPublicacionCreate,
    db: Session = Depends(get_db),
    id_usuario: int = Depends(get_current_user)
):
    nueva_solicitud = EventoSolicitudService.crear_solicitud(db, solicitud, id_usuario)
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
    id_usuario: int = Depends(get_current_user)
):
    solicitudes = EventoSolicitudService.obtener_mis_solicitudes(db, id_usuario)
    return solicitudes

# ============ Consultar solicitud por ID ============
@router.get(
    "/{id_solicitud}",
    response_model=SolicitudPublicacionResponse,
    summary="Consultar solicitud por ID",
    description="Obtiene el detalle y estado actual de una solicitud específica"
)
def consultar_solicitud(id_solicitud: int, db: Session = Depends(get_db)):
    solicitud = EventoSolicitudService.obtener_solicitud(db, id_solicitud)
    return solicitud

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