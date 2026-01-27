from fastapi import APIRouter, Depends, status, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List
from fastapi import File, Form, UploadFile

# Bases de datos y Seguridad
from app.db.database import get_db
from app.db.crud import registro_crud  # <--- MANTENEMOS ESTO PARA QUE TU LOGICA DE CANCELACION NO SE ROMPA
from app.core.security import security
from app.services.auth_services import AuthService

# TUS Importaciones (Schemas y Services)
from app.schemas.registro_schema import EventoCreate, EventoResponse, EventoCancelacionRequest
from app.services.registro_services import EventoService

# Definimos el router con prefijo y tags
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
    description="Requiere estar logueado. Valida que no exista un evento con el mismo nombre y fecha."
)
def create_evento(
    evento: EventoCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return EventoService.crear_nuevo_evento(db=db, evento_in=evento, usuario_actual=current_user)

# ============ Listar Mis Eventos (GET) ============
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

# ============ Multimedia (HU 1.3) ============
@router.post(
    "/{evento_id}/multimedia",
    summary="Multimedia: Agregar múltiples imágenes o links",
    description="Permite subir una lista de imágenes y/o un link externo."
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

    # UNICO CAMBIO: Mapeamos 'archivos_imagenes' a 'lista_archivos' 
    # para que el Servicio lo entienda. Nada más.
    return EventoService.agregar_detalles_multimedia(
        db=db,
        id_evento=evento_id,
        lista_archivos=archivos_imagenes, 
        url_externa=url_multimedia
    )
    
# ============ CANCELAR / ELIMINAR EVENTO (ORIGINAL) ============
# Mantenemos TU lógica original llamando al CRUD directamente.
# Esto no toca nada de notificaciones ni nada nuevo.
@router.patch("/{evento_id}/cancelar", summary="Cancelar o Solicitar Baja de evento")
def cancelar_evento(
    evento_id: int, 
    request_body: EventoCancelacionRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    evento = registro_crud.get_evento_by_id(db, evento_id)
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    
    es_admin = current_user.id_rol in [1, 2] 
    es_duenio = evento.id_usuario == current_user.id_usuario

    if not es_duenio and not es_admin:
        raise HTTPException(status_code=403, detail="No tienes permisos para gestionar este evento")

    motivo = request_body.motivo

    if es_admin:
        # Llama a TU crud original
        return registro_crud.cancelar_evento(db, evento_id, motivo)
    
    if es_duenio:
        # Llama a TU crud original
        return registro_crud.solicitar_baja_evento(db, evento_id, motivo)


@router.patch("/{evento_id}/solicitar-eliminacion", summary="Solicitar baja explícita")
def solicitar_eliminacion(
    evento_id: int, 
    request_body: EventoCancelacionRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    evento = registro_crud.get_evento_by_id(db, evento_id)
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    if evento.id_usuario != current_user.id_usuario:
        raise HTTPException(status_code=403, detail="No puedes solicitar baja de un evento ajeno")

    # Llama a TU crud original
    return registro_crud.solicitar_baja_evento(db, evento_id, request_body.motivo)