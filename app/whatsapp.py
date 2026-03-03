import os
from dotenv import load_dotenv
from twilio.rest import Client

load_dotenv()

# --- CONFIGURACIÓN GLOBAL ---
TWILIO_SID = os .getenv("TWILIO_SID") 
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")  
TWILIO_NUMBER = os.getenv("TWILIO_NUMBER")  

# --- PIE DE SEGURIDAD ---
PIE_SEGURIDAD = (
    "\n\n---\n"
    "🛡️ *Aviso de seguridad:* Wake Up Bikes nunca te solicitará contraseñas, códigos por SMS ni datos de tarjetas por este medio. "
    "Nuestras confirmaciones son solo informativas."
)

def _ejecutar_envio_whatsapp(telefono_destino: str, mensaje: str):
    """Función interna para disparar el mensaje vía Twilio"""
    print(f"DEBUG - Intentando envío WhatsApp a: {telefono_destino}...")
    
    # Agregamos el pie de seguridad a todos los mensajes
    mensaje_final = mensaje + PIE_SEGURIDAD
    
    if not telefono_destino.startswith('+'):
        telefono_destino = f"+{telefono_destino}"
    
    try:
        client = Client(TWILIO_SID, TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            from_=TWILIO_NUMBER,
            body=mensaje_final,
            to=f"whatsapp:{telefono_destino}"
        )
        print(f"✅ WhatsApp Enviado! SID: {message.sid}")
        return True
    except Exception as e:
        print(f"❌ Error enviando WhatsApp: {e}")
        return False

# --- FUNCIONES DE AVISO ---

def enviar_whatsapp_reserva(telefono: str, nombre_usuario: str, evento: str, fecha: str):
    print(f"DEBUG - Preparando mensaje WhatsApp para {nombre_usuario} ({telefono}) sobre evento '{evento}' el {fecha}")
    texto = (
        f"🚲 *¡Hola {nombre_usuario}! Reserva Confirmada*\n\n"
        f"Te confirmamos tu lugar para: *{evento}*\n"
        f"📅 Fecha: {fecha}\n\n"
        f"⚠️ *ACCIÓN REQUERIDA:* Recordá que tenés 72 horas para realizar el pago y asegurar tu lugar."
    )
    return _ejecutar_envio_whatsapp(telefono, texto)

def enviar_whatsapp_modificacion_evento(telefono: str, nombre_evento: str):
    texto = (
        f"📝 *Cambio en tu evento: {nombre_evento}*\n\n"
        f"Hola ciclista, te avisamos que hubo cambios en los detalles. "
        f"Por favor, revisá la plataforma para ver la nueva info."
    )
    return _ejecutar_envio_whatsapp(telefono, texto)

def enviar_whatsapp_cancelacion_evento(telefono: str, nombre_evento: str, motivo: str):
    texto = (
        f"❌ *EVENTO CANCELADO: {nombre_evento}*\n\n"
        f"Lamentamos informarte que el evento se canceló.\n"
        f"Motivo: {motivo}"
    )
    return _ejecutar_envio_whatsapp(telefono, texto)