from fastapi import APIRouter, Depends, Query, status, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.database import get_db
from app.core.security import security
from app.services.auth_services import AuthService
from app.models.auth_models import Usuario
from app.models.registro_models import Evento

# Schemas
from app.schemas.evento_solicitud_schema import (
    SolicitudPublicacionResponse, 
    RevisionSolicitud, 
    SolicitudesPaginadas,
    SolicitudEliminacionResponse
)

# Services y CRUD
from app.services.evento_solicitud_service import EventoSolicitudService
from app.db.crud.evento_solicitud_crud import Solicitud_PublicacionCRUD

# ✅ NUEVO: Importar servicio de eliminación
from app.services.eliminacion_services import EliminacionService
from app.schemas.eliminacion_schema import EliminacionRequest


router = APIRouter(prefix="/admin", tags=["Administración de Eventos"])


# ============================================================================
# SEGURIDAD
# ============================================================================

def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Usuario:
    return AuthService.get_current_usuario_from_token(db, credentials.credentials)


def require_admin(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    if current_user.id_rol not in [1, 2]:  
        raise HTTPException(status_code=403, detail="Acceso restringido a Administradores")
    return current_user


# ============================================================================
# SECCIÓN 1: GESTIÓN DE ALTAS (SOLICITUDES DE PUBLICACIÓN)
# ============================================================================

@router.get(
    "/solicitudes", 
    response_model=SolicitudesPaginadas, 
    summary="Listar todas las solicitudes (Filtros)"
)
def listar_todas(
    id_estado: int = Query(None, description="1=Pendiente, 2=Aprobada..."),
    pagina: int = 1,
    por_pagina: int = 20,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin)
):
    skip = (pagina - 1) * por_pagina
    res = Solicitud_PublicacionCRUD.listar_solicitudes(db, admin, id_estado, skip, por_pagina)
    return SolicitudesPaginadas(
        total=res["total"], 
        solicitudes=res["solicitudes"], 
        pagina=pagina, 
        por_pagina=por_pagina
    )


@router.get(
    "/solicitudes/pendientes", 
    response_model=list[SolicitudPublicacionResponse], 
    summary="Ver Altas Pendientes"
)
def ver_pendientes_alta(db: Session = Depends(get_db), admin: Usuario = Depends(require_admin)):
    """Muestra solicitudes de nuevos eventos esperando aprobación."""
    return Solicitud_PublicacionCRUD.obtener_solicitudes_pendientes(db)


@router.patch(
    "/solicitudes/{id_solicitud}/revisar", 
    summary="Aprobar/Rechazar Alta"
)
def revisar_alta(
    id_solicitud: int,
    revision: RevisionSolicitud,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin)
):
    """
    - Si Estado=3 (Aprobar): Publica el evento visible para todos.
    - Si Estado=4 (Rechazar): Devuelve a borrador o marca rechazado.
    """
    if revision.id_estado_solicitud == 3:
        return EventoSolicitudService.aprobar_solicitud_y_publicar(db, id_solicitud, admin.id_usuario)
    else:
        return Solicitud_PublicacionCRUD.actualizar_estado_solicitud(db, id_solicitud, revision)


# ============================================================================
# SECCIÓN 2: GESTIÓN DE BAJAS (SOLICITUDES DE ELIMINACIÓN)
# ============================================================================

@router.get(
    "/bajas/pendientes", 
    response_model=list[SolicitudEliminacionResponse], 
    summary="Ver Bajas Pendientes"
)
def ver_pendientes_baja(db: Session = Depends(get_db), admin: Usuario = Depends(require_admin)):
    """
    Muestra organizadores que piden borrar un evento YA publicado.
    Solo muestra eventos en estado 6 (Pendiente de Eliminación).
    """
    # ✅ Usar el nuevo servicio
    bajas = EliminacionService.obtener_bajas_pendientes(db)
    
    # Formatear para el schema de respuesta
    return [
        SolicitudEliminacionResponse(
            id_eliminacion=b['id_eliminacion'],
            id_evento=b['id_evento'],
            nombre_evento=b['nombre_evento'],
            motivo=b['motivo'],
            fecha_solicitud=b['fecha_solicitud'],
            usuario_solicitante=b['usuario_solicitante']
        )
        for b in bajas
    ]


@router.patch(
    "/bajas/{id_evento}/aprobar", 
    summary="Aprobar Baja (Soft Delete)"
)
def aprobar_baja_por_evento(
    id_evento: int, 
    db: Session = Depends(get_db), 
    admin: Usuario = Depends(require_admin)
):
    """
    ✅ Aprueba la baja de un evento usando su ID directamente.
    El evento pasa a estado 5 'Cancelado' (Soft Delete).
    """
    return EliminacionService.aprobar_baja(
        db=db, 
        id_evento=id_evento, 
        id_admin=admin.id_usuario
    )


@router.patch(
    "/bajas/{id_evento}/rechazar", 
    summary="Rechazar Baja"
)
def rechazar_baja_por_evento(
    id_evento: int,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin)
):
    """
    ✅ Rechaza la baja usando el ID del evento directamente.
    El evento vuelve a estado 3 (Publicado).
    """
    return EliminacionService.rechazar_baja(db=db, id_evento=id_evento)


# ============================================================================
# SECCIÓN 3: MANTENIMIENTO (DEPURACIÓN DEFINITIVA)
# ============================================================================

@router.delete(
    "/eventos/{id_evento}/depurar", 
    summary="Depuración Definitiva (Hard Delete Lógico)"
)
def depurar_evento(
    id_evento: int, 
    motivo: str = Query(..., description="Razón técnica de la depuración"),
    db: Session = Depends(get_db), 
    admin: Usuario = Depends(require_admin)
):
    """
    ¡PELIGRO! Esto marca el evento como depurado (Estado 7).
    Usar para contenido inapropiado o limpieza de base de datos.
    """
    return EliminacionService.depurar_evento(
        db=db, 
        evento_id=id_evento, 
        motivo=motivo, 
        id_admin=admin.id_usuario
    )


# ============================================================================
# HISTORIAL COMPLETO DE ELIMINACIONES
# ============================================================================

@router.get(
    "/historial-eliminaciones", 
    summary="Historial Completo de Eliminaciones"
)
def obtener_historial_eliminaciones(
    db: Session = Depends(get_db), 
    admin: Usuario = Depends(require_admin)
):
    """
    ✅ Devuelve TODAS las eliminaciones para auditoría.
    
    Muestra eventos que están en:
    - Estado 5 (Cancelado - Soft Delete)
    - Estado 7 (Depurado - Hard Delete Lógico)
    """
    return EliminacionService.obtener_historial(db)
