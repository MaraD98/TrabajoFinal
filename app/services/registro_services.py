from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List

from app.db.crud import registro_crud
from app.schemas.registro_schema import EventoCreate, EventoResponse

class EventoService:

    @staticmethod
    def crear_nuevo_evento(db: Session, evento_in: EventoCreate) -> EventoResponse:
        # --- VALIDACIÓN PRO ---
        # 1. Verificamos si ya existe un evento con ese nombre en esa fecha
        evento_existente = registro_crud.get_evento_por_nombre_y_fecha(
            db, 
            nombre=evento_in.nombre_evento, 
            fecha=evento_in.fecha_evento
        )

        if evento_existente:
            # Si existe, cortamos la ejecución y devolvemos error 400 (Bad Request)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un evento llamado '{evento_in.nombre_evento}' para la fecha {evento_in.fecha_evento}"
            )
        
        # 2. Si pasó la validación (no existe), procedemos a crear
        nuevo_evento = registro_crud.create_evento(db=db, evento=evento_in)
        return nuevo_evento

    # ... (El resto de los métodos: listar, obtener por id, actualizar, borrar siguen igual) ...
    @staticmethod
    def listar_todos_los_eventos(db: Session, skip: int = 0, limit: int = 100) -> List[EventoResponse]:
        return registro_crud.get_eventos(db=db, skip=skip, limit=limit)

    @staticmethod
    def obtener_evento_por_id(db: Session, evento_id: int) -> EventoResponse:
        evento = registro_crud.get_evento_by_id(db=db, evento_id=evento_id)
        if not evento:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No se encontró el evento con ID {evento_id}"
            )
        return evento

    @staticmethod
    def actualizar_evento(db: Session, evento_id: int, evento_in: EventoCreate) -> EventoResponse:
        EventoService.obtener_evento_por_id(db, evento_id) # Valida que exista primero
        return registro_crud.update_evento(db=db, evento_id=evento_id, evento_data=evento_in)

    @staticmethod
    def borrar_evento(db: Session, evento_id: int):
        EventoService.obtener_evento_por_id(db, evento_id) # Valida que exista primero
        registro_crud.delete_evento(db=db, evento_id=evento_id)
        return {"detail": "Evento eliminado correctamente"}