from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base 

class HistorialEdicionEvento(Base):
    __tablename__ = "historial_edicion_evento"

    id_historial_edicion = Column(Integer, primary_key=True, index=True)
    
    id_evento = Column(Integer, ForeignKey("evento.id_evento"), nullable=False)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=False)
    
    fecha_edicion = Column(DateTime, default=func.now(), nullable=False)




class DetalleCambioEvento(Base):
    __tablename__ = "detalle_cambio_evento"

    id_detalle_cambio = Column(Integer, primary_key=True, index=True)
    
    id_historial_edicion = Column(Integer, ForeignKey("historial_edicion_evento.id_historial_edicion"), nullable=False)
    
    campo_modificado = Column(String(200), nullable=False)
    valor_anterior = Column(Text, nullable=False)
    valor_nuevo = Column(Text, nullable=False)

    