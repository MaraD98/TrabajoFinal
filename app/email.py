import os
from dotenv import load_dotenv
from email.message import EmailMessage
# Reemplazamos smtplib y socket por la librería de SendGrid
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

load_dotenv()

# --- CONFIGURACIÓN GLOBAL ---
REMITENTE = os.getenv("MAIL_REMITENTE")
# Usamos la API KEY en lugar del PASSWORD de Gmail
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
API_URL = os.getenv("BACKEND_URL")
URL_LOGO = os.getenv("URL_LOGO")

def enviar_correo_reserva(email_destino: str, nombre_usuario: str, evento: str, fecha: str, precio: float = 0):
    msg = EmailMessage()
    
    # Ajustamos el asunto según sea pago o gratis
    es_pago = precio > 0
    asunto = f'🚲 Reserva Recibida: {evento}' if es_pago else f'🚲 Inscripción Exitosa: {evento}'
    
    msg['Subject'] = asunto
    msg['From'] = f'Wake Up Bikes <{REMITENTE}>'
    msg['To'] = email_destino

    url_alta = f"{API_URL}/suscripcion/alta?email={email_destino}"
    url_baja = f"{API_URL}/suscripcion/baja?email={email_destino}"

    # --- Lógica del Banner y Cuadro de Acción ---
    if es_pago:
        banner_color = "#ff6b35"  # Naranja
        banner_titulo = "¡Reserva Recibida!"
        bloque_accion = f"""
            <div style="background-color: #3d2b1f; border: 2px dashed #ff6b35; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                <h2 style="color: #ff6b35; margin: 0 0 10px 0;">⚠️ ACCIÓN REQUERIDA</h2>
                <p style="font-size: 16px; margin: 0; line-height: 1.5;">
                    Para asegurar tu lugar, recordá que tenés un plazo de <br>
                    <span style="font-size: 26px; font-weight: bold; color: #ffffff;">72 HORAS</span><br>
                    para realizar el pago. De lo contrario, la reserva expirará automáticamente.
                </p>
            </div>
        """
    else:
        banner_color = "#28a745"  # Verde
        banner_titulo = "¡Inscripción Exitosa!"
        bloque_accion = f"""
            <div style="background-color: #1e2b1e; border: 2px solid #28a745; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                <h2 style="color: #28a745; margin: 0 0 10px 0;">✅ LUGAR ASEGURADO</h2>
                <p style="font-size: 16px; margin: 0; line-height: 1.5;">
                    ¡Buenas noticias! Al ser un evento gratuito, <br>
                    <strong>tu lugar ya está confirmado</strong>.<br>
                    No necesitás realizar ningún pago ni acción adicional.
                </p>
            </div>
        """

    html_content = f"""
    <html>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #121212; color: #ffffff;">
            <div style="max-width: 600px; margin: 20px auto; background-color: #1e1e1e; border: 1px solid #333; border-radius: 12px; overflow: hidden;">
                <div style="text-align: center; padding: 20px; background-color: #1e1e1e; border-bottom: 1px solid #333;">
                    <img src="{URL_LOGO}" alt="Wake Up Bikes" style="width: 140px;">
                </div>
                <div style="background-color: {banner_color}; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; color: #121212;">{banner_titulo}</h1>
                </div>
                <div style="padding: 30px;">
                    <p style="font-size: 18px;">Hola <strong>{nombre_usuario}</strong>,</p>
                    
                    {bloque_accion}

                    <p style="color: #cccccc;">Detalles de tu salida:</p>
                    <div style="background-color: #2a2a2a; border-left: 4px solid {banner_color}; padding: 15px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Evento:</strong> {evento}</p>
                        <p style="margin: 5px 0;"><strong>Fecha:</strong> {fecha}</p>
                    </div>
                </div>
                <div style="background-color: #181818; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #333;">
                    <p>© 2026 Wake Up Bikes </p>
                    <p>
                        <a href="{url_alta}" style="color: {banner_color}; text-decoration: none;">Suscribirme a novedades</a> 
                        | 
                        <a href="{url_baja}" style="color: #666; text-decoration: none;">Darme de baja</a>
                    </p>
                </div>
            </div>
        </body>
    </html>
    """
    msg.add_alternative(html_content, subtype='html')
    return _ejecutar_envio(msg)
def enviar_correo_cancelacion_reserva(email_destino: str, nombre_usuario: str, evento: str):
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
                    <p>© 2026 Wake Up Bikes </p>
                </div>
            </div>
        </body>
    </html>
    """
    msg.add_alternative(html_content, subtype='html')
    return _ejecutar_envio(msg)

def enviar_correo_nuevo_evento(email_destino: str, nombre_evento: str, fecha_evento: str, id_evento: int, fecha_url: str):
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
                    <p>© 2026 Wake Up Bikes </p>
                    <p><a href="{url_baja}" style="color: #666; text-decoration: none;">Dejar de recibir estas novedades</a></p>
                </div>
            </div>
        </body>
    </html>
    """
    msg.add_alternative(html_content, subtype='html')
    return _ejecutar_envio(msg)

def enviar_correo_modificacion_evento(email_destino: str, nombre_evento: str, id_evento: int, fecha_url: str):
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
                    <p>© 2026 Wake Up Bikes </p>
                </div>
            </div>
        </body>
    </html>
    """
    msg.add_alternative(html_content, subtype='html')
    return _ejecutar_envio(msg)

def enviar_correo_cancelacion_evento(email_destino: str, nombre_evento: str, motivo: str):
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
                    <p>© 2026 Wake Up Bikes </p>
                </div>
            </div>
        </body>
    </html>
    """
    msg.add_alternative(html_content, subtype='html')
    return _ejecutar_envio(msg)

def enviar_correo_recordatorio_pago(email_destino: str, nombre_evento: str):
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
                        <a href="{API_URL}/mis-reservas" style="background-color: #f4a261; color: #121212; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Subir Comprobante</a>
                    </div>
                </div>
            </div>
        </body>
    </html>
    """
    msg.add_alternative(html_content, subtype='html')
    return _ejecutar_envio(msg)


def enviar_correo_advertencia_organizador(email_destino: str, nombre_evento: str, porcentaje: float, dias_restantes: int):
    msg = EmailMessage()
    msg['Subject'] = f'⚠️ Atención: Riesgo de cancelación para {nombre_evento}'
    msg['From'] = f'Wake Up Bikes <{REMITENTE}>'
    msg['To'] = email_destino

    html_content = f"""
    <html>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #121212; color: #ffffff;">
            <div style="max-width: 600px; margin: 20px auto; background-color: #1e1e1e; border: 1px solid #333; border-radius: 12px; overflow: hidden;">
                <div style="text-align: center; padding: 20px; background-color: #1e1e1e; border-bottom: 1px solid #333;">
                    <img src="{URL_LOGO}" alt="Wake Up Bikes" style="width: 140px;">
                </div>
                <div style="background-color: #ffcc00; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; color: #121212;">Aviso de Baja Ocupación</h1>
                </div>
                <div style="padding: 30px;">
                    <p style="font-size: 18px;">Hola,</p>
                    
                    <p style="line-height: 1.6; color: #dddddd;">
                        Te contactamos desde el sistema porque notamos que tu evento <strong>{nombre_evento}</strong> 
                        actualmente cuenta con un <strong>{porcentaje:.1f}%</strong> de inscripciones confirmadas.
                    </p>

                    <div style="background-color: #3d3300; border: 2px dashed #ffcc00; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                        <h2 style="color: #ffcc00; margin: 0 0 10px 0;">⚠️ IMPORTANTE</h2>
                        <p style="font-size: 16px; margin: 0; line-height: 1.5; color: #ffffff;">
                            Si el evento no alcanza el mínimo del 40% de ocupación,<br>
                            se cancelará automáticamente en <br>
                            <span style="font-size: 26px; font-weight: bold; color: #ffcc00;">{dias_restantes} DÍA(S)</span>
                        </p>
                    </div>

                    <p style="color: #cccccc; font-size: 14px; text-align: center;">
                        ¡Te animamos a que invites a más personas y compartas tu evento en redes sociales 
                        para que siga en pie y sea un éxito!
                    </p>
                </div>
                <div style="background-color: #181818; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #333;">
                    <p>© 2026 Wake Up Bikes </p>
                </div>
            </div>
        </body>
    </html>
    """
    msg.add_alternative(html_content, subtype='html')
    return _ejecutar_envio(msg)

def enviar_correo_pago_confirmado(email_destino: str, nombre_usuario: str, evento: str, fecha: str): # <-- Agregamos parámetros
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
                    <p style="font-size: 18px;">¡Todo listo, {nombre_usuario}!</p> # <-- Usamos el nombre
                    <p style="line-height: 1.6; color: #dddddd;">
                        Confirmamos que recibimos el pago para el evento <strong>{evento}</strong> del día <strong>{fecha}</strong>. # <-- Usamos la fecha
                        <br><br>
                        Ya tenés tu lugar asegurado. ¡Nos vemos en la ruta!
                    </p>
                </div>
                <div style="background-color: #181818; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #333;">
                    <p>© 2026 Wake Up Bikes </p>
                </div>
            </div>
        </body>
    </html>
    """
    msg.add_alternative(html_content, subtype='html')
    return _ejecutar_envio(msg)

def enviar_correo_rechazo_edicion(email_destino: str, nombre_usuario: str, nombre_evento: str):
    msg = EmailMessage()
    msg['Subject'] = f'❌ Solicitud de Edición Rechazada: {nombre_evento}'
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
                    <h1 style="margin: 0; color: #ffffff;">Edición No Aprobada</h1>
                </div>
                <div style="padding: 30px;">
                    <p style="font-size: 18px;">Hola <strong>{nombre_usuario}</strong>,</p>
                    <p style="line-height: 1.6; color: #dddddd;">
                        Te informamos que la solicitud de edición para el evento <strong>{nombre_evento}</strong> ha sido revisada y <strong>rechazada</strong> por la administración.
                    </p>
                    <div style="background-color: #2a2a2a; border-left: 4px solid #e63946; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; color: #ffffff;">El evento permanecerá publicado con la información original.</p>
                    </div>
                    <p style="color: #cccccc; font-size: 14px;">
                        Si tenés dudas sobre el motivo del rechazo, por favor contactate con el área de supervisión.
                    </p>
                </div>
                <div style="background-color: #181818; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #333;">
                    <p>© 2026 Wake Up Bikes </p>
                </div>
            </div>
        </body>
    </html>
    """
    msg.add_alternative(html_content, subtype='html')
    return _ejecutar_envio(msg)

def enviar_correo_aprobacion_edicion(email_destino: str, nombre_usuario: str, nombre_evento: str):
    msg = EmailMessage()
    msg['Subject'] = f'✅ Cambios Aprobados: {nombre_evento}'
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
                    <h1 style="margin: 0; color: #ffffff;">¡Edición Aprobada!</h1>
                </div>
                <div style="padding: 30px;">
                    <p style="font-size: 18px;">Hola <strong>{nombre_usuario}</strong>,</p>
                    <p style="line-height: 1.6; color: #dddddd;">
                        ¡Buenas noticias! Tu solicitud de edición para el evento <strong>{nombre_evento}</strong> ha sido aprobada.
                    </p>
                    <div style="background-color: #2a2a2a; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; color: #ffffff;">Los cambios ya se encuentran visibles en el calendario de eventos.</p>
                    </div>
                </div>
                <div style="background-color: #181818; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #333;">
                    <p>© 2026 Wake Up Bikes </p>
                </div>
            </div>
        </body>
    </html>
    """
    msg.add_alternative(html_content, subtype='html')
    return _ejecutar_envio(msg)

def enviar_correo_aprobacion_publicacion(email_destino: str, nombre_usuario: str, nombre_evento: str):
    msg = EmailMessage()
    msg['Subject'] = f'🚀 ¡Evento Publicado!: {nombre_evento}'
    msg['From'] = f'Wake Up Bikes <{REMITENTE}>'
    msg['To'] = email_destino

    html_content = f"""
    <html>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #121212; color: #ffffff;">
            <div style="max-width: 600px; margin: 20px auto; background-color: #1e1e1e; border: 1px solid #333; border-radius: 12px; overflow: hidden;">
                <div style="text-align: center; padding: 20px; background-color: #1e1e1e;">
                    <img src="{URL_LOGO}" alt="Wake Up Bikes" style="width: 140px;">
                </div>
                <div style="background-color: #ff6b35; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; color: #121212;">¡Tu Evento está en línea!</h1>
                </div>
                <div style="padding: 30px; text-align: center;">
                    <p style="font-size: 18px;">Hola <strong>{nombre_usuario}</strong>,</p>
                    <p style="line-height: 1.6; color: #dddddd;">
                        ¡Excelentes noticias! La revisión de tu evento <strong>{nombre_evento}</strong> ha finalizado con éxito.
                    </p>
                    <div style="background-color: #2a2a2a; border-radius: 8px; padding: 25px; margin: 20px 0; border: 1px solid #444;">
                        <p style="font-size: 16px; color: #ffffff; margin: 0;">
                           ✅ <strong>Estado: Aprobado y Publicado</strong>
                        </p>
                        <p style="color: #cccccc; font-size: 14px; margin-top: 10px;">
                            Ya podés encontrarlo en el calendario y empezar a recibir inscripciones.
                        </p>
                    </div>
                </div>
                <div style="background-color: #181818; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #333;">
                    <p>© 2026 Wake Up Bikes </p>
                </div>
            </div>
        </body>
    </html>
    """
    msg.add_alternative(html_content, subtype='html')
    return _ejecutar_envio(msg)

# --- FUNCIÓN INTERNA DE ENVÍO ADAPTADA A SENDGRID ---
def _ejecutar_envio(msg):
    print(f"DEBUG - Intentando envío vía SendGrid API para: {msg['To']}...")

    # Extraemos el HTML del objeto EmailMessage que ya armaste
    html_body = ""
    for part in msg.iter_parts():
        if part.get_content_type() == 'text/html':
            html_body = part.get_payload(decode=True).decode()

    # Creamos el objeto Mail de SendGrid
    message = Mail(
        from_email=REMITENTE,
        to_emails=msg['To'],
        subject=msg['Subject'],
        html_content=html_body
    )

    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        
        if response.status_code in [200, 201, 202]:
            print(f"✅ ¡ENVIADO VIA API! Status: {response.status_code}")
            return True
        else:
            print(f"⚠️ Error SendGrid: Status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error en la API: {e}")
        return False
    
def enviar_correo_baja_aprobada(email_destino: str, nombre_usuario: str, nombre_evento: str):
    msg = EmailMessage()
    msg['Subject'] = f'✅ Solicitud de Baja Aprobada: {nombre_evento}'
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
                    <h1 style="margin: 0; color: #ffffff;">Baja Confirmada</h1>
                </div>
                <div style="padding: 30px;">
                    <p style="font-size: 18px;">Hola <strong>{nombre_usuario}</strong>,</p>
                    <p style="line-height: 1.6; color: #dddddd;">
                        Te informamos que tu solicitud para dar de baja el evento <strong>{nombre_evento}</strong> ha sido <strong>aprobada</strong> por la administración.
                    </p>
                    <div style="background-color: #2a2a2a; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; color: #ffffff;">El evento ha sido cancelado y ya no se encuentra visible en el calendario público.</p>
                    </div>
                    <p style="color: #cccccc; font-size: 14px;">
                        Los participantes inscriptos han sido notificados automáticamente de la cancelación.
                    </p>
                </div>
                <div style="background-color: #181818; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #333;">
                    <p>© 2026 Wake Up Bikes </p>
                </div>
            </div>
        </body>
    </html>
    """
    msg.add_alternative(html_content, subtype='html')
    return _ejecutar_envio(msg)


def enviar_correo_baja_rechazada(email_destino: str, nombre_usuario: str, nombre_evento: str):
    msg = EmailMessage()
    msg['Subject'] = f'❌ Solicitud de Baja Rechazada: {nombre_evento}'
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
                    <h1 style="margin: 0; color: #ffffff;">Solicitud de Baja Rechazada</h1>
                </div>
                <div style="padding: 30px;">
                    <p style="font-size: 18px;">Hola <strong>{nombre_usuario}</strong>,</p>
                    <p style="line-height: 1.6; color: #dddddd;">
                        Tu solicitud para cancelar el evento <strong>{nombre_evento}</strong> ha sido revisada y <strong>rechazada</strong> por el administrador.
                    </p>
                    <div style="background-color: #2a2a2a; border-left: 4px solid #e63946; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; color: #ffffff;">El evento continuará publicado y disponible para inscripciones.</p>
                    </div>
                    <p style="color: #cccccc; font-size: 14px;">
                        Si considerás que esto es un error o tenés motivos urgentes para la baja, por favor contactate directamente con soporte técnico.
                    </p>
                </div>
                <div style="background-color: #181818; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #333;">
                    <p>© 2026 Wake Up Bikes </p>
                </div>
            </div>
        </body>
    </html>
    """
    msg.add_alternative(html_content, subtype='html')
    return _ejecutar_envio(msg)