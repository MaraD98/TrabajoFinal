from fastapi import APIRouter, Depends, status, UploadFile, File
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.api.auth import get_current_user
# Importamos schemas
from app.schemas.editar_schema import EventoEditar
from app.schemas.registro_schema import EventoResponse, MultimediaResponse 
# Importamos el servicio
from app.services.editar_services import EditarEventoService

router = APIRouter(
    prefix="/eventos", 
    tags=["Edición de Eventos"]
)

# --- ENDPOINT 1: EDITAR DATOS DEL EVENTO (Lo de tu compañera) ---
@router.put("/actualizar/{id_evento}", response_model=EventoResponse, status_code=status.HTTP_200_OK, summary="Editar evento con historial")
def editar_evento(
    id_evento: int, 
    evento_data: EventoEditar, 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    """
    Permite al organizador (dueño) editar un evento.
    - Validaciones: Verifica que el evento sea futuro y que el usuario sea el propietario.
    - Auditoría: Guarda historial de cambios.
    """
    return EditarEventoService.actualizar_evento(
        db=db, 
        id_evento=id_evento, 
        evento_update=evento_data, 
        id_usuario_actual=current_user.id_usuario
    )

# --- ENDPOINT 2: EDITAR MULTIMEDIA (TU TAREA HU-3.3) ---
@router.put("/multimedia/{id_multimedia}", response_model=MultimediaResponse, summary="Reemplazar archivo multimedia")
def editar_multimedia(
    id_multimedia: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    HU-3.3: Permite reemplazar una foto o archivo existente.
    Se debe enviar el ID de la imagen (id_multimedia) y el archivo nuevo.
    """
    # Llamamos a la función que agregaste en el Service
    return EditarEventoService.reemplazar_archivo_multimedia(
        db=db, 
        id_multimedia=id_multimedia, 
        archivo=archivo
    )