from pydantic import BaseModel, Field, field_validator, field_serializer
from datetime import date
from typing import Optional, Union
from decimal import Decimal

# ============================================================
# SCHEMA BORRADOR — todos los campos opcionales
# Se usa cuando enviar=False (autoguardado cada 30s como Gmail)
# El backend acepta guardar con cualquier combinación de campos
# ============================================================
class SolicitudBorradorCreate(BaseModel):
    nombre_evento: Optional[str]         = Field(None, max_length=100)
    fecha_evento:  Optional[date]         = None
    ubicacion:     Optional[str]          = Field(None, max_length=150)
    id_tipo:       Optional[int]          = Field(None, gt=0)
    id_dificultad: Optional[int]          = Field(None, gt=0)
    descripcion:   Optional[str]          = Field(None, max_length=1000)
    costo_participacion: Optional[Decimal] = Field(None, ge=0)
    lat:           Optional[Decimal]      = None
    lng:           Optional[Decimal]      = None
    cupo_maximo:   Optional[int]          = Field(None, ge=0)


# ============================================================
# SCHEMA ENVÍO — todos los campos requeridos con validaciones
# Se usa cuando enviar=True (el usuario hace clic en "Enviar")
# ============================================================
class SolicitudPublicacionCreate(BaseModel):
    nombre_evento:       str     = Field(..., min_length=3, max_length=100)
    fecha_evento:        date    = Field(..., description="Fecha del evento")
    ubicacion:           str     = Field(..., min_length=3, max_length=150)
    id_tipo:             int     = Field(..., gt=0)
    id_dificultad:       int     = Field(..., gt=0)
    descripcion:         Optional[str]    = Field(None, max_length=1000)
    costo_participacion: Decimal          = Field(default=Decimal("0"), ge=0)
    lat:                 Optional[Decimal] = None
    lng:                 Optional[Decimal] = None
    cupo_maximo:         int     = Field(..., gt=0, description="Cupo máximo, debe ser mayor a 0")

    @field_validator('fecha_evento')
    @classmethod
    def validar_fecha_futura(cls, v):
        if v < date.today():
            raise ValueError('La fecha del evento debe ser futura')
        return v

    @field_validator('costo_participacion')
    @classmethod
    def validar_costo(cls, v):
        if v < 0:
            raise ValueError('El costo no puede ser negativo')
        return v


# --- Schemas Auxiliares ---
class EstadoSolicitudInfo(BaseModel):
    id_estado_solicitud: int
    nombre: str
    class Config:
        from_attributes = True

class EstadoEventoInfo(BaseModel):
    id_estado: int
    nombre: str
    class Config:
        from_attributes = True

class UsuarioBasico(BaseModel):
    id_usuario: int
    nombre_y_apellido: str
    email: str
    class Config:
        from_attributes = True


# --- Respuesta Principal ---
class SolicitudPublicacionResponse(BaseModel):
    id_solicitud:        int
    nombre_evento:       Optional[str]    = None
    fecha_evento:        Optional[date]   = None
    ubicacion:           Optional[str]    = None
    id_tipo:             Optional[int]    = None
    id_dificultad:       Optional[int]    = None
    descripcion:         Optional[str]    = None
    costo_participacion: Optional[Decimal] = None
    cupo_maximo:         Optional[int]    = None
    id_estado_solicitud: Optional[int]    = None
    fecha_solicitud:     date
    observaciones_admin: Optional[str]    = None
    id_usuario:          int
    usuario:             Optional[UsuarioBasico]    = None
    estado_solicitud:    Optional[EstadoSolicitudInfo] = None

    @field_serializer('fecha_evento')
    def serializar_fecha(self, valor: Optional[date]) -> Optional[str]:
        if valor is None:
            return None
        return valor.strftime('%d-%m-%Y')

    class Config:
        from_attributes = True


# ============== Revisión admin ==============
class RevisionSolicitud(BaseModel):
    id_estado_solicitud: int = Field(..., ge=1, le=3)
    observaciones_admin: Optional[str] = Field(None, max_length=1000)

    @field_validator('id_estado_solicitud')
    @classmethod
    def validar_estado(cls, v):
        if v not in [1, 2, 3]:
            raise ValueError(f'Estado debe ser 1, 2 o 3')
        return v


class SolicitudesPaginadas(BaseModel):
    total: int
    solicitudes: list[SolicitudPublicacionResponse]
    pagina: int
    por_pagina: int

class SolicitudEliminacionResponse(BaseModel):
    id_eliminacion: int
    id_evento: int
    nombre_evento: str
    motivo: str
    fecha_solicitud: date
    usuario_solicitante: str
    class Config:
        from_attributes = True

class TipoEventoResponse(BaseModel):
    id_tipo: int
    nombre: str
    class Config:
        from_attributes = True

class NivelDificultadResponse(BaseModel):
    id_dificultad: int
    nombre: str
    class Config:
        from_attributes = True