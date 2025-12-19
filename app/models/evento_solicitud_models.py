from sqlalchemy import Column, Integer, String, Date, Text, DECIMAL, ForeignKey
from sqlalchemy.orm import relationship
from app.models.auth_models import Usuario
from app.models.registro_models import TipoEvento, NivelDificultad, EstadoEvento
from app.models.base import Base

# Modelos de catálogos 

class EstadoSolicitud(Base):
    __tablename__ = "estadosolicitud"
    id_estado_solicitud = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False, unique=True)
    
    
class SolicitudPublicacion(Base):
    
    __tablename__ = "solicitud_publicacion"
    
    # Primary Key
    id_solicitud = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Datos del evento
    nombre_evento = Column(String(100), nullable=False, unique=True)
    fecha_evento = Column(Date, nullable=False)
    ubicacion = Column(String(150), nullable=False)
    descripcion = Column(Text, nullable=True)
    costo_participacion = Column(DECIMAL(10, 2), nullable=False)
    
    # Foreign Keys
    id_tipo = Column(Integer, ForeignKey('tipoevento.id_tipo'), nullable=False)
    id_dificultad = Column(Integer, ForeignKey('niveldificultad.id_dificultad'), nullable=False)
    id_estado = Column(Integer, ForeignKey('estadoevento.id_estado'), nullable=False, default=1)
    id_estado_solicitud = Column(Integer, ForeignKey('estadosolicitud.id_estado_solicitud'), nullable=True, default=1)
    id_usuario = Column(Integer, ForeignKey('usuario.id_usuario'), nullable=False)
    
    
    # Auditoría
    fecha_solicitud = Column(Date, nullable=False)
    observaciones_admin = Column(Text, nullable=True)
    
    # Relationships (opcional, para eager loading)
    tipo_evento = relationship("TipoEvento", backref="solicitudes")
    nivel_dificultad = relationship("NivelDificultad", backref="solicitudes")
    estado_evento = relationship("EstadoEvento", backref="solicitudes")
    estado_solicitud = relationship("EstadoSolicitud", backref="solicitudes")
    usuario = relationship("Usuario", backref="solicitudes")

