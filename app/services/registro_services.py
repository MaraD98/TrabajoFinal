import os
import shutil
from uuid import uuid4
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, UploadFile
from typing import List, Optional
from typing import List
from app.db.crud import registro_crud
from app.schemas.registro_schema import EventoCreate, EventoResponse 

# Configuración de carpeta para guardar fotos
UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
# --------------------------------------

# Ya no necesitamos importar Evento (modelo) aquí, porque eso lo maneja el CRUD

class EventoService:

    @staticmethod
    def crear_nuevo_evento(db: Session, evento_in: EventoCreate, usuario_actual) -> EventoResponse:
        
        # ---------------------------------------------------------
        # 1. VALIDACIÓN DE ROL 
        # ---------------------------------------------------------
       # 1 = Admin, 2 = Supervisor -> Publicado (3)
        # Otros -> Borrador (1)
        if usuario_actual.id_rol in [1, 2]:
            estado_calculado = 3
        else:
            estado_calculado = 1

        # ---------------------------------------------------------
        # 2. VALIDACIÓN DE DUPLICADOS 
        # ---------------------------------------------------------
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
        
        # ---------------------------------------------------------
        # 3. LLAMADA AL CRUD 
        # ---------------------------------------------------------
        # IMPORTANTE: Asumo que tu objeto usuario tiene 'id_usuario' o 'id'.
        nuevo_evento = registro_crud.create_evento(
            db=db, 
            evento=evento_in, 
            user_id=usuario_actual.id_usuario,
            id_estado=estado_calculado
        )
        
        return nuevo_evento

    @staticmethod
    def listar_todos_los_eventos(db: Session, skip: int = 0, limit: int = 100) -> List[EventoResponse]:
        return registro_crud.get_eventos(db=db, skip=skip, limit=limit)

    @staticmethod
    def obtener_evento_por_id(db: Session, evento_id: int) -> EventoResponse:
        evento = registro_crud.get_evento_by_id(db=db, evento_id=evento_id)
        if not evento:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No se encontró el evento con ID {evento_id}"
            )
        return evento

    @staticmethod
    def actualizar_evento(db: Session, evento_id: int, evento_in: EventoCreate) -> EventoResponse:
        EventoService.obtener_evento_por_id(db, evento_id) # Valida existencia
        return registro_crud.update_evento(db=db, evento_id=evento_id, evento_data=evento_in)

    @staticmethod
    def borrar_evento(db: Session, evento_id: int):
        EventoService.obtener_evento_por_id(db, evento_id) # Valida existencia
        registro_crud.delete_evento(db=db, evento_id=evento_id)
        return {"detail": "Evento eliminado correctamente"}
    
    # ---------------------------------------------------------
    #  AQUÍ ESTÁ LA LÓGICA DE MULTIMEDIA ACTUALIZADA 
    # ---------------------------------------------------------
    @staticmethod
    def agregar_detalles_multimedia(
        db: Session,
        id_evento: int,
        lista_archivos: List[UploadFile] = None, 
        url_externa: str = None                  # Ahora recibe un STRING opcional
    ):
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
                tipo="ENLACE" # O "VIDEO", según prefieras clasificarlo
            )
            resultados.append(link_entry)

        # 3. PROCESAR LISTA DE IMÁGENES (Si existen)
        if lista_archivos:
            for archivo in lista_archivos:
                # Validar formato de CADA archivo
                if archivo.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
                    # Si uno falla, lanzamos error (o podrías usar 'continue' para saltarlo)
                    raise HTTPException(status_code=400, detail=f"El archivo {archivo.filename} no es una imagen válida (JPG/PNG).")
                
                # Generar nombre único
                extension = archivo.filename.split(".")[-1]
                nombre_archivo = f"{uuid4()}.{extension}"
                ruta_relativa = f"static/uploads/{nombre_archivo}" # Ruta para guardar en BD
                ruta_fisica = f"{UPLOAD_DIR}/{nombre_archivo}"     # Ruta para guardar en disco
                
                # Guardar archivo físico en disco
                try:
                    with open(ruta_fisica, "wb") as buffer:
                        shutil.copyfileobj(archivo.file, buffer)
                except Exception as e:
                    raise HTTPException(status_code=500, detail=f"Error guardando imagen: {str(e)}")

                # Guardar referencia en Base de Datos
                imagen_entry = registro_crud.create_multimedia(
                    db=db,
                    id_evento=id_evento,
                    url=ruta_relativa, # Guardamos "static/uploads/foto.jpg"
                    tipo="IMAGEN" 
                )
                resultados.append(imagen_entry)

        return resultados if resultados else {"mensaje": "No se enviaron datos nuevos"}