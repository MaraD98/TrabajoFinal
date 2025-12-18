from sqlalchemy import Column, Integer, String, Date
from app.models.base import Base  # Asegúrate de tener configurado tu Base
from sqlalchemy import Column, Integer, String, Date, Text, DECIMAL
from sqlalchemy import Column, DateTime, func


class TipoEvento (Base):
    __tablename__ = "tipoevento"

    id_tipo = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)


class NivelDificultad (Base):
    __tablename__ = "niveldificultad"

    id_dificultad = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)


class EstadoEvento (Base):
    __tablename__ = "estadoevento"

    id_estado = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)


class Evento(Base):
    __tablename__ = "evento"

    id_evento = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, nullable=False)  # Relación con el usuario que crea el evento
    # HU 1.2: Validaciones de longitud y obligatoriedad (nullable=False)
    nombre_evento = Column(String(255), nullable=False, index=True)
    fecha_evento = Column(Date, nullable=False)
    ubicacion = Column(String(255), nullable=False)
    
    # HU 1.2: Tipo de evento (guardaremos el string validado)
    id_tipo = Column(Integer, nullable=False)
    id_dificultad = Column(Integer, nullable=False)
    descripcion = Column(String(500), nullable=True)
    #veeeeeeeeeeeer string o text en postgres

    costo_participacion = Column(DECIMAL(10, 2), nullable=False)    # HU 1.1: Estado inicial automático
    id_estado = Column(Integer, default="borrador", nullable=False)
    # fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    fecha_creacion = Column(DateTime, server_default=func.now(), nullable=False)
