from sqlalchemy import Column, Integer, DateTime, ForeignKey, Boolean, Text, String, func
from sqlalchemy.orm import relationship
from app.models.base import Base


class EliminacionEvento(Base):
    
    __tablename__ = "eliminacion_evento"
    
    id_eliminacion = Column(Integer, primary_key=True, index=True)
    id_evento = Column(Integer, ForeignKey("evento.id_evento"), nullable=False)
    motivo_eliminacion = Column(Text, nullable=False)
    fecha_eliminacion = Column(DateTime(timezone=True), server_default=func.now())
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=False)
    notificacion_enviada = Column(Boolean, default=False, nullable=False)
    estado_solicitud = Column(String(20), nullable=False, default='pendiente')  # ← AGREGAR ESTO
    # Relaciones
    evento = relationship("Evento", foreign_keys=[id_evento])
    usuario = relationship("Usuario", foreign_keys=[id_usuario])