from fastapi import APIRouter, Depends, status, HTTPException, File, Form, UploadFile
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List

# Bases de datos y Seguridad
from app.db.database import get_db
from app.db.crud import registro_crud
from app.core.security import security
from app.services.auth_services import AuthService

# TUS Importaciones (Schemas y Services)
# NOTA: Verifica si tu archivo se llama registro_service.py o registro_services.py
from app.schemas.registro_schema import (
    EventoCreate, 
    EventoResponse, 
    EventoConCuposResponse, 
    ReservaResponseSchema,
    EventoCancelacionRequest
)
from app.services.registro_services import EventoService 
from app.services.registro_services import EventoService
#PARA MULTIMEDIA
from typing import List # <--- IMPORTANTE: No olvides importar esto
from fastapi import File, UploadFile, Form

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
    response_model=EventoConCuposResponse, # <--- CAMBIO AQUÍ
    summary="Obtener detalle de un evento con sus cupos actualizados"
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
    # reserva_in: ReservaCreate,  <-- BORRADO: Ya no pedimos body, solo ID URL y Token
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) 
):
    """
    1. Verifica cupos disponibles.
    2. Verifica que el usuario no esté ya anotado.
    3. Si es gratis -> Inscripto (2). Si es pago -> Pendiente (1).
    4. Simula envío de email.
    """
    return EventoService.registrar_reserva(
        db=db,
        id_evento=evento_id,
        id_usuario=current_user.id_usuario 
    )

# ==========================================
#  NUEVO: ENDPOINT DE SIMULACIÓN DE PAGO
# ==========================================
@router.post(
    "/reservas/{id_reserva}/pagar",
    summary="Simular Pago (Admin/Demo)",
    description="Pasa una reserva de estado Pendiente (1) a Inscripto (2)"
)
def pagar_reserva(
    id_reserva: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) # Opcional: Podrías validar que sea Admin
):
    # Aquí llamamos a la función nueva del service
    return EventoService.confirmar_pago_simulado(db, id_reserva)
    #archivo=archivos_imagenes no esta en uso sale GRIIIS?
    
    
# ============ CANCELAR / ELIMINAR EVENTO (HU 4.1 y 4.2) ============
@router.patch("/{evento_id}/cancelar", summary="Cancelar o Solicitar Baja de evento")
def cancelar_evento(
    evento_id: int, 
    request_body: EventoCancelacionRequest, # <--- CAMBIO CLAVE: Recibe JSON, no string suelto
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Lógica Inteligente:
    - Si es ADMIN: Cancela/Elimina directamente (Estado 5 o 6 según tu CRUD).
    - Si es DUEÑO: Genera una SOLICITUD DE BAJA (Estado 7).
    """
    evento = registro_crud.get_evento_by_id(db, evento_id)
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    
    es_admin = current_user.id_rol in [1, 2] # Asumiendo 1=SuperAdmin, 2=Admin
    es_duenio = evento.id_usuario == current_user.id_usuario

    if not es_duenio and not es_admin:
        raise HTTPException(status_code=403, detail="No tienes permisos para gestionar este evento")

    motivo = request_body.motivo

    # --- CAMINO A: ADMIN (Eliminación Directa) ---
    if es_admin:
        # Aquí asumo que 'cancelar_evento' en tu CRUD pone el estado definitivo (ej. 6 ELIMINADO)
        return registro_crud.cancelar_evento(db, evento_id, motivo)
    
    # --- CAMINO B: DUEÑO (Solicitud de Baja) ---
    if es_duenio:
        # Aquí forzamos que si es el dueño, se use la lógica de SOLICITUD (Estado 7)
        # Asegurate que 'solicitar_baja_evento' en tu CRUD ponga id_estado = 7
        return registro_crud.solicitar_baja_evento(db, evento_id, motivo)


# Mantenemos este endpoint por si acaso se llama explícitamente, 
# pero le arreglamos el error 422 también.
@router.patch("/{evento_id}/solicitar-eliminacion", summary="Solicitar baja explícita")
def solicitar_eliminacion(
    evento_id: int, 
    request_body: EventoCancelacionRequest, # <--- CORREGIDO AQUI TAMBIÉN
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    evento = registro_crud.get_evento_by_id(db, evento_id)
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    if evento.id_usuario != current_user.id_usuario:
        raise HTTPException(status_code=403, detail="No puedes solicitar baja de un evento ajeno")

    return registro_crud.solicitar_baja_evento(db, evento_id, request_body.motivo)
