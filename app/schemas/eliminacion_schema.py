from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


# ============================================================================
# INPUT SCHEMAS (Request)
# ============================================================================

class EliminacionRequest(BaseModel):
    """
    Schema para solicitar cancelación/eliminación de un evento.
    
    Usado en:
    - HU 4.1: Cancelar evento propio
    - HU 4.2: Solicitar baja (externo)
    - HU 4.3: Eliminar como admin
    """
    motivo: str = Field(
        ..., 
        min_length=5, 
        max_length=1000,
        description="Razón de la cancelación/eliminación"
    )


class AprobarRechazoRequest(BaseModel):
    """
    Schema para que el admin apruebe/rechace solicitudes de baja.
    """
    observaciones: str | None = Field(
        None,
        max_length=500,
        description="Observaciones del administrador"
    )


# ============================================================================
# OUTPUT SCHEMAS (Response)
# ============================================================================

class EliminacionResponse(BaseModel):
    """
    Respuesta estándar después de cancelar/eliminar un evento.
    """
    mensaje: str
    id_evento: int
    estado_nuevo: str
    id_eliminacion: int | None = None
    
    model_config = ConfigDict(from_attributes=True)


class SolicitudBajaResponse(BaseModel):
    """
    Schema para mostrar solicitudes de baja pendientes (Admin).
    
    Usado en: GET /eliminacion/admin/bajas-pendientes
    """
    id_eliminacion: int
    id_evento: int
    nombre_evento: str
    motivo: str
    fecha_solicitud: datetime
    usuario_solicitante: str
    
    model_config = ConfigDict(from_attributes=True)


class HistorialEliminacionResponse(BaseModel):
    """
    Schema para el historial completo de eliminaciones.
    
    Usado en: GET /eliminacion/admin/historial
    """
    id_evento: int
    nombre_evento: str
    fecha_eliminacion: str
    motivo: str
    eliminado_por: str
    estado: str
    tipo_eliminacion: str  # "soft_delete" | "hard_delete"
    
    model_config = ConfigDict(from_attributes=True)


class NotificacionEliminacionInfo(BaseModel):
    """
    Información sobre el estado de notificaciones enviadas.
    """
    id_eliminacion: int
    notificacion_enviada: bool
    total_notificados: int
    
    model_config = ConfigDict(from_attributes=True)