from fastapi import APIRouter, Depends, Query, status, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.evento_solicitud_schema import (SolicitudPublicacionResponse, RevisionSolicitud, SolicitudesPaginadas)
from app.db.crud.evento_solicitud_crud import Solicitud_PublicacionCRUD
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
    id_estado_solicitud: int = Query(None, ge=1, le=3, description="Filtro por estado: 1=Pendiente, 2=Aprobada, 3=Rechazada"),
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
    description="Vista rápida de todas las solicitudes que esperan revisión (Estado 1)"
)
def listar_pendientes(
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin)
):
    # Ahora el CRUD filtrará por id=1 correctamente
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

# ============ Listar solicitudes rechazadas ============
@router.get(
    "/rechazadas",
    response_model=list[SolicitudPublicacionResponse],
    summary="Listar solicitudes rechazadas",
    description="Obtiene todas las solicitudes que han sido rechazadas (Estado 3)"
)
def listar_rechazadas(
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin)
):
    solicitudes = Solicitud_PublicacionCRUD.obtener_solicitudes_rechazadas(db)
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

    #  LÓGICA DE APROBACIÓN (ID 2 = Aprobada)
    if revision.id_estado_solicitud == 2:
        try:
            # Llamamos al servicio que publica el evento
            EventoSolicitudService.aprobar_solicitud_y_publicar(
                db=db,
                id_solicitud=id_solicitud,
                id_admin=admin.id_usuario
            )
            # Recargamos para devolver el objeto actualizado
            solicitud_actualizada = Solicitud_PublicacionCRUD.obtener_solicitud_detallada(db, id_solicitud)
            
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    # Lógica para Rechazar (3) u otros estados
    else:
        solicitud_actualizada = Solicitud_PublicacionCRUD.actualizar_estado_solicitud(db, id_solicitud, revision)
    
    if not solicitud_actualizada:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Solicitud con ID {id_solicitud} no encontrada"
        )
    
    return solicitud_actualizada

