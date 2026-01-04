from pydantic import BaseModel
from datetime import date

class EventoCalendarioResponse(BaseModel):
    id_evento: int
    nombre_evento: str
    fecha_evento: date
    ubicacion: str
    
    # Estos campos se llenarán "mágicamente" gracias al JOIN que haremos en el CRUD
    nombre_tipo: str       
    nombre_dificultad: str 

    class Config:
        from_attributes = True