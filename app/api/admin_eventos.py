from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.evento_solicitud_schema import (SolicitudPublicacionResponse, RevisionSolicitud, SolicitudesPaginadas)
from app.db.crud.evento_solicitud_crud import Solicitud_PublicacionCRUD

router = APIRouter(prefix="/admin/solicitudes", tags=["Administración de Solicitudes"])

# TODO: Agregar dependencia de autenticación de administrador
# from app.core.security import require_admin_role
# Depends(require_admin_role)

# ============ Listar todas las solicitudes ============
@router.get(
    "/",
    response_model=SolicitudesPaginadas,
    summary="Listar todas las solicitudes",
    description="Lista todas las solicitudes con filtro opcional por estado y paginación. Incluye información del usuario solicitante."
)
def listar_todas_solicitudes(
    id_estado_solicitud: int = Query(None, ge=1, le=3, description="Filtrar por estado (1=Pendiente, 2=Aprobada, 3=Rechazada)"),
    pagina: int = Query(1, ge=1, description="Número de página"),
    por_pagina: int = Query(20, ge=1, le=100, description="Solicitudes por página"),
    db: Session = Depends(get_db)
):
    skip = (pagina - 1) * por_pagina
    resultado = Solicitud_PublicacionCRUD.listar_solicitudes(
        db,
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
    description="Vista rápida de todas las solicitudes que esperan revisión"
)
def listar_pendientes(db: Session = Depends(get_db)):
    solicitudes = Solicitud_PublicacionCRUD.obtener_solicitudes_pendientes(db)
    return solicitudes

# ============ Listar solicitudes aprobadas ============
@router.get(
    "/aprobadas",
    response_model=list[SolicitudPublicacionResponse],
    summary="Listar solicitudes aprobadas",
    description="Obtiene todas las solicitudes que han sido aprobadas y están publicadas"
)
def listar_aprobadas(db: Session = Depends(get_db)):
    solicitudes = Solicitud_PublicacionCRUD.obtener_solicitudes_aprobadas(db)
    return solicitudes

# ============ Obtener detalle de solicitud ============
@router.get(
    "/{id_solicitud}",
    response_model=SolicitudPublicacionResponse,
    summary="Obtener detalle de solicitud",
    description="Consulta completa de una solicitud específica con todos sus datos"
)
def obtener_detalle_solicitud(id_solicitud: int, db: Session = Depends(get_db)):
    solicitud = Solicitud_PublicacionCRUD.obtener_solicitud_detallada(db, id_solicitud)
    
    if not solicitud:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Solicitud con ID {id_solicitud} no encontrada"
        )
    
    return solicitud

# ============ Revisar solicitud ============
@router.patch(
    "/{id_solicitud}/revisar",
    response_model=SolicitudPublicacionResponse,
    summary="Revisar y cambiar estado de solicitud",
    description="Cambia el estado de una solicitud y registra observaciones del administrador. Al aprobar, el evento cambia automáticamente a estado Publicado."
)
def revisar_solicitud(
    id_solicitud: int,
    revision: RevisionSolicitud,
    db: Session = Depends(get_db)
):
    solicitud_actualizada = Solicitud_PublicacionCRUD.actualizar_estado_solicitud(db, id_solicitud, revision)
    
    if not solicitud_actualizada:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Solicitud con ID {id_solicitud} no encontrada"
        )
    
    return solicitud_actualizada

