from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List
from app.db.crud import registro_crud
from app.schemas.registro_schema import EventoCreate, EventoResponse
from app.models.registro_models import Evento  

class EventoService:


    @staticmethod
    def crear_nuevo_evento(db: Session, evento_in: EventoCreate, usuario_actual) -> EventoResponse:
        # ^^^ OJO: Agregamos 'usuario_actual' en los paréntesis ^^^

        # --- [NUEVO] 1. VALIDACIÓN DE ROL ---
        # Si es Cliente (3) o Invitado (4), no dejamos pasar.
        if usuario_actual.id_rol in [3, 4]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tu perfil no tiene permisos para crear eventos."
            )

        # --- [NUEVO] 2. LÓGICA DE ESTADO AUTOMÁTICO ---
        # Por defecto Borrador (1)
        estado_inicial = 1 
        
        # Si es Admin (1) o Supervisor (2) -> Publicado (2)
        if usuario_actual.id_rol in [1, 2]:
            estado_inicial = 2

        # --- VALIDACIÓN EXISTENTE (Nombre y Fecha) ---
        evento_existente = registro_crud.get_evento_por_nombre_y_fecha(
            db, 
            nombre=evento_in.nombre_evento, 
            fecha=evento_in.fecha_evento
        )
        if evento_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un evento llamado '{evento_in.nombre_evento}' para esa fecha."
            )
        
        # --- [CAMBIO CLAVE] 3. CREACIÓN ---
        # Ahora tenemos que pasarle al CRUD no solo los datos del form (evento_in),
        # sino también el estado calculado y el ID del usuario dueño.
        
        # NOTA: Aquí tienes dos opciones dependiendo de cómo sea tu 'registro_crud.create_evento':
        # Opción A (Si tu CRUD recibe el objeto Evento ya listo):
        nuevo_evento_obj = Evento(
            **evento_in.dict(),       # Desempaqueta nombre, fecha, etc.
            id_usuario=usuario_actual.id_usuario, # El dueño
            id_estado=estado_inicial              # El estado calculado
        )
        return registro_crud.create_evento(db=db, evento=nuevo_evento_obj)

        # Opción B (Si tu CRUD espera el schema y datos extra, habría que modificar el CRUD).
        # Yo te recomiendo la Opción A que es más controlada desde el Service.

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