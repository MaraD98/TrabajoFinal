from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func, Computed
from sqlalchemy.orm import relationship
from app.models.base import Base

# --- NUEVO: ESTADO DE RESERVA ---
class EstadoReserva(Base):
    __tablename__ = "estadoreserva"
    id_estado_reserva = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), unique=True, nullable=False)

# --- MODELO PRINCIPAL DE RESERVA (SPRINT 3) ---
# Unificamos ReservaEvento y Reserva_Evento en una sola clase correcta.
class ReservaEvento(Base):
    __tablename__ = "reserva_evento"
    
    id_reserva = Column(Integer, primary_key=True, index=True)
    id_evento = Column(Integer, ForeignKey("evento.id_evento"), nullable=False)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=False)
    fecha_reserva = Column(DateTime(timezone=True), server_default=func.now())
    
    # Estado
    id_estado_reserva = Column(Integer, ForeignKey("estadoreserva.id_estado_reserva"), default=1)
    
    # Campos Nuevos del Sprint 3
    categoria_participante = Column(String(100), nullable=True) # "General", "VIP", etc.
    
    # LÓGICA DE COMPUTED: Calcula fecha de vencimiento (3 días después de reservar)
    # Esto es lo que querían mantener de la versión de tu compañera
    fecha_expiracion = Column(
        DateTime(timezone=True), 
        Computed("fecha_reserva + interval '3 days'")
    )

    # Relaciones ORM
    evento = relationship("Evento", back_populates="reservas")
    estado = relationship("EstadoReserva")