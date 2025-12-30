from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# Para crear una notificación
class NotificacionCreate(BaseModel):
    id_usuario: int
    id_estado_solicitud: int
    mensaje: str

# Para devolver una notificación
class NotificacionResponse(BaseModel):
    id_notificacion: int
    id_usuario: int
    id_estado_solicitud: int
    mensaje: str
    fecha_creacion: datetime
    leida: bool

    class Config:
        from_attributes = True

# Para actualizar estado de lectura
class NotificacionUpdate(BaseModel):
    leida: Optional[bool] = None
