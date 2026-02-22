import os
from pydantic import BaseModel
from dotenv import load_dotenv 
import mercadopago 
from fastapi import APIRouter, HTTPException, Request # Agregamos Request
from fastapi.responses import RedirectResponse # Agregamos RedirectResponse

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
                "success": "https://trabajofinal-1bm4.onrender.com/api/v1/pagos/confirmar_pago",
                "failure": "https://trabajofinal-1bm4.onrender.com/api/v1/pagos/confirmar_pago",
                "pending": "https://trabajofinal-1bm4.onrender.com/api/v1/pagos/confirmar_pago"
            },
            # COMENTAMOS ESTO PARA QUE DEJE DE CHILLAR
            "auto_return": "approved", 
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
    
# ==========================================
# 🚀 EL RECIBIDOR (ENDPOINT PARA EL RETORNO)
# ==========================================
@router.get("/confirmar_pago")
async def confirmar_pago(
    request: Request,
    status: str = None,
    external_reference: str = None, # Aquí viene tu id_reserva
    payment_id: str = None
):
    """
    Este endpoint recibe al usuario cuando vuelve de Mercado Pago.
    """
    # 1. URL de tu FRONTEND real (ajustala si es otra)
    URL_FRONT = "https://trabajofinal-1-5r4j.onrender.com" 

    # 2. Lógica para actualizar tu base de datos (opcional por ahora, pero recomendada)
    if status == "approved":
        print(f"Reserva {external_reference} pagada con éxito. ID Pago: {payment_id}")
        # Aquí llamarías a tu CRUD: db_actualizar_reserva(id=external_reference, estado="Pagado")

    # 3. Redirigimos al usuario a la pestaña de inscripciones del FRONT
    return RedirectResponse(url=f"{URL_FRONT}/perfil?tab=inscripciones&status={status}")