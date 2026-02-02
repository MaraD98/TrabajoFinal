from sqlalchemy import Column, Integer, String, Date, Text, DECIMAL, ForeignKey
from sqlalchemy.orm import relationship
from app.models.auth_models import Usuario
from app.models.registro_models import TipoEvento, NivelDificultad, EstadoEvento
from app.models.base import Base

# Modelos de catálogos 
# Catalogo de estados de solicitud de publicación de eventos: 1-Pendiente, 2-Aprobada, 3-Rechazada
class EstadoSolicitud(Base):
    __tablename__ = "estadosolicitud"
    id_estado_solicitud = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False, unique=True)
    
    
    # Modelo principal de solicitud de publicación de eventos
    # Representa una solicitud que pasa por flujo de aprobación. Estados del evento: Borrador, Pendiente, Aprobada, Rechazada
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
    cupo_maximo = Column(Integer, nullable=False, default=0) 

     # Auditoría
    fecha_solicitud = Column(Date, nullable=False)
    observaciones_admin = Column(Text, nullable=True) # Comentarios del admin al revisar la solicitud
    # Coordenadas para mapa
    lat = Column(DECIMAL(9, 6), nullable=True)
    lng = Column(DECIMAL(9, 6), nullable=True)
    
    # Foreign Keys
    id_tipo = Column(Integer, ForeignKey('tipoevento.id_tipo'), nullable=False)
    id_dificultad = Column(Integer, ForeignKey('niveldificultad.id_dificultad'), nullable=False)
    id_estado = Column(Integer, ForeignKey('estadoevento.id_estado'), nullable=False, default=1)
    id_estado_solicitud = Column(Integer, ForeignKey('estadosolicitud.id_estado_solicitud'), nullable=False, default=1)
    id_usuario = Column(Integer, ForeignKey('usuario.id_usuario'), nullable=False)
    
    
   # RELACIONES (ESTO ES LO QUE FALTABA)
    # Esto permite usar joinedload y acceder a .usuario, .tipo_evento, etc.
    # ===================================================================
    tipo_evento = relationship("TipoEvento")
    nivel_dificultad = relationship("NivelDificultad")
    estado_evento = relationship("EstadoEvento")
    estado_solicitud = relationship("EstadoSolicitud")
    usuario = relationship("Usuario")
   
    
  
