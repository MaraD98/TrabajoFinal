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
    Permite editar un evento.
    
    - **Roles:** - Admin/Supervisor: Pueden editar cualquier evento.
        - Usuario (Dueño): Solo puede editar sus eventos si NO están publicados.
    - **Auditoría:** Se guardan los cambios en el historial.
    """
    return EditarEventoService.actualizar_evento(
        db=db, 
        id_evento=id_evento, 
        evento_update=evento_data, 
        id_usuario_actual=current_user.id_usuario,
        id_rol_actual=current_user.id_rol  # <--- ¡AQUÍ ESTÁ LA CLAVE!
    )