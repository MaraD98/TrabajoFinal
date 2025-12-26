from typing import Optional
from pydantic import BaseModel, Field, field_validator
from datetime import date

class EventoEditar(BaseModel):
    # CAMPOS DE TEXTO Y FECHA
    nombre_evento: Optional[str] = Field(None, min_length=3, max_length=255)
    fecha_evento: Optional[date] = Field(None, description="Nueva fecha (debe ser futura)")
    ubicacion: Optional[str] = Field(None, min_length=3, max_length=255)
    descripcion: Optional[str] = Field(None, max_length=500)
    
    # CLAVES FORÁNEAS (Para cambiar el tipo o dificultad si se equivocó)
    id_tipo: Optional[int] = Field(None, gt=0, description="ID del nuevo tipo de evento (opcional)")
    id_dificultad: Optional[int] = Field(None, gt=0, description="ID de la nueva dificultad (opcional)")
    
    # COSTO (Usamos float para manejar el DECIMAL de la base de datos)
    costo_participacion: Optional[float] = Field(None, ge=0.0, description="El costo no puede ser negativo")
    
    # ESTADO (Opcional, por si quiere cancelar o pausar el evento manualmente)
    id_estado: Optional[int] = Field(None, gt=0)

    # 1. Validar que la fecha no sea pasada (Regla de Negocio)
    @field_validator('fecha_evento')
    def validar_fecha_futura(cls, v):
        if v and v < date.today():
            raise ValueError('La fecha del evento no puede ser anterior a hoy')
        return v
        
    # 2. Validar costo positivo (redundancia de seguridad)
    @field_validator('costo_participacion')
    def validar_costo(cls, v):
        if v is not None and v < 0:
            raise ValueError('El costo de participación no puede ser negativo')
        return v

    class Config:
        from_attributes = True