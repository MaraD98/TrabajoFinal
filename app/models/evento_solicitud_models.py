from sqlalchemy import Column, Integer, String, DateTime, Text, Enum
from sqlalchemy.sql import func
from app.models.base import Base
import enum

# Modelos de Evento Solicitud de la base de datos

class EstadoSolicitud(str, enum.Enum):
    PENDIENTE = "Pendiente de revisión"
    APROBADO = "Aprobado"
    RECHAZADO = "Rechazado"

class EventoSolicitud(Base):
    __tablename__ = "evento_solicitudes"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre_evento = Column(String(200), nullable=False)
    fecha_evento = Column(DateTime, nullable=False)
    lugar = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=False)
    contacto = Column(String(200), nullable=False)  # email o teléfono
    archivo_url = Column(String(500), nullable=True)  # opcional
    estado = Column(Enum(EstadoSolicitud), default=EstadoSolicitud.PENDIENTE)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, onupdate=func.now())