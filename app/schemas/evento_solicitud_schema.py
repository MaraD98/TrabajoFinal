from pydantic import BaseModel, Field, field_validator, field_serializer
from datetime import date
from typing import Optional, Union, Any
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
    nombre_evento: str = Field(..., min_length=3, max_length=100, description="Nombre del evento")
    fecha_evento: date = Field(..., description="Fecha del evento")
    ubicacion: str = Field(..., min_length=3, max_length=300, description="Ubicación del evento")
    id_tipo: int = Field(..., gt=0, description="ID del tipo de evento (1='Ciclismo de Ruta, 2=Mountain Bike (MTB), 3=Rural Bike, 4=Gravel, 5=Cicloturismo, 6=Entrenamiento / Social')")
    id_dificultad: int = Field(..., gt=0, description="ID de dificultad (1=Básico, 2=Intermedio, 3=Avanzado)")
    descripcion: Optional[str] = Field(None, max_length=1000, description="Descripción del evento")
    costo_participacion: Decimal = Field(..., ge=0, description="Costo de participación")
    lat: Optional[Decimal] = None
    lng: Optional[Decimal] = None
    cupo_maximo: int = Field(..., gt=0, description="Cupo máximo de participantes")
    distancia_km: Optional[Decimal] = Field(None, description="Distancia total de la ruta en kilómetros")
    ruta_coordenadas: Optional[list[dict[str, Any]]] = Field(None, description="Array de coordenadas [ {lat, lng}, ... ]")

    
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
    id_solicitud: int
    nombre_evento: str
    fecha_evento: date
    ubicacion: str
    id_tipo: int
    id_dificultad: int
    descripcion: Optional[str]
    costo_participacion: Decimal
    id_estado_solicitud: Optional[int]
    fecha_solicitud: date
    observaciones_admin: Optional[str]
    id_usuario: int
    usuario: Optional[UsuarioBasico] = None
    estado_solicitud: Optional[EstadoSolicitudInfo] = None
    lat: Optional[Decimal] = None
    lng: Optional[Decimal] = None
    distancia_km: Optional[Decimal] = None
    ruta_coordenadas: Optional[list] = None

    
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