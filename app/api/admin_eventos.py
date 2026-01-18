from fastapi import APIRouter, Depends, Query, status, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.evento_solicitud_schema import (SolicitudPublicacionResponse, RevisionSolicitud, SolicitudesPaginadas)
from app.db.crud.evento_solicitud_crud import Solicitud_PublicacionCRUD
from app.db.crud import registro_crud
from app.models.auth_models import Usuario
from app.core.security import security
from app.services.auth_services import AuthService
from app.services.evento_permisos_service import EventoPermisosService
from app.services.evento_solicitud_service import EventoSolicitudService # Importamos el servicio de solicitudes

router = APIRouter(prefix="/admin/solicitudes", tags=["Administración de Solicitudes"])

# TODO: Agregar dependencia de autenticación de administrador
# from app.core.security import require_admin_role
# Depends(require_admin_role)
# --- DEPENDENCIA DE SEGURIDAD (El Portero Administrador) ---

# ============== DEPENDENCIAS ==============

def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Usuario:
    return AuthService.get_current_usuario_from_token(db, credentials.credentials)


def require_admin(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    if current_user.id_rol not in [1, 2]:  
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden acceder a este recurso"
        )
    return current_user




@router.get(
    "/",
    response_model=SolicitudesPaginadas,
    summary="Listar todas las solicitudes",
)
def listar_todas_solicitudes(
    id_estado_solicitud: int = Query(None, ge=1, le=4, description="Filtro por estado: 1=Pendiente, 2=Aprobada, 3=Rechazada"),
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin)  # Aquí ya tienes al usuario validado
):
    skip = (pagina - 1) * por_pagina
    
    # <--- AQUÍ ESTABA EL ERROR DE CONEXIÓN --->
    resultado = Solicitud_PublicacionCRUD.listar_solicitudes(
        db=db,
        usuario_solicitante=admin,   # <--- Le pasamos el objeto 'admin' (Usuario)
        id_estado_solicitud=id_estado_solicitud,
        skip=skip,
        limit=por_pagina
    )
    
    return SolicitudesPaginadas(
        total=resultado["total"],
        solicitudes=resultado["solicitudes"],
        pagina=pagina,
        por_pagina=por_pagina
    )

# ============ Listar solicitudes pendientes ============
@router.get(
    "/pendientes",
    response_model=list[SolicitudPublicacionResponse],
    summary="Listar solicitudes pendientes",
    description="Vista rápida de todas las solicitudes que esperan revisión (Estado 2)"
)
def listar_pendientes(
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin)
):
    # Ahora el CRUD filtrará por id=2 correctamente
    solicitudes = Solicitud_PublicacionCRUD.obtener_solicitudes_pendientes(db)
    return solicitudes


# ============ Listar solicitudes aprobadas ============
@router.get(
    "/aprobadas",
    response_model=list[SolicitudPublicacionResponse],
    summary="Listar solicitudes aprobadas",
    description="Obtiene todas las solicitudes que han sido aprobadas y están publicadas"
)
def listar_aprobadas(db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin)):
    solicitudes = Solicitud_PublicacionCRUD.obtener_solicitudes_aprobadas(db)
    return solicitudes

# ============ Obtener detalle de solicitud ============
@router.get(
    "/{id_solicitud}",
    response_model=SolicitudPublicacionResponse,
    summary="Obtener detalle de solicitud",
    description="Consulta completa de una solicitud específica con todos sus datos"
)
def obtener_detalle_solicitud(id_solicitud: int, db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin)):
    solicitud = Solicitud_PublicacionCRUD.obtener_solicitud_detallada(db, id_solicitud)
    
    if not solicitud:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Solicitud con ID {id_solicitud} no encontrada"
        )
    
    return solicitud

# ============ Revisar solicitud (MODIFICADO) ============
@router.patch(
    "/{id_solicitud}/revisar",
    response_model=SolicitudPublicacionResponse,
    summary="Revisar y cambiar estado de solicitud",
    description="Si se Aprueba (estado 3), se crea automáticamente el Evento Publicado. Si se Rechaza, solo cambia el estado."
)
def revisar_solicitud(
    id_solicitud: int,
    revision: RevisionSolicitud,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin)
):

   # (Tu lógica existente para aprobar publicaciones)
    if revision.id_estado_solicitud == 3: # Aprobado
        EventoSolicitudService.aprobar_solicitud_y_publicar(db=db, id_solicitud=id_solicitud, id_admin=admin.id_usuario)
        return Solicitud_PublicacionCRUD.obtener_solicitud_detallada(db, id_solicitud)
    else:
        return Solicitud_PublicacionCRUD.actualizar_estado_solicitud(db, id_solicitud, revision)

# =================================================================
#  NUEVO: GESTIÓN DE ELIMINACIONES(4.1-4.2) Y LIMPIEZA(4.3)
# =================================================================

# CASO 2: Admin Aprueba Solicitud de Baja -> Pasa de 6 a 5
@router.patch("/eventos/{evento_id}/aprobar-baja", summary="Aprobar solicitud de baja (Admin)")
def aprobar_baja_evento(
    evento_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """
    Aprueba una solicitud de baja (Estado 6).
    El evento pasa a 'Cancelado' (Estado 5) para que quede en el historial.
    """
    # Reutilizamos la lógica del CRUD para pasar a estado 5
    return registro_crud.cancelar_evento(db, evento_id, motivo="Baja aprobada por Admin")

# CASO 3: Mantenimiento / Limpieza -> Pasa a Estado 7
@router.patch("/eventos/{evento_id}/limpiar-definitivo", tags=["Admin Mantenimiento"])
def limpiar_evento_definitivo(
    evento_id: int,
    motivo: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """
    LIMPIEZA PROFUNDA: Mueve el evento a 'Depurado' (Estado 7).
    - Desaparece de la app principal.
    - Queda disponible para reportes SQL.
    """
    return registro_crud.depurar_evento(db, evento_id, motivo)