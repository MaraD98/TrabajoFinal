from sqlalchemy.orm import Session
from app.models.registro_models import Evento
from app.schemas.registro_schema import EventoCreate

def crear_nuevo_evento(db: Session, evento_in: EventoCreate):
    # 1. Convertimos el esquema (Pydantic) a Modelo (SQLAlchemy)
    nuevo_evento = Evento(                                      # faltaria la conexion con el crud nuevo_eventoCRUD.create_evento(
        nombre=evento_in.nombre,
        fecha=evento_in.fecha,
        ubicacion=evento_in.ubicacion,
        tipo=evento_in.tipo,
        estado="borrador"  # HU 1.1: Asignación del estado inicial
    )
    
    # 2. Guardamos en la BD
    db.add(nuevo_evento)
    db.commit()
    db.refresh(nuevo_evento)
    
    return nuevo_evento