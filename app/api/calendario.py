from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
# Asegúrate de que estos imports coincidan con tu estructura
from app.db.database import get_db 
from app.db.crud import calendario_crud as crud
from app.schemas import calendario_schema as schemas
from app.services import calendario_services as service     

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
    """
    
    # 1. Llamamos al servicio (Lógica de fechas)
    fecha_inicio, fecha_fin = calendario_srv.obtener_rango_fechas(month, year)
    
    if not fecha_inicio:
        return [] 

    # 2. Llamamos al CRUD (Base de datos)
    resultados_db = crud.get_eventos_calendario(db, fecha_inicio, fecha_fin)
    
    # 3. Mapeo manual (SOLUCIÓN FINAL)
    lista_eventos = []
    
    for row in resultados_db:
        evento_dict = {
            # 👇 AQUÍ ESTABA EL ERROR: Cambiamos "id" por "id_evento"
            "id_evento": row[0],       
            "nombre_evento": row[1],
            "fecha_evento": row[2],
            "ubicacion": row[3],
            "nombre_tipo": row[4],
            "nombre_dificultad": row[5] if row[5] else "Sin dificultad"
        }
        lista_eventos.append(evento_dict)
    
    return lista_eventos