from pydantic import BaseModel
from datetime import date

class EventoCalendarioResponse(BaseModel):
    id_evento: int
    nombre_evento: str
    fecha_evento: date
    ubicacion: str
    
    # Estos campos se llenarán "mágicamente" gracias al JOIN que haremos en el CRUD
    nombre_tipo: str       
    nivel_dificultad: str 

    # --- AGREGAR ESTOS DOS ---
    # Usamos "int" para cupo y "float" (o str) para el precio
    cupo_maximo: int | None = None
    costo_participacion: float | str | None = None 
    # -------------------------

    class Config:
        from_attributes = True