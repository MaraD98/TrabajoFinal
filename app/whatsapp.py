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

def enviar_whatsapp_rechazo_edicion(telefono: str, nombre_evento: str):
    texto = (
        f"❌ *SOLICITUD DE EDICIÓN RECHAZADA*\n\n"
        f"Hola, te informamos que los cambios propuestos para el evento: *{nombre_evento}* "
        f"han sido rechazados por la administración.\n\n"
        f"El evento se mantendrá publicado con la información actual."
    )
    return _ejecutar_envio_whatsapp(telefono, texto)

def enviar_whatsapp_aprobacion_edicion(telefono: str, nombre_evento: str):
    texto = (
        f"✅ *CAMBIOS APROBADOS*\n\n"
        f"¡Buenas noticias! Tu solicitud de edición para el evento: *{nombre_evento}* "
        f"ha sido aprobada y ya está actualizada en la plataforma."
    )
    return _ejecutar_envio_whatsapp(telefono, texto)

def enviar_whatsapp_aprobacion_publicacion(telefono: str, nombre_evento: str):
    texto = (
        f"🚀 *¡EVENTO PUBLICADO!*\n\n"
        f"¡Felicidades! Tu solicitud para el evento: *{nombre_evento}* ha sido aprobada. "
        f"Ya se encuentra visible en el calendario para que los ciclistas se inscriban."
    )
    return _ejecutar_envio_whatsapp(telefono, texto)

# --- FUNCIONES DE BAJA (ORGANIZADOR) ---

def enviar_whatsapp_baja_aprobada(telefono: str, nombre_evento: str):
    texto = (
        f"✅ *SOLICITUD DE BAJA APROBADA*\n\n"
        f"Hola, te informamos que tu solicitud para dar de baja el evento: *{nombre_evento}* "
        f"ha sido aprobada.\n\n"
        f"El evento ha sido cancelado y los inscritos ya han sido notificados."
    )
    return _ejecutar_envio_whatsapp(telefono, texto)

def enviar_whatsapp_baja_rechazada(telefono: str, nombre_evento: str):
    texto = (
        f"❌ *SOLICITUD DE BAJA RECHAZADA*\n\n"
        f"Hola, te informamos que tu pedido de baja para el evento: *{nombre_evento}* "
        f"ha sido revisado y *rechazado* por la administración.\n\n"
        f"El evento continuará publicado en el calendario."
    )
    return _ejecutar_envio_whatsapp(telefono, texto)