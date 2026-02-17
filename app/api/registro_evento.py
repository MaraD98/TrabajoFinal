from fastapi import APIRouter, Depends, status, HTTPException, File, Form, UploadFile
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.db.database import get_db
from app.db.crud import registro_crud  # <--- MANTENEMOS ESTO PARA QUE TU LOGICA DE CANCELACION NO SE ROMPA
from app.core.security import security
from app.services.auth_services import AuthService
from app.schemas.registro_schema import EventoCancelacionRequest, EventoCreate, EventoResponse
from app.services.registro_services import EventoService


router = APIRouter(prefix="/eventos", tags=["Eventos"])


# ============================================================================
# DEPENDENCIAS
# ============================================================================

def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Obtiene el usuario actual desde el token JWT"""
    return AuthService.get_current_usuario_from_token(db, credentials.credentials)


# ============================================================================
# ENDPOINTS - CREAR EVENTO
# ============================================================================

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
    """Crea un nuevo evento (solo usuarios logueados)"""
    return EventoService.crear_nuevo_evento(db=db, evento_in=evento, usuario_actual=current_user)


# ============================================================================
# ENDPOINTS - LISTAR EVENTOS
# ============================================================================

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
    """Lista los eventos del usuario logueado"""
    return EventoService.listar_eventos_por_usuario(
        db=db,
        id_usuario=current_user.id_usuario,
        skip=skip,
        limit=limit
    )


@router.get(
    "/buscar",
    summary="Búsqueda avanzada de eventos (HU 7.1-7.10)",
    description="Filtrar eventos por fecha, ubicación, tipo, dificultad y búsqueda de texto"
)
def buscar_eventos_con_filtros(
    busqueda: Optional[str] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    fecha_exacta: Optional[date] = None,
    ubicacion: Optional[str] = None,
    id_tipo: Optional[int] = None,
    id_dificultad: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Búsqueda avanzada de eventos con filtros opcionales.
    
    Todos los parámetros son opcionales y se pueden combinar.
    """
    # Validaciones
    if limit > 100:
        raise HTTPException(status_code=400, detail="Límite máximo: 100")
    
    if fecha_desde and fecha_hasta and fecha_desde > fecha_hasta:
        raise HTTPException(status_code=400, detail="Fecha inicial debe ser anterior a fecha final")
    
    # Llamar al CRUD
    resultado = registro_crud.filtrar_eventos_avanzado(
        db=db,
        busqueda=busqueda,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        fecha_exacta=fecha_exacta,
        ubicacion=ubicacion,
        id_tipo=id_tipo,
        id_dificultad=id_dificultad,
        skip=skip,
        limit=limit
    )
    
    # Convertir eventos a dict
    eventos_lista = []
    for evento in resultado["eventos"]:
        evento_dict = {
            "id_evento": evento.id_evento,
            "nombre_evento": evento.nombre_evento,
            "ubicacion": evento.ubicacion,
            "fecha_evento": str(evento.fecha_evento),
            "descripcion": evento.descripcion or "",
            "costo_participacion": float(evento.costo_participacion) if evento.costo_participacion else 0.0,
            "id_tipo": evento.id_tipo,
            "id_dificultad": evento.id_dificultad,
            "id_estado": evento.id_estado,
            "id_usuario": evento.id_usuario
        }
        eventos_lista.append(evento_dict)
    
    # Respuesta final
    return {
        "total": resultado["total"],
        "eventos": eventos_lista,
        "skip": resultado["skip"],
        "limit": resultado["limit"],
        "filtros_aplicados": resultado["filtros_aplicados"],
        "mensaje": resultado["mensaje"]
    }


@router.get("/catalogos/filtros", summary="Obtener catálogos para filtros")
def obtener_catalogos_para_filtros(db: Session = Depends(get_db)):
    """Devuelve tipos de evento y niveles de dificultad para poblar filtros"""
    return registro_crud.obtener_catalogos_filtros(db)


@router.get(
    "/", 
    response_model=List[EventoResponse],
    summary="Listar todos los eventos públicos"
)
def read_eventos(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """Lista todos los eventos publicados y futuros (público)"""
    return EventoService.listar_todos_los_eventos(db, skip=skip, limit=limit)


@router.get(
    "/{evento_id}", 
    response_model=EventoResponse,
    summary="Obtener detalle de un evento"
)
def read_one_evento(evento_id: int, db: Session = Depends(get_db)):
    """Obtiene un evento específico por su ID"""
    return EventoService.obtener_evento_por_id(db, evento_id)


# ============================================================================
# ENDPOINTS - MULTIMEDIA
# ============================================================================

@router.post(
    "/{evento_id}/multimedia",
    summary="Agregar imágenes o enlaces multimedia a un evento",
    description="Permite subir múltiples imágenes y/o un link externo (ej: YouTube)"
)
def agregar_multimedia_evento(
    evento_id: int,
    archivos_imagenes: List[UploadFile] = File(None), 
    url_multimedia: str = Form(None),       
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Agrega multimedia (imágenes o URLs) a un evento"""
    # Validar que mande al menos algo
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
# @router.patch("/{evento_id}/cancelar", summary="Cancelar o Solicitar Baja de evento")
# def cancelar_evento(
#     evento_id: int, 
#     request_body: EventoCancelacionRequest,
#     db: Session = Depends(get_db),
#     current_user = Depends(get_current_user)
# ):
#     evento = registro_crud.get_evento_by_id(db, evento_id)
#     if not evento:
#         raise HTTPException(status_code=404, detail="Evento no encontrado")
    
#     es_admin = current_user.id_rol in [1, 2] 
#     es_duenio = evento.id_usuario == current_user.id_usuario

#     if not es_duenio and not es_admin:
#         raise HTTPException(status_code=403, detail="No tienes permisos para gestionar este evento")

#     motivo = request_body.motivo

#     if es_admin:
#         # Llama a TU crud original
#         return registro_crud.cancelar_evento(db, evento_id, motivo)
    
#     if es_duenio:
#         # Llama a TU crud original
#         return registro_crud.solicitar_baja_evento(db, evento_id, motivo)


# @router.patch("/{evento_id}/solicitar-eliminacion", summary="Solicitar baja explícita")
# def solicitar_eliminacion(
#     evento_id: int, 
#     request_body: EventoCancelacionRequest,
#     db: Session = Depends(get_db),
#     current_user = Depends(get_current_user)
# ):
#     evento = registro_crud.get_evento_by_id(db, evento_id)
#     if not evento:
#         raise HTTPException(status_code=404, detail="Evento no encontrado")

#     if evento.id_usuario != current_user.id_usuario:
#         raise HTTPException(status_code=403, detail="No puedes solicitar baja de un evento ajeno")

#     # Llama a TU crud original
#     return registro_crud.solicitar_baja_evento(db, evento_id, request_body.motivo)
