from pydantic import BaseModel, Field, field_validator
from datetime import date
from typing import Optional
from decimal import Decimal

# 1. EventoBase: Campos comunes (SIN VALIDACIONES DE LÓGICA)
# Esto sirve tanto para leer como para escribir
class EventoBase(BaseModel):
    nombre_evento: str = Field(..., max_length=100, min_length=1, description="Nombre del evento")
    ubicacion: str = Field(..., max_length=255, min_length=1)
    fecha_evento: date
    descripcion: Optional[str] = Field(None, max_length=500)
    costo_participacion: Decimal = Field(..., ge=0, description="Costo de inscripción")
    id_tipo: int = Field(..., gt=0, description="ID del tipo de evento seleccionado")
    id_dificultad: int = Field(..., gt=0, description="ID de la dificultad seleccionada")

# 2. EventoCreate: Lo que envía el usuario (AQUÍ SÍ VALIDAMOS)
# Hereda los campos de Base y agrega la regla de fecha futura
class EventoCreate(EventoBase):
    
    @field_validator('fecha_evento')
    @classmethod
    def validar_fecha_futura(cls, v):
        # Solo validamos que sea futura cuando estamos CREANDO
        if v <= date.today():
            raise ValueError("La fecha del evento debe ser futura.")
        return v

# 3. EventoResponse: Lo que devolvemos (SIN VALIDACIÓN DE FECHA)
# Hereda de Base (no de Create), así que no le importa si la fecha es antigua
class EventoResponse(EventoBase):
    id_evento: int
    id_usuario: int
    id_estado: int
    # fecha_creacion lo podrías agregar si quisieras

    class Config:
        from_attributes = True