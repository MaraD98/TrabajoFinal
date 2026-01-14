from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.api.auth import get_current_user
from app.schemas.editar_schema import EventoEditar
from app.schemas.registro_schema import EventoResponse 
from app.services.editar_services import EditarEventoService
from typing import List

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
# ESTO ERA LO QUE HABÍA ANTES
#@router.put("/actualizar/{id_evento}", response_model=EventoResponse, status_code=status.HTTP_200_OK, summary="Editar evento con historial")
#def editar_evento(
    #id_evento: int, 
    #evento_data: EventoEditar, 
    #db: Session = Depends(get_db), 
    #current_user = Depends(get_current_user)
#):
 #   """
  #  Permite al organizador (dueño) editar un evento.
    
   # - **Validaciones:** Verifica que el evento sea futuro y que el usuario sea el propietario.
    #- **Auditoría:** Si hay cambios, se guardan automáticamente en 'Historial_Edicion_Evento' y 'Detalle_Cambio_Evento'.
    #"""
    #return EditarEventoService.actualizar_evento(
     #   db=db, 
      #  id_evento=id_evento, 
       # evento_update=evento_data, 
        #id_usuario_actual=current_user.id_usuario
    #)
@router.put("/actualizar/{id_evento}", response_model=EventoResponse, status_code=status.HTTP_200_OK, summary="Editar evento con historial")
def editar_evento(
    id_evento: int, 
    evento_data: EventoEditar, 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    #Permite editar un evento.
    #- Si lo edita un **Organizador**, pasa a estado 'Pendiente' para revisión.
    #- Si lo edita un **Admin/Supervisor**, los cambios se publican directos.
    
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