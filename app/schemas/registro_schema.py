from pydantic import BaseModel, Field, field_validator
from datetime import date
from typing import Literal

# Input: Lo que el usuario te envía para registrarse
class EventoCreate(BaseModel):
    # HU 1.2: Validaciones de longitud (max_length reemplaza tus 'if len(...)')
    nombre: str = Field(..., max_length=100, min_length=1, description="Nombre del evento")
    fecha: date
    ubicacion: str = Field(..., max_length=150, min_length=1)
    
    # HU 1.2: Valores predefinidos (reemplaza tu set 'tipos_validos')
    tipo: Literal['carrera', 'paseo', 'entrenamiento']

    # HU 1.1: Motor de validación de fecha (Tu función validate_future_date mejorada)
    @field_validator('fecha')
    def validar_fecha_futura(cls, v):
        if v <= date.today():
            raise ValueError("La fecha debe ser futura.")
        return v

# Output: Lo que le respondemos al usuario (incluye el ID y el estado automático)
class EventoResponse(EventoCreate):
    id_evento: int
    estado: str  # Aquí devolveremos "borrador"

    class Config:
        from_attributes = True