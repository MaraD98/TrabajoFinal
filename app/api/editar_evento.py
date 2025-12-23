from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.api.auth import get_current_user
from app.schemas.editar_schema import EventoEditar
from app.schemas.registro_schema import EventoResponse 
from app.services.editar_services import EditarEventoService

router = APIRouter(
    prefix="/eventos", 
    tags=["Edición de Eventos"]
)

@router.put("/actualizar/{id_evento}", response_model=EventoResponse, status_code=status.HTTP_200_OK, summary="Editar evento con historial")
def editar_evento(
    id_evento: int, 
    evento_data: EventoEditar, 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    """
    Permite al organizador (dueño) editar un evento.
    
    - **Validaciones:** Verifica que el evento sea futuro y que el usuario sea el propietario.
    - **Auditoría:** Si hay cambios, se guardan automáticamente en 'Historial_Edicion_Evento' y 'Detalle_Cambio_Evento'.
    """
    return EditarEventoService.actualizar_evento(
        db=db, 
        id_evento=id_evento, 
        evento_update=evento_data, 
        id_usuario_actual=current_user.id_usuario
    )