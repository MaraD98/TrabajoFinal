from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db 
from app.db.crud import calendario_crud as crud
from app.schemas import calendario_schema as schemas
from app.services import calendario_services as service     
from app.models.inscripcion_models import ReservaEvento 

router = APIRouter(tags=["Calendario"])
calendario_srv = service.CalendarioService()

@router.get("/eventos/calendario", response_model=List[schemas.EventoCalendarioResponse])
def obtener_calendario_mensual(
    month: int = Query(..., ge=1, le=12, description="Número del mes (1-12)"),
    year: int = Query(..., ge=2024, description="Año a consultar"),
    db: Session = Depends(get_db)
):
    """
    Endpoint para el calendario mensual.
    Devuelve eventos con detalles completos (IDs, Nombres, Coordenadas, etc.)
    """
    
    # 1. Llamamos al servicio (Lógica de fechas)
    fecha_inicio, fecha_fin = calendario_srv.obtener_rango_fechas(month, year)
    
    if not fecha_inicio:
        return [] 

    # 2. Llamamos al CRUD (Base de datos)
    resultados_db = crud.get_eventos_calendario(db, fecha_inicio, fecha_fin)
    
    # 3. Mapeo manual (ACTUALIZADO CON CÁLCULO DE CUPOS)
    lista_eventos = []
    
    for row in resultados_db:
        
        # --- NUEVA LÓGICA: CALCULAR CUPOS ---
        id_evento_actual = row[0]
        cupo_maximo_actual = row[10] if row[10] is not None else 0
        
        # Contamos cuántos inscriptos hay
        ocupados = db.query(ReservaEvento).filter(ReservaEvento.id_evento == id_evento_actual).count()
        
        # Calculamos disponibles
        disponibles = cupo_maximo_actual - ocupados
        # ------------------------------------

        evento_dict = {
            # --- Datos Básicos ---
            "id_evento": row[0],       
            "nombre_evento": row[1],
            "fecha_evento": row[2],
            "ubicacion": row[3],

            # --- Tipo ---
            "id_tipo": row[4] if row[4] is not None else 0,
            "nombre_tipo": row[5] if row[5] is not None else "General",

            # --- Dificultad ---
            "id_dificultad": row[6] if row[6] is not None else 0,
            "nombre_dificultad": row[7] if row[7] is not None else "General",

            # --- Detalles Extra ---
            "descripcion": row[8] if row[8] is not None else "",
            "costo_participacion": row[9] if row[9] is not None else 0.0,
            "cupo_maximo": cupo_maximo_actual,

            # --- AQUI AGREGAMOS EL RESULTADO ---
            "cupos_disponibles": disponibles, 
            # -----------------------------------

            # --- Coordenadas ---
            "lat": row[11] if row[11] is not None else None,
            "lng": row[12] if row[12] is not None else None
        }
        lista_eventos.append(evento_dict)
    
    return lista_eventos