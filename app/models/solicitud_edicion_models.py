"""
Modelo de Solicitudes de Edición
Archivo: app/models/solicitud_edicion_models.py
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base
from datetime import datetime


class SolicitudEdicionEvento(Base):
    """
    Tabla para almacenar solicitudes de edición de eventos.
    Cuando un organizador edita un evento publicado, se crea una solicitud
    que debe ser aprobada por un administrador.
    """
    __tablename__ = "solicitud_edicion_evento"

    id_solicitud_edicion = Column(Integer, primary_key=True, index=True)
    id_evento = Column(Integer, ForeignKey("evento.id_evento"), nullable=False)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=False)
    
    # JSON con los cambios propuestos
    cambios_propuestos = Column(Text, nullable=False)
    
    # Control de estado
    fecha_solicitud = Column(DateTime, default=datetime.now)
    aprobada = Column(Boolean, nullable=True, default=None)  # NULL=Pendiente, TRUE=Aprobada, FALSE=Rechazada
    fecha_resolucion = Column(DateTime, nullable=True)
    id_admin_resolutor = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=True)

    # Relaciones
    evento = relationship("Evento", foreign_keys=[id_evento])
    usuario = relationship("Usuario", foreign_keys=[id_usuario])
    admin_resolutor = relationship("Usuario", foreign_keys=[id_admin_resolutor])