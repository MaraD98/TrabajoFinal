from typing import Optional
from pydantic import BaseModel, Field, field_validator, field_serializer
from datetime import date

class EventoEditar(BaseModel):
    """
    Schema para editar eventos.
    Todos los campos son opcionales - solo se actualizan los que vengan.
    """
    # CAMPOS DE TEXTO Y FECHA
    nombre_evento: Optional[str] = Field(None, min_length=3, max_length=255)
    fecha_evento: Optional[date] = Field(None, description="Nueva fecha (debe ser futura)")
    ubicacion: Optional[str] = Field(None, min_length=3, max_length=255)
    descripcion: Optional[str] = Field(None, max_length=500)
    
    # CLAVES FORÁNEAS
    id_tipo: Optional[int] = Field(None, gt=0, description="ID del nuevo tipo de evento")
    id_dificultad: Optional[int] = Field(None, gt=0, description="ID de la nueva dificultad")
    
    # COSTO
    costo_participacion: Optional[float] = Field(None, ge=0.0, description="El costo no puede ser negativo")
    
    # CUPO
    cupo_maximo: Optional[int] = Field(None, ge=0, description="Cupo máximo de participantes")
    
    # ✅ COORDENADAS (FALTABAN ESTOS)
    lat: Optional[float] = Field(None, ge=-90, le=90, description="Latitud del evento")
    lng: Optional[float] = Field(None, ge=-180, le=180, description="Longitud del evento")
    
    @field_serializer('fecha_evento')
    def serializar_fecha(self, valor) -> str:
        if valor is None:
            return None
        return valor.strftime('%d-%m-%Y')

    # VALIDADORES
    @field_validator('fecha_evento')
    def validar_fecha_futura(cls, v):
        if v and v < date.today():
            raise ValueError('La fecha del evento no puede ser anterior a hoy')
        return v
        
    @field_validator('costo_participacion')
    def validar_costo(cls, v):
        if v is not None and v < 0:
            raise ValueError('El costo de participación no puede ser negativo')
        return v

    class Config:
        from_attributes = True