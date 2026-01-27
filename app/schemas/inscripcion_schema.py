from pydantic import BaseModel, ConfigDict
from datetime import datetime, date
from typing import Optional
from decimal import Decimal


# Importamos el esquema base del otro archivo para extenderlo
from app.schemas.registro_schema import EventoResponse

# =====================================================================
# NUEVOS SCHEMAS PARA INSCRIPCIONES (SPRINT 3)
# =====================================================================

# 1. OUTPUT: Evento con la matemática de cupos (Hereda de EventoResponse)
class EventoConCuposResponse(EventoResponse):
    cupos_ocupados: int
    cupos_disponibles: int
    
    # Un campo extra para facilitar el front (true si cupos_disponibles == 0)
    esta_lleno: bool = False 

    model_config = ConfigDict(from_attributes=True)


# 2. OUTPUT: Respuesta al generar una reserva
class ReservaResponseSchema(BaseModel):
    id_reserva: int
    id_evento: int
    id_usuario: int
    fecha_reserva: datetime
    fecha_expiracion: Optional[datetime] # Para mostrar cuándo vence el pago
    id_estado_reserva: int

    model_config = ConfigDict(from_attributes=True)
    
class MiReservaDetalle(BaseModel):
    id_reserva: int
    fecha_reserva: datetime
    estado: str             # Ej: "Pendiente de Pago"
    
    # Datos del Evento incrustados
    id_evento: int
    nombre_evento: str
    ubicacion: str
    fecha_evento: date
    costo: Decimal

    class Config:
        from_attributes = True