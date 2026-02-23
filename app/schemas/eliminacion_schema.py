from pydantic import BaseModel, Field, ConfigDict, field_serializer
from datetime import datetime, date


class EliminacionRequest(BaseModel):
    motivo: str = Field(
        ..., 
        min_length=5, 
        max_length=1000,
        description="Razón de la cancelación/eliminación"
    )


class AprobarRechazoRequest(BaseModel):
    observaciones: str | None = Field(
        None,
        max_length=500,
        description="Observaciones del administrador"
    )


class EliminacionResponse(BaseModel):
    mensaje: str
    id_evento: int
    estado_nuevo: str
    id_eliminacion: int | None = None
    
    model_config = ConfigDict(from_attributes=True)


class SolicitudBajaResponse(BaseModel):
    id_eliminacion: int
    id_evento: int
    nombre_evento: str
    motivo: str
    fecha_solicitud: datetime
    usuario_solicitante: str
    estado_solicitud: str = 'pendiente'
    
    @field_serializer('fecha_solicitud')
    def serializar_fecha(self, valor) -> str:
        if valor is None:
            return None
        return valor.strftime('%d-%m-%Y')  # ✅ FIX: sin hora
    
    model_config = ConfigDict(from_attributes=True)


class HistorialEliminacionResponse(BaseModel):
    id_evento: int
    nombre_evento: str
    fecha_eliminacion: str
    motivo: str
    eliminado_por: str
    estado: str
    tipo_eliminacion: str

    model_config = ConfigDict(from_attributes=True)


class NotificacionEliminacionInfo(BaseModel):
    id_eliminacion: int
    notificacion_enviada: bool
    total_notificados: int
    
    model_config = ConfigDict(from_attributes=True)