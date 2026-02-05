import os
import shutil
from uuid import uuid4
from datetime import date

from sqlalchemy.orm import Session
from fastapi import HTTPException, status, UploadFile
from typing import List

from app.db.crud import registro_crud
from app.schemas.registro_schema import EventoCreate, EventoResponse
from app.models.eliminacion_models import EliminacionEvento


# ============================================================================
# CONFIGURACIÓN
# ============================================================================

UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


class EventoService:
    """
    Servicio para gestionar operaciones de eventos (CRUD).
    
    MODIFICADO: Agrega información de solicitudes de baja pendientes
    """
    
    # ========================================================================
    # CREAR EVENTO
    # ========================================================================
    
    @staticmethod
    def crear_nuevo_evento(db: Session, evento_in: EventoCreate, usuario_actual) -> EventoResponse:
        """Crea un nuevo evento validando permisos y duplicados."""
        # 1. VALIDACIÓN DE PERMISOS
        if usuario_actual.id_rol in [3, 4]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tu perfil no tiene permisos para crear eventos."
            )

        # 2. VALIDACIÓN DE DUPLICADOS
        evento_existente = registro_crud.get_evento_por_nombre_y_fecha(
            db, 
            nombre=evento_in.nombre_evento, 
            fecha=evento_in.fecha_evento
        )
        if evento_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un evento llamado '{evento_in.nombre_evento}' para esa fecha."
            )

        # 3. CALCULAR EL ESTADO
        if usuario_actual.id_rol in [1, 2]:
            estado_calculado = 3  # Publicado
        else:
            estado_calculado = 1  # Borrador
        
        # 4. GUARDAR
        nuevo_evento = registro_crud.create_evento(
            db=db, 
            evento=evento_in, 
            user_id=usuario_actual.id_usuario,
            id_estado_final=estado_calculado 
        )
        
        return nuevo_evento
    
    # ========================================================================
    # LISTAR EVENTOS (CON FLAG DE SOLICITUD PENDIENTE)
    # ========================================================================
    
    @staticmethod
    def listar_eventos_por_usuario(
        db: Session, 
        id_usuario: int, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[dict]:
        """
        Lista todos los eventos de un usuario específico.
        
        ✅ NUEVO: Agrega campo 'tiene_solicitud_pendiente' a cada evento
        """
        eventos = registro_crud.get_eventos_por_usuario(
            db=db, 
            id_usuario=id_usuario, 
            skip=skip, 
            limit=limit
        )
        
        # Agregar flag de solicitud pendiente
        eventos_con_flag = []
        for evento in eventos:
            # Verificar si tiene solicitud pendiente
            solicitud = db.query(EliminacionEvento).filter(
                EliminacionEvento.id_evento == evento.id_evento,
                EliminacionEvento.notificacion_enviada == False
            ).first()
            
            evento_dict = {
                **evento.__dict__,
                'tiene_solicitud_pendiente': solicitud is not None,
                'motivo_solicitud': solicitud.motivo_eliminacion if solicitud else None
            }
            eventos_con_flag.append(evento_dict)
        
        return eventos_con_flag

    @staticmethod
    def listar_todos_los_eventos(db: Session, skip: int = 0, limit: int = 100) -> List[EventoResponse]:
        """Lista todos los eventos públicos (publicados y futuros)"""
        return registro_crud.get_eventos(db=db, skip=skip, limit=limit)

    @staticmethod
    def obtener_evento_por_id(db: Session, evento_id: int) -> EventoResponse:
        """Obtiene un evento por su ID"""
        evento = registro_crud.get_evento_by_id(db=db, evento_id=evento_id)
        if not evento:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No se encontró el evento con ID {evento_id}"
            )
        return evento

    # ========================================================================
    # ACTUALIZAR EVENTO
    # ========================================================================
    
    @staticmethod
    def actualizar_evento(db: Session, evento_id: int, evento_in: EventoCreate) -> EventoResponse:
        """Actualiza un evento existente"""
        EventoService.obtener_evento_por_id(db, evento_id)  # Valida existencia
        return registro_crud.update_evento(db=db, evento_id=evento_id, evento_data=evento_in)

    # ========================================================================
    # MULTIMEDIA
    # ========================================================================
    
    @staticmethod
    def agregar_detalles_multimedia(
        db: Session,
        id_evento: int,
        lista_archivos: List[UploadFile] = None, 
        url_externa: str = None
    ):
        """Agrega multimedia (imágenes o URLs) a un evento."""
        # 1. Validar que el evento exista
        evento = registro_crud.get_evento_by_id(db, id_evento)
        if not evento:
            raise HTTPException(status_code=404, detail="El evento no existe.")

        resultados = []

        # 2. PROCESAR URL EXTERNA (Si existe)
        if url_externa:
            link_entry = registro_crud.create_multimedia(
                db=db,
                id_evento=id_evento,
                url=url_externa,
                tipo="ENLACE"
            )
            resultados.append(link_entry)

        # 3. PROCESAR LISTA DE IMÁGENES (Si existen)
        if lista_archivos:
            for archivo in lista_archivos:
                # Validar formato de CADA archivo
                if archivo.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"El archivo {archivo.filename} no es una imagen válida (JPG/PNG)."
                    )
                
                # Generar nombre único
                extension = archivo.filename.split(".")[-1]
                nombre_archivo = f"{uuid4()}.{extension}"
                ruta_relativa = f"static/uploads/{nombre_archivo}"
                ruta_fisica = f"{UPLOAD_DIR}/{nombre_archivo}"
                
                # Guardar archivo físico en disco
                try:
                    with open(ruta_fisica, "wb") as buffer:
                        shutil.copyfileobj(archivo.file, buffer)
                except Exception as e:
                    raise HTTPException(
                        status_code=500, 
                        detail=f"Error guardando imagen: {str(e)}"
                    )

                # Guardar referencia en Base de Datos
                imagen_entry = registro_crud.create_multimedia(
                    db=db,
                    id_evento=id_evento,
                    url=ruta_relativa,
                    tipo="IMAGEN" 
                )
                resultados.append(imagen_entry)

        return resultados if resultados else {"mensaje": "No se enviaron datos nuevos"}