from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.models.base import Base
import datetime 

class EstadoSuscripcion(Base):
    __tablename__ = "estadosuscripcion"
    id_estado_suscripcion = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False, unique=True)

class SuscripcionNovedades(Base):
    __tablename__ = "suscripcion_novedades"
    id_suscripcion = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=False)
    id_evento = Column(Integer, ForeignKey("evento.id_evento"), nullable=True)
    fecha_suscripcion = Column(DateTime, default=datetime.datetime.utcnow)
    preferencias = Column(String(255), nullable=True)
    id_estado_suscripcion = Column(Integer, ForeignKey("estadosuscripcion.id_estado_suscripcion"), nullable=False)

    # Relaciones para acceder fácil a los datos
    usuario = relationship("Usuario")
    evento = relationship("Evento")
    estado = relationship("EstadoSuscripcion")