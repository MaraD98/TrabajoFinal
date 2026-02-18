from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func 
from app.db.database import get_db
from app.models.auth_models import Usuario
from app.models.suscripcion_models import SuscripcionNovedades
from fastapi.responses import HTMLResponse

router = APIRouter(prefix="/suscripcion", tags=["Suscripciones"])

# ==========================================
# FUNCIÓN DE ALTA (SUSCRIBIRSE)
# ==========================================
@router.get("/alta")
def alta_suscripcion(email: str = Query(...), db: Session = Depends(get_db)):
    # Buscamos ignorando mayúsculas y quitando espacios
    usuario = db.query(Usuario).filter(func.lower(Usuario.email) == email.strip().lower()).first()
    
    if not usuario:
        return HTMLResponse(content=f"<html><body style='background:#121212; color:white; text-align:center; padding-top:50px;'><h1>Error: Usuario no encontrado</h1><p>No existe el mail: {email}</p></body></html>", status_code=404)

    # Buscamos si ya tiene registro en la tabla de SuscripcionNovedades
    suscripcion = db.query(SuscripcionNovedades).filter(
        SuscripcionNovedades.id_usuario == usuario.id_usuario,
        SuscripcionNovedades.id_evento == None
    ).first()

    if suscripcion:
        suscripcion.id_estado_suscripcion = 1  # 'Activa'
    else:
        nueva = SuscripcionNovedades(
            id_usuario=usuario.id_usuario,
            id_estado_suscripcion=1,
            id_evento=None
        )
        db.add(nueva)
    
    db.commit()

    return HTMLResponse(content=f"""
    <html>
        <body style="background-color: #121212; color: white; font-family: sans-serif; text-align: center; padding-top: 100px;">
            <div style="border: 2px solid #ff6b35; display: inline-block; padding: 40px; border-radius: 15px;">
                <h1 style="color: #ff6b35; font-size: 40px;">¡Suscripción Activada! 🚲</h1>
                <p style="font-size: 18px;">Hola {usuario.nombre_y_apellido}, ya estás en la lista.</p>
                <p>Te avisaremos cada vez que publiquemos una nueva ruta.</p>
                <br>
                <a href="http://localhost:5173" style="background-color: #ff6b35; color: #121212; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Volver a Wake Up Bikes</a>
            </div>
        </body>
    </html>
    """, status_code=200)

# ==========================================
# FUNCIÓN DE BAJA (DESUSCRIBIRSE)
# ==========================================
@router.get("/baja")
def baja_suscripcion(email: str = Query(...), db: Session = Depends(get_db)):
    # Buscamos ignorando mayúsculas
    usuario = db.query(Usuario).filter(func.lower(Usuario.email) == email.strip().lower()).first()
    
    if not usuario:
        return HTMLResponse(content="<html><body><h1>Error: Usuario no encontrado</h1></body></html>", status_code=404)

    # AQUÍ USAMOS SuscripcionNovedades, NO ReservaEvento
    suscripcion = db.query(SuscripcionNovedades).filter(
        SuscripcionNovedades.id_usuario == usuario.id_usuario,
        SuscripcionNovedades.id_evento == None
    ).first()

    if suscripcion:
        suscripcion.id_estado_suscripcion = 3  # 'Cancelada'
        db.commit()

    return HTMLResponse(content="""
    <html>
        <body style="background-color: #121212; color: white; font-family: sans-serif; text-align: center; padding-top: 100px;">
            <h1 style="color: #666;">Suscripción Cancelada</h1>
            <p>Ya no recibirás correos de novedades.</p>
            <br>
            <a href="http://localhost:5173" style="color: #ff6b35;">Volver a Wake Up Bikes</a>
        </body>
    </html>
    """, status_code=200)