from fastapi import APIRouter, Depends, status, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List
from fastapi import File, Form, UploadFile

# Bases de datos y Seguridad
from app.db.database import get_db
from app.core.security import security
from app.services.auth_services import AuthService

# TUS Importaciones (Schemas y Services)
from app.schemas.registro_schema import EventoCreate, EventoResponse
from app.services.registro_services import EventoService

# Definimos el router con prefijo y tags (igual que auth.py)
router = APIRouter(prefix="/eventos", tags=["Eventos"])

# --- DEPENDENCIA DE SEGURIDAD (El Portero) ---
def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    # Esto verifica que el token sea válido usando el servicio de tu compañera
    return AuthService.get_current_usuario_from_token(db, credentials.credentials)

# ============ Crear Evento (POST) ============
@router.post(
    "/", 
    response_model=EventoResponse, 
    status_code=status.HTTP_201_CREATED,
    summary="Crear un nuevo evento",
    description="Requiere estar logueado. Valida que no exista un evento con el mismo nombre y fecha."
)
def create_evento(
    evento: EventoCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) # <--- Solo usuarios logueados entran
):
    # Aquí llamamos a TU servicio PRO que tiene las validaciones
    return EventoService.crear_nuevo_evento(db=db, evento_in=evento,usuario_actual=current_user)

# ============ Listar Eventos (GET) ============
@router.get(
    "/", 
    response_model=List[EventoResponse],
    summary="Listar todos los eventos"
)
def read_eventos(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
    # Nota: Si quisieras que listar sea público, quitas el 'Depends(get_current_user)'
    # Si quieres que sea privado, agrégalo aquí también.
):
    return EventoService.listar_todos_los_eventos(db, skip=skip, limit=limit)

# ============ Obtener un Evento (GET ID) ============
@router.get(
    "/{evento_id}", 
    response_model=EventoResponse,
    summary="Obtener detalle de un evento"
)
def read_one_evento(evento_id: int, db: Session = Depends(get_db)):
    return EventoService.obtener_evento_por_id(db, evento_id)

# ============ Actualizar Evento (PUT) ============
""" @router.put(
    "/{evento_id}", 
    response_model=EventoResponse,
    summary="Actualizar un evento existente"
)
def update_evento(
    evento_id: int, 
    evento: EventoCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) # <--- Protegido
):
    return EventoService.actualizar_evento(db, evento_id, evento) """
    
    # --- TU ENDPOINT NUEVO (HU 1.3 y 1.4) ---
@router.post(
    "/{evento_id}/multimedia",
    summary="Multimedia: Agregar imagen y redes sociales",
    description="Sube una imagen y/o link de redes sociales al evento creado."
)
def agregar_multimedia_evento(
    evento_id: int,
    redes_sociales: str = Form(None), # Opcional
    archivo_imagen: UploadFile = File(None), # Opcional
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return EventoService.agregar_detalles_multimedia(
        db=db,
        id_evento=evento_id,
        redes_sociales=redes_sociales,
        archivo=archivo_imagen
    )