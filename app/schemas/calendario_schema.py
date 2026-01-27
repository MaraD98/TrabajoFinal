from pydantic import BaseModel
from datetime import date
from typing import Optional

class EventoCalendarioResponse(BaseModel):
    # Datos básicos
    id_evento: int
    nombre_evento: str
    fecha_evento: date
    ubicacion: str
    descripcion: Optional[str] = None  # Agregado

    # Tipo (ID y Nombre)
    id_tipo: int                       # Agregado
    nombre_tipo: str

    # Dificultad (ID y Nombre)
    id_dificultad: int                 # Agregado
    nombre_dificultad: str

    # Detalles
    costo_participacion: float
    cupo_maximo: int
    cupos_disponibles: int
    
    # Coordenadas (Agregados)
    # Usamos float porque Google Maps y JSON manejan números, no Decimals
    lat: Optional[float] = None
    lng: Optional[float] = None

    class Config:
        from_attributes = True