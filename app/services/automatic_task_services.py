import os
from fastapi import APIRouter, Header, HTTPException, Depends
from sqlalchemy.orm import Session
from TrabajoFinal.app.db.database import get_db
from services.registro_services import cancelar_eventos_por_baja_ocupacion

router = APIRouter()

@router.get("/cron/revisar-eventos")
def ejecutar_revision_diaria(
    cron_secret: str = Header(None), 
    db: Session = Depends(get_db)
):
    SECRETO_ESPERADO = os.getenv("SECRETO_ESPERADO")
    
    # CORRECCIÓN DE SEGURIDAD: 
    # Validamos que el secreto exista en el entorno y que coincida con el header
    if not SECRETO_ESPERADO or cron_secret != SECRETO_ESPERADO:
        raise HTTPException(status_code=401, detail="No autorizado")

    try:
        resultado = cancelar_eventos_por_baja_ocupacion(db)
        
        # CORRECCIÓN DE LOGS: Agregamos el resultado al return
        return {
            "status": "ok", 
            "mensaje": "Revisión completada con éxito",
            "detalles": resultado
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))