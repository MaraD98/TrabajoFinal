from pydantic import BaseModel, Field, field_validator, field_serializer
from datetime import date
from typing import Optional, Any
from decimal import Decimal

# ============== SCHEMAS PARA HU-2.1 (Crear solicitud) ==============

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

# --- Schemas Auxiliares para Respuestas ---
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

# --- Respuesta Principal: Solicitud de Alta ---
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
    def serializar_fecha(self, valor: date) -> str:
        if valor is None:
            return None
        return valor.strftime('%d-%m-%Y')
    
    class Config:
        from_attributes = True

# ============== SCHEMAS PARA HU-2.2 (Revisión admin) ==============

class RevisionSolicitud(BaseModel):
    id_estado_solicitud: int = Field(..., ge=1, le=3, description="1=Pendiente, 2=Aprobada, 3=Rechazada")
    observaciones_admin: Optional[str] = Field(None, max_length=1000, description="Observaciones del administrador")
    
    @field_validator('id_estado_solicitud')
    @classmethod
    def validar_estado(cls, v):
        estados_validos = [1, 2, 3]
        if v not in estados_validos:
            raise ValueError(f'Estado debe ser uno de: {estados_validos}')
        return v

class SolicitudesPaginadas(BaseModel):
    total: int
    solicitudes: list[SolicitudPublicacionResponse]
    pagina: int
    por_pagina: int

# ============== NUEVO: SCHEMA PARA SOLICITUDES DE BAJA ==============
class SolicitudEliminacionResponse(BaseModel):
    id_eliminacion: int
    id_evento: int
    nombre_evento: str
    motivo: str
    fecha_solicitud: date
    usuario_solicitante: str  # Email o Nombre
    
    class Config:
        from_attributes = True

# ============== SCHEMAS PARA CATÁLOGOS ==============
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