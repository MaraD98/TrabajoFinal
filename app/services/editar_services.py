import os
import shutil
from datetime import date
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, UploadFile # <--- Agregamos UploadFile

# Importamos los modelos necesarios
from app.models.registro_models import Evento, EventoMultimedia # <--- Agregamos EventoMultimedia
from app.models.editar_models import HistorialEdicionEvento, DetalleCambioEvento

# --- CONFIGURACIÓN PARA TUS IMÁGENES ---
DIRECTORIO_IMAGENES = "static/eventos"
os.makedirs(DIRECTORIO_IMAGENES, exist_ok=True)

class EditarEventoService:

    # --- MÉTODO 1: LÓGICA DE TU COMPAÑERA (Edición de datos) ---
    @staticmethod
    def actualizar_evento(db: Session, id_evento: int, evento_update, id_usuario_actual: int):
        """
        Realiza la edición de un evento siguiendo el flujo:
        1. Buscar y Verificar existencia.
        2. Verificar permisos (Dueño).
        3. Verificar reglas de negocio (Fecha futura).
        4. Detectar cambios (Auditoría).
        5. Guardar Historial Maestro-Detalle.
        6. Aplicar cambios al Evento.
        """
        
        # 1. BUSCAR EL EVENTO
        evento_db = db.query(Evento).filter(Evento.id_evento == id_evento).first()

        if not evento_db:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"El evento con id {id_evento} no existe."
            )

        # 2. VALIDAR PERMISOS (Solo el creador puede editar)
        if evento_db.id_usuario != id_usuario_actual:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="No tienes permisos para editar este evento."
            )

        # 3. VALIDAR REGLA DE NEGOCIO (No editar eventos pasados)
        if evento_db.fecha_evento < date.today():
             raise HTTPException(
                 status_code=status.HTTP_400_BAD_REQUEST, 
                 detail="No se permite editar un evento cuya fecha ya ha pasado."
             )

        # 4. DETECCIÓN DE CAMBIOS (Core de la Auditoría)
        datos_nuevos = evento_update.model_dump(exclude_unset=True) 
        cambios_detectados = []

        for campo, valor_nuevo in datos_nuevos.items():
            valor_anterior = getattr(evento_db, campo)
            str_anterior = str(valor_anterior) if valor_anterior is not None else ""
            str_nuevo = str(valor_nuevo) if valor_nuevo is not None else ""

            if str_anterior != str_nuevo:
                cambios_detectados.append({
                    "campo": campo,
                    "anterior": str_anterior,
                    "nuevo": str_nuevo,
                    "valor_real": valor_nuevo
                })

        # 5. TRANSACCIÓN DB (Si hubo cambios, guardamos todo)
        if cambios_detectados:
            try:
                # A. Crear la CABECERA (Historial)
                nuevo_historial = HistorialEdicionEvento(
                    id_evento=id_evento,
                    id_usuario=id_usuario_actual
                )
                db.add(nuevo_historial)
                db.flush() 

                # B. Crear los DETALLES (Renglones)
                for cambio in cambios_detectados:
                    detalle = DetalleCambioEvento(
                        id_historial_edicion=nuevo_historial.id_historial_edicion,
                        campo_modificado=cambio["campo"],
                        valor_anterior=cambio["anterior"],
                        valor_nuevo=cambio["nuevo"]
                    )
                    db.add(detalle)
                    
                    # C. ACTUALIZAR EL EVENTO REAL
                    setattr(evento_db, cambio["campo"], cambio["valor_real"])

                db.commit()
                db.refresh(evento_db)
            
            except Exception as e:
                db.rollback()
                print(f"Error al guardar historial: {e}")
                raise HTTPException(status_code=500, detail="Error interno al procesar la edición.")
        
        return evento_db

    # --- MÉTODO 2: TU LÓGICA (HU-3.3 Actualizar Multimedia) ---
    @staticmethod
    def reemplazar_archivo_multimedia(db: Session, id_multimedia: int, archivo: UploadFile):
        """
        Busca una imagen existente por su ID y reemplaza el archivo físico
        y la referencia en la base de datos.
        """
        # 1. Buscar imagen en la BD
        imagen_bd = db.query(EventoMultimedia).filter(EventoMultimedia.id_multimedia == id_multimedia).first()

        if not imagen_bd:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"No se encontró la imagen con ID {id_multimedia}"
            )

        # 2. Generar nombre de archivo y ruta (Mantenemos el ID para orden)
        extension = archivo.filename.split(".")[-1]
        nombre_nuevo = f"evento_media_{id_multimedia}.{extension}"
        ruta_completa = os.path.join(DIRECTORIO_IMAGENES, nombre_nuevo)

        # 3. Guardar archivo físico (Sobrescribiendo si existe)
        try:
            with open(ruta_completa, "wb") as buffer:
                shutil.copyfileobj(archivo.file, buffer)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al guardar el archivo: {str(e)}")

        # 4. Actualizar referencia en BD
        imagen_bd.url_archivo = ruta_completa
        imagen_bd.tipo_archivo = archivo.content_type
        
        db.commit()
        db.refresh(imagen_bd)
        
        return imagen_bd