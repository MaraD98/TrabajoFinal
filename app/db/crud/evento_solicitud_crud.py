from sqlalchemy.orm import Session
from app.models.evento_solicitud_models import EventoSolicitud, EstadoSolicitud
from app.schemas.evento_solicitud_schema import EventoSolicitudCreate

def crear_solicitud(db: Session, solicitud: EventoSolicitudCreate):
    db_solicitud = EventoSolicitud(
        **solicitud.model_dump(),
        estado=EstadoSolicitud.PENDIENTE
    )
    db.add(db_solicitud)
    db.commit()
    db.refresh(db_solicitud)
    return db_solicitud

def obtener_solicitud(db: Session, solicitud_id: int):
    return db.query(EventoSolicitud).filter(
        EventoSolicitud.id == solicitud_id
    ).first()