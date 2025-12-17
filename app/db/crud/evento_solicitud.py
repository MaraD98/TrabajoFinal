from sqlalchemy.orm import Session
from app.db.models.evento_solicitud import EventoSolicitud, EstadoSolicitud
from app.schemas.evento_solicitud import EventoSolicitudCreate

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