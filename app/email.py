import smtplib
from email.message import EmailMessage
import os
from dotenv import load_dotenv

load_dotenv()

URL_LOGO = "https://i.ibb.co/5gpVx8Z5/WAKE-UP-LOGO.png"

# Constante de URL
API_URL = os.getenv("VITE_API_URL")

def enviar_correo_reserva(email_destino: str, nombre_usuario: str, evento: str, fecha: str):
    REMITENTE = os.getenv("MAIL_REMITENTE")
    PASSWORD = os.getenv("MAIL_PASSWORD")

    msg = EmailMessage()
    msg['Subject'] = f'🚲 Confirmación de Reserva: {evento}'
    msg['From'] = f'Wake Up Bikes <{REMITENTE}>'
    msg['To'] = email_destino

    url_alta = f"{API_URL}/suscripcion/alta?email={email_destino}"
    url_baja = f"{API_URL}/suscripcion/baja?email={email_destino}"

    html_content = f"""
    <html>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #121212; color: #ffffff;">
            <div style="max-width: 600px; margin: 20px auto; background-color: #1e1e1e; border: 1px solid #333; border-radius: 12px; overflow: hidden;">
                <div style="text-align: center; padding: 20px; background-color: #1e1e1e; border-bottom: 1px solid #333;">
                    <img src="{URL_LOGO}" alt="Wake Up Bikes" style="width: 140px;">
                </div>
                <div style="background-color: #ff6b35; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; color: #121212;">¡Reserva Confirmada!</h1>
                </div>
                <div style="padding: 30px;">
                    <p style="font-size: 18px;">Hola <strong>{nombre_usuario}</strong>,</p>
                    
                    <div style="background-color: #3d2b1f; border: 2px dashed #ff6b35; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                        <h2 style="color: #ff6b35; margin: 0 0 10px 0;">⚠️ ACCIÓN REQUERIDA</h2>
                        <p style="font-size: 16px; margin: 0; line-height: 1.5;">
                            Para asegurar tu lugar, recordá que tenés un plazo de <br>
                            <span style="font-size: 26px; font-weight: bold; color: #ffffff;">72 HORAS</span><br>
                            para realizar el pago. De lo contrario, la reserva expirará automáticamente.
                        </p>
                    </div>

                    <p style="color: #cccccc;">Detalles de tu salida:</p>
                    <div style="background-color: #2a2a2a; border-left: 4px solid #ff6b35; padding: 15px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Evento:</strong> {evento}</p>
                        <p style="margin: 5px 0;"><strong>Fecha:</strong> {fecha}</p>
                    </div>
                </div>
                <div style="background-color: #181818; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #333;">
                    <p>© 2026 Wake Up Bikes - La Chacha Cicloturismo</p>
                    <p>
                        <a href="{url_alta}" style="color: #ff6b35; text-decoration: none;">Suscribirme a novedades</a> 
                        | 
                        <a href="{url_baja}" style="color: #666; text-decoration: none;">Darme de baja</a>
                    </p>
                </div>
            </div>
        </body>
    </html>
    """
    msg.add_alternative(html_content, subtype='html')

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(REMITENTE, PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False
    
def enviar_correo_cancelacion_reserva(email_destino: str, nombre_usuario: str, evento: str):
    REMITENTE = os.getenv("MAIL_REMITENTE")
    PASSWORD = os.getenv("MAIL_PASSWORD")

    msg = EmailMessage()
    msg['Subject'] = f'❌ Cancelación de Reserva: {evento}'
    msg['From'] = f'Wake Up Bikes <{REMITENTE}>'
    msg['To'] = email_destino

    html_content = f"""
    <html>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #121212; color: #ffffff;">
            <div style="max-width: 600px; margin: 20px auto; background-color: #1e1e1e; border: 1px solid #333; border-radius: 12px; overflow: hidden;">
                <div style="text-align: center; padding: 20px; background-color: #1e1e1e;">
                    <img src="{URL_LOGO}" alt="Wake Up Bikes" style="width: 120px;">
                </div>
                <div style="background-color: #e63946; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff;">Reserva Cancelada</h1>
                </div>
                
                <div style="padding: 30px;">
                    <p style="font-size: 18px;">Hola <strong>{nombre_usuario}</strong>,</p>
                    
                    <p style="line-height: 1.6; color: #dddddd;">
                        Te confirmamos que tu reserva para el evento <strong style="color: #ffffff;">{evento}</strong> ha sido cancelada exitosamente.
                    </p>

                    <div style="background-color: #2a2a2a; border-left: 4px solid #e63946; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; color: #ffffff;">Tu lugar ha sido liberado para otros participantes.</p>
                    </div>

                    <p style="color: #cccccc; font-size: 14px;">
                        Si no realizaste esta acción o fue un error, podés volver a inscribirte desde nuestro calendario de eventos siempre que haya cupos disponibles.
                    </p>
                </div>

                <div style="background-color: #181818; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #333;">
                    <p>© 2026 Wake Up Bikes - La Chacha Cicloturismo</p>
                </div>
            </div>
        </body>
    </html>
    """
    msg.add_alternative(html_content, subtype='html')

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(REMITENTE, PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"⚠️ Error al enviar mail de cancelación: {e}")
        return False

def enviar_correo_nuevo_evento(email_destino: str, nombre_evento: str, fecha_evento: str, id_evento: int, fecha_url: str):
    REMITENTE = os.getenv("MAIL_REMITENTE")
    PASSWORD = os.getenv("MAIL_PASSWORD")

    msg = EmailMessage()
    msg['Subject'] = f'🚲 ¡Nueva Salida Publicada: {nombre_evento}!'
    msg['From'] = f'Wake Up Bikes <{REMITENTE}>'
    msg['To'] = email_destino

    url_baja = f"{API_URL}/suscripcion/baja?email={email_destino}"
    url_evento = f"{API_URL}/calendario?fecha={fecha_url}&evento_id={id_evento}"

    html_content = f"""
    <html>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #121212; color: #ffffff;">
            <div style="max-width: 600px; margin: 20px auto; background-color: #1e1e1e; border: 1px solid #333; border-radius: 12px; overflow: hidden;">
                <div style="text-align: center; padding: 20px; background-color: #1e1e1e;">
                    <img src="{URL_LOGO}" alt="Wake Up Bikes" style="width: 140px;">
                </div>
                <div style="background-color: #ff6b35; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; color: #121212;">¡Nueva Ruta Disponible!</h1>
                </div>
                <div style="padding: 30px; text-align: center;">
                    <p style="font-size: 18px;">¡Hola ciclista! Hay una nueva aventura esperándote.</p>
                    
                    <div style="background-color: #2a2a2a; border-radius: 8px; padding: 25px; margin: 20px 0; border: 1px solid #444;">
                        <h2 style="color: #ff6b35; margin: 0;">{nombre_evento}</h2>
                        <p style="font-size: 16px; color: #ffffff;">📅 Fecha: {fecha_evento}</p>
                        <br>
                        <a href="{url_evento}" style="background-color: #ff6b35; color: #121212; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Ver detalles e Inscribirme</a>
                    </div>

                    <p style="color: #cccccc; font-size: 14px;">Recordá que los cupos son limitados. ¡No te quedes afuera!</p>
                </div>
                <div style="background-color: #181818; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #333;">
                    <p>© 2026 Wake Up Bikes - La Chacha Cicloturismo</p>
                    <p><a href="{url_baja}" style="color: #666; text-decoration: none;">Dejar de recibir estas novedades</a></p>
                </div>
            </div>
        </body>
    </html>
    """
    msg.add_alternative(html_content, subtype='html')

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(REMITENTE, PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"⚠️ Error al enviar mail de novedad: {e}")
        return False
    

def enviar_correo_modificacion_evento(email_destino: str, nombre_evento: str, id_evento: int, fecha_url: str):
    REMITENTE = os.getenv("MAIL_REMITENTE")
    PASSWORD = os.getenv("MAIL_PASSWORD")

    msg = EmailMessage()
    msg['Subject'] = f'📝 Cambio en tu evento: {nombre_evento}'
    msg['From'] = f'Wake Up Bikes <{REMITENTE}>'
    msg['To'] = email_destino

    url_evento = f"{API_URL}/calendario?fecha={fecha_url}&evento_id={id_evento}"
    
    html_content = f"""
    <html>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #121212; color: #ffffff;">
            <div style="max-width: 600px; margin: 20px auto; background-color: #1e1e1e; border: 1px solid #333; border-radius: 12px; overflow: hidden;">
                <div style="text-align: center; padding: 20px; background-color: #1e1e1e;">
                    <img src="{URL_LOGO}" alt="Wake Up Bikes" style="width: 120px;">
                </div>
                <div style="background-color: #ff6b35; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; color: #121212;">Actualización de Evento</h1>
                </div>
                <div style="padding: 30px;">
                    <p style="font-size: 18px;">Hola ciclista,</p>
                    <p style="line-height: 1.6; color: #dddddd;">
                        Te informamos que se han realizado cambios en los detalles del evento <strong>{nombre_evento}</strong> en el que estás inscripto.
                    </p>
                    <div style="background-color: #2a2a2a; border-left: 4px solid #ff6b35; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; color: #ffffff;">Por favor, revisá la nueva información (horarios, ubicación o costos) para estar al tanto.</p>
                    </div>
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="{url_evento}" style="background-color: #ff6b35; color: #121212; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Ver Cambios en el Calendario</a>
                    </div>
                </div>
                <div style="background-color: #181818; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #333;">
                    <p>© 2026 Wake Up Bikes - La Chacha Cicloturismo</p>
                </div>
            </div>
        </body>
    </html>
    """
    msg.add_alternative(html_content, subtype='html')

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(REMITENTE, PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"⚠️ Error al enviar mail de modificación: {e}")
        return False
    
 
def enviar_correo_cancelacion_evento(email_destino: str, nombre_evento: str, motivo: str):
    REMITENTE = os.getenv("MAIL_REMITENTE")
    PASSWORD = os.getenv("MAIL_PASSWORD")

    msg = EmailMessage()
    msg['Subject'] = f'❌ EVENTO CANCELADO: {nombre_evento}'
    msg['From'] = f'Wake Up Bikes <{REMITENTE}>'
    msg['To'] = email_destino

    html_content = f"""
    <html>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #121212; color: #ffffff;">
            <div style="max-width: 600px; margin: 20px auto; background-color: #1e1e1e; border: 1px solid #333; border-radius: 12px; overflow: hidden;">
                <div style="text-align: center; padding: 20px; background-color: #1e1e1e;">
                    <img src="{URL_LOGO}" alt="Wake Up Bikes" style="width: 120px;">
                </div>
                <div style="background-color: #e63946; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff;">Evento Cancelado</h1>
                </div>
                <div style="padding: 30px;">
                    <p style="font-size: 18px;">Hola ciclista,</p>
                    <p style="line-height: 1.6; color: #dddddd;">
                        Lamentamos informarte que el evento <strong>{nombre_evento}</strong> ha sido cancelado.
                    </p>
                    <div style="background-color: #2a2a2a; border-left: 4px solid #e63946; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; color: #ffffff;"><strong>Motivo:</strong> {motivo}</p>
                    </div>
                    <p style="color: #cccccc; font-size: 14px;">
                        Si habías realizado un pago, por favor ponete en contacto con el organizador para gestionar la devolución o el crédito para otra salida.
                    </p>
                </div>
                <div style="background-color: #181818; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #333;">
                    <p>© 2026 Wake Up Bikes - La Chacha Cicloturismo</p>
                </div>
            </div>
        </body>
    </html>
    """
    msg.add_alternative(html_content, subtype='html')

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(REMITENTE, PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"⚠️ Error al enviar mail de cancelación: {e}")
        return False
    
def enviar_correo_recordatorio_pago(email_destino: str, nombre_evento: str):
    REMITENTE = os.getenv("MAIL_REMITENTE")
    PASSWORD = os.getenv("MAIL_PASSWORD")

    msg = EmailMessage()
    msg['Subject'] = f'⏰ ¡Últimas 24hs! Asegurá tu lugar en {nombre_evento}'
    msg['From'] = f'Wake Up Bikes <{REMITENTE}>'
    msg['To'] = email_destino

    html_content = f"""
    <html>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #121212; color: #ffffff;">
            <div style="max-width: 600px; margin: 20px auto; background-color: #1e1e1e; border: 1px solid #333; border-radius: 12px; overflow: hidden;">
                <div style="text-align: center; padding: 20px; background-color: #1e1e1e;">
                    <img src="{URL_LOGO}" alt="Wake Up Bikes" style="width: 120px;">
                </div>
                <div style="background-color: #f4a261; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; color: #121212;">Recordatorio de Pago</h1>
                </div>
                <div style="padding: 30px;">
                    <p style="font-size: 18px;">¡Hola! Falta muy poco...</p>
                    <p style="line-height: 1.6; color: #dddddd;">
                        Te recordamos que tu reserva para <strong>{nombre_evento}</strong> vence en menos de 24 horas. 
                        Para que no pierdas tu cupo, por favor realizá el pago y cargá el comprobante en la plataforma.
                    </p>
                    <div style="text-align: center; margin-top: 30px;">
                        <a href={API_URL}/mis-reservas" style="background-color: #f4a261; color: #121212; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Subir Comprobante</a>
                    </div>
                </div>
            </div>
        </body>
    </html>
    """
    msg.add_alternative(html_content, subtype='html')

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(REMITENTE, PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"⚠️ Error recordatorio: {e}")
        return False

def enviar_correo_pago_confirmado(email_destino: str, evento: str):
    REMITENTE = os.getenv("MAIL_REMITENTE")
    PASSWORD = os.getenv("MAIL_PASSWORD")

    msg = EmailMessage()
    msg['Subject'] = f'✅ Pago Confirmado: {evento}'
    msg['From'] = f'Wake Up Bikes <{REMITENTE}>'
    msg['To'] = email_destino

    html_content = f"""
    <html>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #121212; color: #ffffff;">
            <div style="max-width: 600px; margin: 20px auto; background-color: #1e1e1e; border: 1px solid #333; border-radius: 12px; overflow: hidden;">
                <div style="text-align: center; padding: 20px; background-color: #1e1e1e;">
                    <img src="{URL_LOGO}" alt="Wake Up Bikes" style="width: 120px;">
                </div>
                <div style="background-color: #4CAF50; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff;">¡Pago Acreditado!</h1>
                </div>
                <div style="padding: 30px; text-align: center;">
                    <p style="font-size: 18px;">¡Todo listo!</p>
                    <p style="line-height: 1.6; color: #dddddd;">
                        Confirmamos que recibimos el pago para el evento <strong>{evento}</strong>. 
                        Ya tenés tu lugar asegurado. ¡Nos vemos en la ruta!
                    </p>
                </div>
                <div style="background-color: #181818; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #333;">
                    <p>© 2026 Wake Up Bikes - La Chacha Cicloturismo</p>
                </div>
            </div>
        </body>
    </html>
    """
    msg.add_alternative(html_content, subtype='html')

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(REMITENTE, PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"⚠️ Error pago confirmado: {e}")
        return False