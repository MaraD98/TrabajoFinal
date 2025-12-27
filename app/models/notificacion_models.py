from sqlalchemy import Column, Integer, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base

class Notificacion(Base):
    __tablename__ = "notificacion"

    id_notificacion = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=False)
    id_solicitud = Column(Integer, ForeignKey("solicitud_publicacion.id_solicitud"), nullable=False)
    mensaje = Column(Text, nullable=False)
    fecha_creacion = Column(DateTime, server_default=func.now())
    leida = Column(Boolean, default=False)

    usuario = relationship("Usuario", back_populates="notificaciones")
    solicitud = relationship("Solicitud_Publicacion", back_populates="notificaciones")
