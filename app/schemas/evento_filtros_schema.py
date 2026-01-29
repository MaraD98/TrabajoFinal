from pydantic import BaseModel, Field
from typing import Optional
from datetime import date

class EventoFiltros(BaseModel):
    """
    Schema para filtros de búsqueda de eventos (HU-7.1 a 7.10)
    Todos los campos son opcionales para permitir combinaciones flexibles
    """
    
    # HU-7.6: Búsqueda por nombre o palabra clave
    busqueda: Optional[str] = Field(
        None, 
        max_length=100,
        description="Búsqueda por nombre de evento o ubicación (parcial, insensible a mayúsculas)"
    )
    
    # HU-7.2: Filtrado por fecha o rango
    fecha_desde: Optional[date] = Field(
        None,
        description="Fecha inicial del rango (incluida)"
    )
    fecha_hasta: Optional[date] = Field(
        None,
        description="Fecha final del rango (incluida)"
    )
    fecha_exacta: Optional[date] = Field(
        None,
        description="Fecha exacta del evento (si se usa, ignora fecha_desde/fecha_hasta)"
    )
    
    # HU-7.3: Filtrado por ubicación
    ubicacion: Optional[str] = Field(
        None,
        max_length=150,
        description="Filtro por provincia, ciudad o región (parcial, insensible a mayúsculas)"
    )
    
    # HU-7.4: Filtrado por tipo de evento
    id_tipo: Optional[int] = Field(
        None,
        ge=1,
        description="ID del tipo de evento (1=Carrera, 2=Paseo, 3=Entrenamiento, 4=Cicloturismo)"
    )
    
    # HU-7.5: Filtrado por nivel de dificultad
    id_dificultad: Optional[int] = Field(
        None,
        ge=1,
        description="ID de dificultad (1=Básico, 2=Intermedio, 3=Avanzado/Experto)"
    )
    
    # HU-7.7: Paginación (para respuesta rápida)
    skip: int = Field(
        0,
        ge=0,
        description="Número de registros a saltar (paginación)"
    )
    limit: int = Field(
        50,
        ge=1,
        le=100,
        description="Máximo de registros a devolver (máx 100)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "busqueda": "ciclo",
                "fecha_desde": "2026-02-01",
                "fecha_hasta": "2026-12-31",
                "ubicacion": "Córdoba",
                "id_tipo": 1,
                "id_dificultad": 2,
                "skip": 0,
                "limit": 20
            }
        }

class EventosFiltradosResponse(BaseModel):
    """
    Respuesta paginada con información de filtros (HU-7.8, 7.9, 7.10)
    """
    total: int = Field(..., description="Total de eventos que cumplen los filtros")
    eventos: list = Field(..., description="Lista de eventos encontrados")
    skip: int
    limit: int
    filtros_aplicados: dict = Field(..., description="Resumen de filtros usados")
    mensaje: Optional[str] = Field(
        None,
        description="Mensaje informativo (HU-7.8: mostrar si no hay resultados)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "total": 15,
                "eventos": [],
                "skip": 0,
                "limit": 20,
                "filtros_aplicados": {
                    "busqueda": "ciclo",
                    "ubicacion": "Córdoba",
                    "tipo": "Carrera"
                },
                "mensaje": "Se encontraron 15 eventos"
            }
        }