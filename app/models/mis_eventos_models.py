from sqlalchemy import (
    Column, Integer, String, Text, Numeric, Date, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base
from app.models.auth_models import Usuario

# Modelos Mis Eventos de la base de datos


# Maestro: TipoEvento
class TipoEvento(Base):
    __tablename__ = "tipoevento"

    id_tipo = Column(Integer, primary_key=True, autoincrement=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)

    eventos = relationship("Evento", back_populates="tipo")

# Maestro: NivelDificultad
class NivelDificultad(Base):
    __tablename__ = "niveldificultad"

    id_dificultad = Column(Integer, primary_key=True, autoincrement=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)

    eventos = relationship("Evento", back_populates="dificultad")

# Maestro: EstadoEvento
class EstadoEvento(Base):
    __tablename__ = "estadoevento"

    id_estado = Column(Integer, primary_key=True, autoincrement=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)

    eventos = relationship("Evento", back_populates="estado")

# Maestro: EstadoReserva
class EstadoReserva(Base):
    __tablename__ = "estadoreserva"

    id_estado_reserva = Column(Integer, primary_key=True, autoincrement=True, index=True)
    nombre = Column(String(255), unique=True, nullable=False)

    reservas = relationship("ReservaEvento", back_populates="estado_reserva")

# Evento (FKs a maestros + usuario creador)
class Evento(Base):
    __tablename__ = "evento"

    id_evento = Column(Integer, primary_key=True, autoincrement=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=False, index=True)
    nombre_evento = Column(String(255), unique=True, nullable=False)
    fecha_evento = Column(Date, nullable=False)
    ubicacion = Column(String(255), nullable=False)
    id_tipo = Column(Integer, ForeignKey("tipoevento.id_tipo"), nullable=False)
    id_dificultad = Column(Integer, ForeignKey("niveldificultad.id_dificultad"), nullable=False)
    descripcion = Column(Text)
    costo_participacion = Column(Numeric(10, 2), nullable=False)
    id_estado = Column(Integer, ForeignKey("estadoevento.id_estado"), nullable=False, default=1)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones ORM
    usuario = relationship("Usuario", back_populates="eventos")
    tipo = relationship("TipoEvento", back_populates="eventos")
    dificultad = relationship("NivelDificultad", back_populates="eventos")
    estado = relationship("EstadoEvento", back_populates="eventos")

    # Relación hacia reservas (hijas)
    reservas = relationship(
        "ReservaEvento",
        back_populates="evento",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    

# Reserva_Evento (tabla puente usuario-evento)
class ReservaEvento(Base):
    __tablename__ = "reserva_evento"

    id_reserva = Column(Integer, primary_key=True, autoincrement=True, index=True)
    id_evento = Column(Integer, ForeignKey("evento.id_evento", ondelete="CASCADE"), nullable=False, index=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario", ondelete="CASCADE"), nullable=False, index=True)

    fecha_reserva = Column(DateTime(timezone=True), server_default=func.now())
    fecha_expiracion = Column(DateTime(timezone=True))  # calculada en Postgres
    id_estado_reserva = Column(Integer, ForeignKey("estadoreserva.id_estado_reserva"), nullable=False)
    categoria_participante = Column(String(255))

    # Relaciones ORM
    evento = relationship("Evento", back_populates="reservas", passive_deletes=True)
    usuario = relationship("Usuario", back_populates="reservas", passive_deletes=True)
    estado_reserva = relationship("EstadoReserva", back_populates="reservas")
