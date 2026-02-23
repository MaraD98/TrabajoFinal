from pydantic import BaseModel, Field, field_validator, ConfigDict, field_serializer
from datetime import date, datetime 
from typing import Optional, Any
from decimal import Decimal


# ============================================================================
# SCHEMAS DE EVENTOS
# ============================================================================

class EventoBase(BaseModel):
    """Campos comunes para eventos"""
    nombre_evento: str = Field(..., max_length=255, min_length=1, description="Nombre del evento")
    ubicacion: str = Field(..., max_length=300)
    fecha_evento: date
    descripcion: Optional[str] = Field(None, max_length=500)
    costo_participacion: Decimal = Field(..., ge=0, description="Costo de inscripción")
    id_tipo: int = Field(..., gt=0, description="ID del tipo de evento")
    id_dificultad: int = Field(..., gt=0, description="ID de la dificultad")
    lat: Optional[Decimal] = None
    lng: Optional[Decimal] = None
    cupo_maximo: Optional[int] = Field(default=0, ge=0, description="Cupo máximo de participantes")
    distancia_km: Optional[Decimal] = Field(None, description="Distancia total de la ruta en kilómetros")
    ruta_coordenadas: Optional[list[dict[str, Any]]] = Field(None, description="Array de coordenadas [ {lat, lng}, ... ]")

class EventoCreate(EventoBase):
    """Schema para crear eventos con validaciones"""
    
    @field_validator('fecha_evento')
    @classmethod
    def validar_fecha_futura(cls, v):
        if v <= date.today():
            raise ValueError("La fecha del evento debe ser futura.")
        return v


# ✅ NUEVO: Schema permisivo para borradores de admin/supervisor
# Todos los campos opcionales — igual que SolicitudBorradorCreate para externos
# Se usa cuando enviar=False en el endpoint POST /eventos/
class EventoBorradorCreate(BaseModel):
    """
    Schema para guardar borradores de eventos (admin/supervisor).
    Todos los campos son opcionales para permitir autoguardado parcial,
    igual que Gmail guarda borradores sin validar que estén completos.
    """
    nombre_evento:       Optional[str]     = Field(None, max_length=255)
    ubicacion:           Optional[str]     = Field(None, max_length=255)
    fecha_evento:        Optional[date]    = None
    descripcion:         Optional[str]     = Field(None, max_length=500)
    costo_participacion: Optional[Decimal] = Field(None, ge=0)
    id_tipo:             Optional[int]     = Field(None, gt=0)
    id_dificultad:       Optional[int]     = Field(None, gt=0)
    lat:                 Optional[Decimal] = None
    lng:                 Optional[Decimal] = None
    cupo_maximo:         Optional[int]     = Field(None, ge=0)


class EventoResponse(EventoBase):
    """Schema para respuestas con IDs"""
    id_evento: int
    id_usuario: int
    id_estado: int
    cupos_disponibles: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

# 👇 Formatea la fecha en TODAS las respuestas
    @field_serializer('fecha_evento')
    def serializar_fecha(self, valor) -> str:
        if valor is None:
            return None
        return valor.strftime('%d-%m-%Y')
# ============================================================================
# SCHEMAS DE MULTIMEDIA
# ============================================================================

class MultimediaResponse(BaseModel):
    """Schema para respuestas de multimedia"""
    id_multimedia: int
    id_evento: int
    url_archivo: str
    tipo_archivo: str

    model_config = ConfigDict(from_attributes=True)


# =====================================================================
# NUEVOS SCHEMAS PARA INSCRIPCIONES (SPRINT 3 - HU 8.1 a 8.7)
# =====================================================================

class EventoConCuposResponse(EventoResponse):
    cupos_ocupados: int
    cupos_disponibles: int
    
    # Un campo extra para facilitar el front (true si cupos_disponibles == 0)
    esta_lleno: bool = False # Le puse default False por seguridad

    model_config = ConfigDict(from_attributes=True)


class ReservaResponseSchema(BaseModel):
    id_reserva: int
    id_evento: int
    id_usuario: int
    fecha_reserva: datetime
    fecha_expiracion: Optional[datetime] #Para mostrar cuándo vence
    id_estado_reserva: int
    lat: Optional[Decimal] = None
    lng: Optional[Decimal] = None
    distancia_km: Optional[Decimal] = None
    ruta_coordenadas: Optional[list] = None

    model_config = ConfigDict(from_attributes=True)
    
    # --- (NUEVO) HU 4.1: Input para cancelar evento ---
class EventoCancelacionRequest(BaseModel):
    motivo: str = Field(..., min_length=5, description="Motivo por el cual se cancela el evento")