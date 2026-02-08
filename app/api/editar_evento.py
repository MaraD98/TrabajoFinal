from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.api.auth import get_current_user
from app.schemas.editar_schema import EventoEditar
from app.schemas.registro_schema import EventoResponse
from app.services.editar_services import EditarEventoService
from typing import List
from app.models.editar_models import HistorialEdicionEvento, DetalleCambioEvento
from app.models.auth_models import Usuario

router = APIRouter(
    prefix="/eventos", 
    tags=["Edición de Eventos"]
)

@router.get("/solicitudes-pendientes", response_model=List[EventoResponse], summary="Admin: Ver lista de eventos por aprobar")
def ver_solicitudes_pendientes(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # 1. Validar que sea Admin o Supervisor
    if current_user.id_rol not in [1, 2]:
        raise HTTPException(status_code=403, detail="No tienes permiso para ver solicitudes.")

    # 2. Llamar al servicio
    return EditarEventoService.obtener_eventos_pendientes(db=db)

@router.put("/actualizar/{id_evento}", response_model=EventoResponse, status_code=status.HTTP_200_OK, summary="Editar evento con historial")
def editar_evento(
    id_evento: int, 
    evento_data: EventoEditar, 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    """
    Permite editar un evento.
    - Si lo edita un **Organizador**, pasa a estado 'Pendiente' para revisión.
    - Si lo edita un **Admin/Supervisor**, los cambios se publican directos.
    """
    
    return EditarEventoService.actualizar_evento(
        db=db, 
        id_evento=id_evento, 
        evento_update=evento_data, 
        id_usuario_actual=current_user.id_usuario,
        id_rol_actual=current_user.id_rol  
    )

@router.put("/{id_evento}/aprobar-cambios", status_code=status.HTTP_200_OK, summary="Admin: Aprobar edición")
def aprobar_edicion(
    id_evento: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.id_rol not in [1, 2]:
        raise HTTPException(status_code=403, detail="No tienes permisos de Administrador.")
        
    return EditarEventoService.aprobar_cambios(db=db, id_evento=id_evento)

@router.put("/{id_evento}/rechazar-cambios", status_code=status.HTTP_200_OK, summary="Admin: Rechazar y Revertir")
def rechazar_edicion(
    id_evento: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.id_rol not in [1, 2]:
        raise HTTPException(status_code=403, detail="No tienes permisos de Administrador.")
        
    return EditarEventoService.rechazar_y_revertir(db=db, id_evento=id_evento)

# ============================================================================
# HU-3.4: VISUALIZACIÓN DEL HISTORIAL DE CAMBIOS
# ============================================================================

@router.get("/{id_evento}/historial-ediciones", summary="Ver historial de ediciones de un evento")
def obtener_historial_ediciones(
    id_evento: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Devuelve el historial completo de ediciones de un evento.
    
    Solo accesible por:
    - El dueño del evento
    - Administradores (id_rol 1)
    - Supervisores (id_rol 2)
    """
    from app.models.registro_models import Evento
    
    # Verificar que el evento existe
    evento = db.query(Evento).filter(Evento.id_evento == id_evento).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    
    # Verificar permisos
    es_admin = current_user.id_rol in [1, 2]
    es_dueno = evento.id_usuario == current_user.id_usuario
    
    if not es_admin and not es_dueno:
        raise HTTPException(
            status_code=403, 
            detail="No tienes permiso para ver el historial de este evento"
        )
    
    # Obtener historial con detalles y usuario
    historiales = db.query(HistorialEdicionEvento).filter(
        HistorialEdicionEvento.id_evento == id_evento
    ).order_by(HistorialEdicionEvento.fecha_edicion.desc()).all()
    
    resultado = []
    for historial in historiales:
        # Obtener detalles de cambios
        detalles = db.query(DetalleCambioEvento).filter(
            DetalleCambioEvento.id_historial_edicion == historial.id_historial_edicion
        ).all()
        
        # Obtener información del usuario que editó
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