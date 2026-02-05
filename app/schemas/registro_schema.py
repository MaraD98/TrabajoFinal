from pydantic import BaseModel, Field, field_validator, ConfigDict
from datetime import date
from typing import Optional
from decimal import Decimal


# ============================================================================
# SCHEMAS DE EVENTOS
# ============================================================================

class EventoBase(BaseModel):
    """Campos comunes para eventos"""
    nombre_evento: str = Field(..., max_length=255, min_length=1, description="Nombre del evento")
    ubicacion: str = Field(..., max_length=255)
    fecha_evento: date
    descripcion: Optional[str] = Field(None, max_length=500)
    costo_participacion: Decimal = Field(..., ge=0, description="Costo de inscripción")
    id_tipo: int = Field(..., gt=0, description="ID del tipo de evento")
    id_dificultad: int = Field(..., gt=0, description="ID de la dificultad")
    lat: Optional[Decimal] = None
    lng: Optional[Decimal] = None
    cupo_maximo: Optional[int] = Field(default=0, ge=0, description="Cupo máximo de participantes")


class EventoCreate(EventoBase):
    """Schema para crear eventos con validaciones"""
    
    @field_validator('fecha_evento')
    @classmethod
    def validar_fecha_futura(cls, v):
        if v <= date.today():
            raise ValueError("La fecha del evento debe ser futura.")
        return v


class EventoResponse(EventoBase):
    """Schema para respuestas con IDs"""
    id_evento: int
    id_usuario: int
    id_estado: int

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# SCHEMAS DE MULTIMEDIA
# ============================================================================

class MultimediaResponse(BaseModel):
    """Schema para respuestas de multimedia"""
    id_multimedia: int
    id_evento: int
    url_archivo: str
    tipo_archivo: str

    model_config = ConfigDict(from_attributes=True)