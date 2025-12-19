from sqlalchemy import Column, Integer, String, Date, Text, DECIMAL, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()
# Modelos de catálogos 
class TipoEvento(Base):
    __tablename__ = "tipoevento"
    id_tipo = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False, unique=True)


class NivelDificultad(Base):
    __tablename__ = "niveldificultad"
    id_dificultad = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False, unique=True)


class EstadoEvento(Base):
    __tablename__ = "estadoevento"
    id_estado = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False, unique=True)


class EstadoSolicitud(Base):
    __tablename__ = "estadosolicitud"
    id_estado_solicitud = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False, unique=True)
    
class Usuario(Base):
    __tablename__ = "usuario"
    id_usuario = Column(Integer, primary_key=True)
    nombre_y_apellido = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    contrasenia = Column(String(200), nullable=False)
    fecha_creacion = Column(TIMESTAMP, server_default=func.current_timestamp())
    id_rol = Column(Integer, ForeignKey('rol.id_rol'), nullable=False)


class Rol(Base):
    __tablename__ = "rol"
    id_rol = Column(Integer, primary_key=True)
    nombre_rol = Column(String(100), nullable=False, unique=True)
    
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


