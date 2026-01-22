from fastapi import APIRouter, Depends, status, HTTPException, File, Form, UploadFile
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List

# Bases de datos y Seguridad
from app.db.database import get_db
from app.core.security import security
from app.services.auth_services import AuthService

# TUS Importaciones (Schemas y Services)
# AGREGAMOS: EventoConCuposResponse, ReservaCreate, ReservaResponseSchema
from app.schemas.registro_schema import (
    EventoCreate, 
    EventoResponse, 
    EventoConCuposResponse, 
    ReservaCreate, 
    ReservaResponseSchema
)
from app.services.registro_services import EventoService

# Definimos el router
router = APIRouter(prefix="/eventos", tags=["Eventos"])

# --- DEPENDENCIA DE SEGURIDAD ---
def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    return AuthService.get_current_usuario_from_token(db, credentials.credentials)

# ============ Crear Evento (POST) ============
@router.post(
    "/", 
    response_model=EventoResponse, 
    status_code=status.HTTP_201_CREATED,
    summary="Crear un nuevo evento",
    description="Requiere estar logueado. Valida nombre y fecha."
)
def create_evento(
    evento: EventoCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return EventoService.crear_nuevo_evento(db=db, evento_in=evento, usuario_actual=current_user)

# ============ Listar Mis Eventos (GET - Privado) ============
@router.get(
    "/mis-eventos",
    response_model=List[EventoResponse],
    summary="Listar solo los eventos creados por el usuario actual"
)
def read_mis_eventos(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return EventoService.listar_eventos_por_usuario(
        db=db,
        id_usuario=current_user.id_usuario,
        skip=skip,
        limit=limit
    )


# ============ Listar Eventos (GET - Público con CUPOS) ============
# OJO AQUÍ: Cambiamos el response_model para devolver los cupos calculados
@router.get(
    "/", 
    response_model=List[EventoConCuposResponse], 
    summary="Listar eventos publicados con cálculo de cupos en tiempo real"
)
def read_eventos(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    # Llamamos al NUEVO servicio que hace la matemática (Total - Reservas)
    return EventoService.listar_eventos_con_cupos(db, skip=skip, limit=limit)

# ============ Obtener un Evento (GET ID) ============
@router.get(
    "/{evento_id}", 
    response_model=EventoResponse,
    summary="Obtener detalle de un evento"
)
def read_one_evento(evento_id: int, db: Session = Depends(get_db)):
    return EventoService.obtener_evento_por_id(db, evento_id)

# ============ Multimedia (POST) ============
@router.post(
    "/{evento_id}/multimedia",
    summary="Multimedia: Agregar múltiples imágenes o links"
)
def agregar_multimedia_evento(
    evento_id: int,
    archivos_imagenes: List[UploadFile] = File(None), 
    url_multimedia: str = Form(None),       
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if not archivos_imagenes and not url_multimedia:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Debes enviar al menos una imagen o una URL."
        )

    return EventoService.agregar_detalles_multimedia(
        db=db,
        id_evento=evento_id,
        lista_archivos=archivos_imagenes,
        url_externa=url_multimedia
    )

# ==========================================
#  NUEVO: ENDPOINT DE RESERVA (SPRINT 3)
# ==========================================
@router.post(
    "/{evento_id}/reservar",
    response_model=ReservaResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Reservar un cupo en el evento"
)
def reservar_cupo(
    evento_id: int,
    reserva_in: ReservaCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) 
):
    """
    1. Verifica cupos disponibles.
    2. Verifica que el usuario no esté ya anotado.
    3. Crea la reserva (Estado: Pendiente).
    4. Simula envío de email.
    """
    return EventoService.registrar_reserva(
        db=db,
        id_evento=evento_id,
        id_usuario=current_user.id_usuario, # Usamos el ID del token
        datos_reserva=reserva_in
    )