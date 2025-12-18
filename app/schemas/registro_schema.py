from pydantic import BaseModel, Field, field_validator
from datetime import date
from typing import Optional
from decimal import Decimal

# --- INPUT: Lo que el usuario envía para crear el evento ---
class EventoCreate(BaseModel):
    
    # 1. Datos básicos (Coinciden con las columnas de tu Modelo)
    nombre_evento: str = Field(..., max_length=100, min_length=1, description="Nombre del evento")
    ubicacion: str = Field(..., max_length=255, min_length=1)
    fecha_evento: date
    
    # 2. Descripción (Es opcional en el modelo, así que aquí también)
    descripcion: Optional[str] = Field(None, max_length=500)

    # 3. Costo (Usamos Decimal para dinero, valida que no sea negativo ge=0)
    costo_participacion: Decimal = Field(..., ge=0, description="Costo de inscripción")

    # 4. Relaciones (Foreign Keys)
    # OJO: Ya no pedimos el texto "Carrera". Pedimos el ID (número) que seleccionan del combo box.
    id_tipo: int = Field(..., gt=0, description="ID del tipo de evento seleccionado")
    id_dificultad: int = Field(..., gt=0, description="ID de la dificultad seleccionada")
    
    # NOTA: No pedimos id_usuario ni id_estado. 
    # id_usuario lo sacamos del login (token).
    # id_estado se pone solo en 1 (Borrador).

    # VALIDACIONES
    @field_validator('fecha_evento')
    def validar_fecha_futura(cls, v):
        if v <= date.today():
            raise ValueError("La fecha del evento debe ser futura.")
        return v

# --- OUTPUT: Lo que devolvemos al usuario ---
class EventoResponse(EventoCreate):
    id_evento: int
    id_usuario: int
    id_estado: int
    # fecha_creacion lo podrías agregar si quisieras mostrar cuándo se creó

    class Config:
        from_attributes = True