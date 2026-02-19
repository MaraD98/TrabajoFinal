from pydantic import BaseModel, field_serializer
from datetime import date
from typing import Optional

class EventoCalendarioResponse(BaseModel):
    id_evento: int
    nombre_evento: str
    fecha_evento: date
    ubicacion: str
    descripcion: Optional[str] = None
    
    id_tipo: int
    nombre_tipo: str
    
    id_dificultad: int
    nombre_dificultad: str
    
    costo_participacion: float
    cupo_maximo: int
    
    # CAMBIO AQUÍ: Ahora es Optional[int] para aceptar null
    cupos_disponibles: Optional[int] = None 
    
    lat: Optional[float] = None
    lng: Optional[float] = None
    
    # 👇 AGREGAR ESTO
    @field_serializer('fecha_evento')
    def serializar_fecha(self, valor: date) -> str:
        if valor is None:
            return None
        return valor.strftime('%d-%m-%Y')

    class Config:
        from_attributes = True