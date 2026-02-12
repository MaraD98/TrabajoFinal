"""
CRUD para Solicitudes de Edición de Eventos
Archivo: app/db/crud/solicitud_edicion_crud.py
"""
from sqlalchemy.orm import Session
from app.models.solicitud_edicion_models import SolicitudEdicionEvento
from datetime import datetime
import json


def crear_solicitud_edicion(
    db: Session,
    id_evento: int,
    id_usuario: int,
    cambios_propuestos: dict
) -> SolicitudEdicionEvento:
    """
    Crea una nueva solicitud de edición.
    Los cambios se guardan como JSON string.
    """
    solicitud = SolicitudEdicionEvento(
        id_evento=id_evento,
        id_usuario=id_usuario,
        cambios_propuestos=json.dumps(cambios_propuestos, ensure_ascii=False),
        fecha_solicitud=datetime.now(),
        aprobada=None  # NULL = Pendiente
    )
    db.add(solicitud)
    db.commit()
    db.refresh(solicitud)
    return solicitud


def obtener_solicitud_pendiente(db: Session, id_evento: int) -> SolicitudEdicionEvento:
    """
    Obtiene la solicitud de edición pendiente para un evento específico.
    Retorna None si no hay solicitud pendiente.
    """
    return db.query(SolicitudEdicionEvento).filter(
        SolicitudEdicionEvento.id_evento == id_evento,
        SolicitudEdicionEvento.aprobada == None  # NULL = Pendiente
    ).first()


def obtener_solicitudes_pendientes(db: Session) -> list:
    """
    Obtiene todas las solicitudes de edición pendientes (para admin).
    """
    return db.query(SolicitudEdicionEvento).filter(
        SolicitudEdicionEvento.aprobada == None
    ).all()


def aprobar_solicitud(
    db: Session,
    solicitud: SolicitudEdicionEvento,
    id_admin: int
) -> SolicitudEdicionEvento:
    """
    Marca una solicitud como aprobada.
    """
    solicitud.aprobada = True
    solicitud.fecha_resolucion = datetime.now()
    solicitud.id_admin_resolutor = id_admin
    db.commit()
    db.refresh(solicitud)
    return solicitud


def rechazar_solicitud(
    db: Session,
    solicitud: SolicitudEdicionEvento,
    id_admin: int
) -> SolicitudEdicionEvento:
    """
    Marca una solicitud como rechazada.
    """
    solicitud.aprobada = False
    solicitud.fecha_resolucion = datetime.now()
    solicitud.id_admin_resolutor = id_admin
    db.commit()
    db.refresh(solicitud)
    return solicitud