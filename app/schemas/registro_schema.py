from pydantic import BaseModel, Field, field_validator, ConfigDict
from datetime import date
from typing import Optional
from decimal import Decimal

# 1. BASE: Campos comunes
class EventoBase(BaseModel):
    nombre_evento: str = Field(..., max_length=100, min_length=1, description="Nombre del evento")
    ubicacion: str = Field(..., max_length=255, min_length=1)
    fecha_evento: date
    descripcion: Optional[str] = Field(None, max_length=500)
    costo_participacion: Decimal = Field(..., ge=0, description="Costo de inscripción")
    id_tipo: int = Field(..., gt=0, description="ID del tipo de evento")
    id_dificultad: int = Field(..., gt=0, description="ID de la dificultad")

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
    
# --- TU SCHEMA NUEVO ---
class MultimediaResponse(BaseModel):
    id_multimedia: int
    id_evento: int
    url_archivo: str
    tipo_archivo: str

    model_config = ConfigDict(from_attributes=True)