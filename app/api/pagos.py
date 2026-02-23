import os
from pydantic import BaseModel
from dotenv import load_dotenv 
import mercadopago 
from fastapi import APIRouter, HTTPException, Request, Depends 
from fastapi.responses import RedirectResponse 
from sqlalchemy.orm import Session 

# DB y Servicios (Ajustamos a tus rutas reales)
from app.db.database import get_db
from app.services.inscripcion_services import InscripcionService

load_dotenv()

router = APIRouter(prefix="/pagos", tags=["Pagos"])

sdk = mercadopago.SDK(os.getenv("MERCADOPAGO_TOKEN"))

class PagoRequest(BaseModel):
    id_reserva: int
    nombre_evento: str
    precio: float

@router.post("/crear_preferencia")
async def crear_preferencia(datos: PagoRequest):
    try:
        preference_data = {
            "items": [
                {
                    "id": str(datos.id_reserva),
                    "title": str(datos.nombre_evento),
                    "quantity": 1,
                    "unit_price": float(datos.precio),
                    "currency_id": "ARS"
                }
            ],
            "back_urls": {
                "success": "https://trabajofinal-1bm4.onrender.com/api/v1/pagos/confirmar_pago",
                "failure": "https://trabajofinal-1bm4.onrender.com/api/v1/pagos/confirmar_pago",
                "pending": "https://trabajofinal-1bm4.onrender.com/api/v1/pagos/confirmar_pago"
            },
            "auto_return": "approved", 
            "external_reference": str(datos.id_reserva),
            "binary_mode": True 
        }

        preference_response = sdk.preference().create(preference_data)
        
        if preference_response["status"] >= 400:
            raise HTTPException(status_code=400, detail="Error en la creación de preferencia")

        preference = preference_response["response"]
        return {
            "preference_id": preference["id"],
            "init_point": preference["init_point"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# ==========================================
# 🚀 EL RECIBIDOR (ESTO ES LO QUE TE FALTABA)
# ==========================================
@router.get("/confirmar_pago")
async def confirmar_pago(
    request: Request,
    status: str = None,
    external_reference: str = None, # Tu id_reserva
    payment_id: str = None,
    db: Session = Depends(get_db)
):
    # URL de tu FRONTEND
    URL_FRONT = "https://trabajofinal-1-5r4j.onrender.com" 

    # 2. Lógica para actualizar la base de datos
    if status == "approved" and external_reference:
        try:
            id_reserva_int = int(external_reference)
            
            # 🚀 USAMOS LA NUEVA FUNCIÓN AUTOMÁTICA QUE NO PIDE USUARIO
            InscripcionService.confirmar_pago_automatico(
                db=db, 
                id_reserva=id_reserva_int
            )
            print(f"✅ Pago automático impactado en DB para reserva: {id_reserva_int}")
            
        except Exception as e:
            print(f"❌ Error al actualizar DB: {e}")

    # 3. Redirigimos al usuario al perfil
    return RedirectResponse(url=f"{URL_FRONT}/perfil?tab=inscripciones&status={status}")