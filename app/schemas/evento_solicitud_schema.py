from pydantic import BaseModel, EmailStr, Field, validator
from datetime import datetime
from typing import Optional
from enum import Enum

class EstadoSolicitud(str, Enum):
    PENDIENTE = "Pendiente de revisión"
    APROBADO = "Aprobado"
    RECHAZADO = "Rechazado"

class EventoSolicitudCreate(BaseModel):
    nombre_evento: str = Field(..., min_length=3, max_length=200)
    fecha_evento: datetime
    lugar: str = Field(..., min_length=3, max_length=200)
    descripcion: str = Field(..., min_length=10)
    contacto: str = Field(..., min_length=5, max_length=200)
    archivo_url: Optional[str] = None
    
    @validator('fecha_evento')
    def validar_fecha_futura(cls, v):
        if v < datetime.now():
            raise ValueError('La fecha del evento debe ser futura')
        return v

class EventoSolicitudResponse(BaseModel):
    id: int
    nombre_evento: str
    fecha_evento: datetime
    lugar: str
    descripcion: str
    contacto: str
    archivo_url: Optional[str]
    estado: EstadoSolicitud
    fecha_creacion: datetime
    
    class Config:
        from_attributes = True
