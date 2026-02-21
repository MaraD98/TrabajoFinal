import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv 
import mercadopago 

load_dotenv()  # Carga las variables de entorno desde el archivo .env

router = APIRouter(prefix="/pagos", tags=["Pagos"])

# Ahora el SDK usa la variable del .env
sdk = mercadopago.SDK(os.getenv("MERCADOPAGO_TOKEN"))

# Definimos qué datos esperamos del Frontend
class PagoRequest(BaseModel):
    id_reserva: int
    nombre_evento: str
    precio: float

@router.post("/crear_preferencia")
async def crear_preferencia(datos: PagoRequest):
    try:
        # Mantenemos tus datos tal cual, pero aseguramos tipos
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
                "success": "https://trabajofinal-1-5r4j.onrender.com/perfil?tab=inscripciones",
                "failure": "https://trabajofinal-1-5r4j.onrender.com/perfil?tab=inscripciones",
                "pending": "https://trabajofinal-1-5r4j.onrender.com/perfil?tab=inscripciones"
            },
            # COMENTAMOS ESTO PARA QUE DEJE DE CHILLAR
            #"auto_return": "approved", 
            "external_reference": str(datos.id_reserva),
            "binary_mode": True 
        }

        # Enviamos la info a Mercado Pago
        preference_response = sdk.preference().create(preference_data)
        
        # SI FALLA, esto nos va a decir la posta en la consola
        if preference_response["status"] >= 400:
            print("--- DETALLE DEL ERROR QUE VE MP ---")
            print(preference_response["response"])
            raise HTTPException(status_code=400, detail="Error en la creación de preferencia")

        preference = preference_response["response"]

        return {
            "preference_id": preference["id"],
            "init_point": preference["init_point"]
        }
    except Exception as e:
        print(f"Error de Mercado Pago: {e}")
        raise HTTPException(status_code=500, detail=str(e))