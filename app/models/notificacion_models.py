from sqlalchemy import Column, Integer, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from app.models.base import Base
from app.models.evento_solicitud_models import EstadoSolicitud

class Notificacion(Base):
    __tablename__ = "notificacion"

    id_notificacion = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=False)
    id_estado_solicitud = Column(Integer, ForeignKey("estadosolicitud.id_estado_solicitud"), nullable=False)
    mensaje = Column(Text, nullable=False)
    fecha_creacion = Column(DateTime, server_default=func.now())
    leida = Column(Boolean, default=False)

