"""
Router de Edición de Eventos - ORDEN DE RUTAS CORREGIDO
Archivo: app/api/editar_evento.py

⚠️ CRÍTICO: Las rutas específicas DEBEN ir ANTES que las rutas con parámetros
"""
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.api.auth import get_current_user
from app.schemas.editar_schema import EventoEditar
from app.services.editar_services import EditarEventoService

router = APIRouter(
    prefix="/edicion-eventos", 
    tags=["Edición de Eventos"]
)


# ============================================================================
# ⚠️ IMPORTANTE: RUTAS ESPECÍFICAS PRIMERO (sin parámetros en el path)
# ============================================================================

@router.get(
    "/mis-solicitudes-edicion",
    summary="Obtener mis solicitudes de edición pendientes"
)
async def obtener_mis_solicitudes_edicion(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    ✅ Endpoint SIN parámetros.
    Retorna las solicitudes de edición pendientes del usuario autenticado.
    """
    try:
        resultado = EditarEventoService.obtener_mis_solicitudes_edicion(
            db=db,
            id_usuario=current_user.id_usuario
        )
        return resultado
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error: {str(e)}"
        )


@router.get(
    "/solicitudes-edicion-pendientes", 
    summary="Admin: Ver todas las solicitudes de edición pendientes"
)
async def ver_solicitudes_edicion_pendientes(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    ✅ Endpoint SIN parámetros.
    Solo para admin/supervisor.
    """
    if current_user.id_rol not in [1, 2]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No tienes permiso. Solo administradores."
        )
    
    try:
        resultado = EditarEventoService.obtener_solicitudes_pendientes(db=db)
        return resultado
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error: {str(e)}"
        )


# ============================================================================
# RUTAS CON PARÁMETROS VAN DESPUÉS
# ============================================================================

@router.put(
    "/actualizar/{id_evento}", 
    status_code=status.HTTP_200_OK, 
    summary="Editar evento"
)
async def editar_evento(
    id_evento: int, 
    evento_data: EventoEditar, 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    """
    Permite editar un evento.
    - **Organizador**: Crea solicitud
    - **Admin**: Cambios directos
    """
    return EditarEventoService.actualizar_evento(
        db=db, 
        id_evento=id_evento, 
        evento_update=evento_data, 
        id_usuario_actual=current_user.id_usuario,
        id_rol_actual=current_user.id_rol  
    )


@router.patch(
    "/{id_evento}/aprobar-edicion", 
    status_code=status.HTTP_200_OK, 
    summary="Admin: Aprobar solicitud"
)
async def aprobar_solicitud_edicion(
    id_evento: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Admin aprueba solicitud."""
    if current_user.id_rol not in [1, 2]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No tienes permisos de Administrador."
        )
        
    return EditarEventoService.aprobar_solicitud_edicion(
        db=db, 
        id_evento=id_evento,
        id_admin=current_user.id_usuario
    )


@router.patch(
    "/{id_evento}/rechazar-edicion", 
    status_code=status.HTTP_200_OK, 
    summary="Admin: Rechazar solicitud"
)
async def rechazar_solicitud_edicion(
    id_evento: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Admin rechaza solicitud."""
    if current_user.id_rol not in [1, 2]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No tienes permisos."
        )
        
    return EditarEventoService.rechazar_solicitud_edicion(
        db=db, 
        id_evento=id_evento,
        id_admin=current_user.id_usuario
    )


@router.get(
    "/{id_evento}/historial-ediciones", 
    summary="Ver historial de ediciones"
)
async def obtener_historial_ediciones(
    id_evento: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Historial de ediciones."""
    from app.models.registro_models import Evento
    from app.models.editar_models import HistorialEdicionEvento, DetalleCambioEvento
    from app.models.auth_models import Usuario
    
    evento = db.query(Evento).filter(Evento.id_evento == id_evento).first()
    if not evento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Evento no encontrado"
        )
    
    es_admin = current_user.id_rol in [1, 2]
    es_dueno = evento.id_usuario == current_user.id_usuario
    
    if not es_admin and not es_dueno:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Sin permiso"
        )
    
    historiales = db.query(HistorialEdicionEvento).filter(
        HistorialEdicionEvento.id_evento == id_evento
    ).order_by(HistorialEdicionEvento.fecha_edicion.desc()).all()
    
    resultado = []
    for historial in historiales:
        detalles = db.query(DetalleCambioEvento).filter(
            DetalleCambioEvento.id_historial_edicion == historial.id_historial_edicion
        ).all()
        
        usuario = db.query(Usuario).filter(
            Usuario.id_usuario == historial.id_usuario
        ).first()
        
        resultado.append({
            "id_historial_edicion": historial.id_historial_edicion,
            "fecha_edicion": historial.fecha_edicion.isoformat(),
            "usuario_email": usuario.email if usuario else "Desconocido",
            "usuario_nombre": usuario.nombre_y_apellido if usuario else "Desconocido",
            "detalles": [
                {
                    "id_detalle_cambio": detalle.id_detalle_cambio,
                    "campo_modificado": detalle.campo_modificado,
                    "valor_anterior": detalle.valor_anterior,
                    "valor_nuevo": detalle.valor_nuevo
                }
                for detalle in detalles
            ]
        })
    
    return resultado