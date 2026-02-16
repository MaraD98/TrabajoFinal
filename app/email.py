import smtplib
from email.message import EmailMessage

def enviar_correo_reserva(email_destino: str, nombre_usuario: str, evento: str, fecha: str):
    REMITENTE = "wakeuptesis@gmail.com"
    PASSWORD = "uejhrllptwiomcac" 

    msg = EmailMessage()
    msg['Subject'] = f'🚲 Confirmación de Reserva: {evento}'
    msg['From'] = f'Wake Up Bikes <{REMITENTE}>'
    msg['To'] = email_destino

    # URLs para el backend (usamos localhost para pruebas)
    url_alta = f"http://localhost:8000/suscripcion/alta?email={email_destino}"
    url_baja = f"http://localhost:8000/suscripcion/baja?email={email_destino}"

    html_content = f"""
    <html>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #121212; color: #ffffff;">
            <div style="max-width: 600px; margin: 20px auto; background-color: #1e1e1e; border: 1px solid #333; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #ff6b35; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; color: #121212;">¡Reserva Confirmada!</h1>
                </div>
                <div style="padding: 30px;">
                    <p style="font-size: 18px;">Hola <strong>{nombre_usuario}</strong>,</p>
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