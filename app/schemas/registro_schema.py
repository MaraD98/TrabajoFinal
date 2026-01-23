from pydantic import BaseModel, Field, field_validator, ConfigDict
from datetime import date, datetime 
from typing import Optional
from decimal import Decimal

# =====================================================================
# CÓDIGO ORIGINAL (TUS VALIDACIONES PRO)
# =====================================================================

# 1. BASE: Campos comunes
class EventoBase(BaseModel):
    nombre_evento: str = Field(..., max_length=255, min_length=1, description="Nombre del evento")
    
    # CAMBIO 1: Quitamos 'min_length=1'. 
    ubicacion: str = Field(..., max_length=255)
    
    fecha_evento: date
    descripcion: Optional[str] = Field(None, max_length=500)
    costo_participacion: Decimal = Field(..., ge=0, description="Costo de inscripción")
    id_tipo: int = Field(..., gt=0, description="ID del tipo de evento")
    id_dificultad: int = Field(..., gt=0, description="ID de la dificultad")
    
    lat: Optional[Decimal] = None
    lng: Optional[Decimal] = None
    
    # CAMBIO 2: IMPORTANTE
    cupo_maximo: Optional [int] = Field(default=0, ge=0, description="Cupo máximo de participantes")


# 2. INPUT: Validaciones extra solo al crear
class EventoCreate(EventoBase):
    
    @field_validator('fecha_evento')
    @classmethod
    def validar_fecha_futura(cls, v):
        if v <= date.today():
            raise ValueError("La fecha del evento debe ser futura.")
        return v

# 3. OUTPUT: Lo que devolvemos (incluye IDs generados)
class EventoResponse(EventoBase):
    id_evento: int
    id_usuario: int
    id_estado: int

    model_config = ConfigDict(from_attributes=True)
    
class MultimediaResponse(BaseModel):
    id_multimedia: int
    id_evento: int
    url_archivo: str
    tipo_archivo: str

    model_config = ConfigDict(from_attributes=True)


# =====================================================================
# NUEVOS SCHEMAS PARA INSCRIPCIONES (SPRINT 3 - HU 8.1 a 8.7)
# =====================================================================

# 1. OUTPUT: Evento con la matemática de cupos ya hecha
class EventoConCuposResponse(EventoResponse):
    cupos_ocupados: int
    cupos_disponibles: int
    
    # Un campo extra para facilitar el front (true si cupos_disponibles == 0)
    esta_lleno: bool = False # Le puse default False por seguridad

    model_config = ConfigDict(from_attributes=True)


class ReservaResponseSchema(BaseModel):
    id_reserva: int
    id_evento: int
    id_usuario: int
    fecha_reserva: datetime
    fecha_expiracion: Optional[datetime] #Para mostrar cuándo vence
    id_estado_reserva: int

    model_config = ConfigDict(from_attributes=True)
    
    # --- (NUEVO) HU 4.1: Input para cancelar evento ---
class EventoCancelacionRequest(BaseModel):
    motivo: str = Field(..., min_length=5, description="Motivo por el cual se cancela el evento")
