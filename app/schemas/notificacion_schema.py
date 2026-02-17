from pydantic import BaseModel, field_serializer
from datetime import datetime
from typing import Optional

# Para crear una notificación
class NotificacionCreate(BaseModel):
    id_usuario: int
    mensaje: str

# Para devolver una notificación
class NotificacionResponse(BaseModel):
    id_notificacion: int
    id_usuario: int
    id_estado_solicitud: Optional[int]
    mensaje: str
    fecha_creacion: datetime
    leida: bool

    @field_serializer('fecha_creacion')
    def serializar_fecha(self, valor) -> str:
        if valor is None:
            return None
        return valor.strftime('%d-%m-%Y %H:%M')
    
    class Config:
        from_attributes = True

# Para actualizar estado de lectura
class NotificacionUpdate(BaseModel):
    leida: Optional[bool] = None
