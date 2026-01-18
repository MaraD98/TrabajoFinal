import os
import shutil
from uuid import uuid4
from datetime import date
from app.models.registro_models import EventoMultimedia, EliminacionEvento, ReservaEvento, Evento
from app.models.auth_models import Usuario
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, UploadFile
from typing import List, Optional
from app.db.crud import registro_crud
from app.db.crud.registro_crud import ID_ROL_ADMINISTRADOR, ID_ROL_SUPERVISOR, ID_ESTADO_CANCELADO, ID_ESTADO_PUBLICADO, ID_ESTADO_PENDIENTE_ELIMINACION
from app.schemas.registro_schema import EventoCreate, EventoResponse 

# Configuración de carpeta para guardar fotos
UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class EventoService:

    @staticmethod
    def crear_nuevo_evento(db: Session, evento_in: EventoCreate, usuario_actual) -> EventoResponse:
        
        # 1. VALIDACIÓN DE PERMISOS
        if usuario_actual.id_rol in [3, 4]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tu perfil no tiene permisos para crear eventos."
            )

        # 2. VALIDACIÓN DE DUPLICADOS
        # (Alineado correctamente con el resto del código)
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
        # Admin (1) o Supervisor (2) -> Publicado (3)
        # Otros -> Borrador (1)
        if usuario_actual.id_rol in [1, 2]:
            estado_calculado = 3 
        else:
            estado_calculado = 1 
        
        # 4. GUARDAR
        nuevo_evento = registro_crud.create_evento(
            db=db, 
            evento=evento_in, 
            user_id=usuario_actual.id_usuario,
            id_estado_final=estado_calculado 
        )
        
        return nuevo_evento
    
    @staticmethod
    def listar_eventos_por_usuario(db: Session, id_usuario: int, skip: int = 0, limit: int = 100) -> List[EventoResponse]:
        return registro_crud.get_eventos_por_usuario(db=db, id_usuario=id_usuario, skip=skip, limit=limit)

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

    
    # ==========================================
    # HU 4.5: LÓGICA DE NOTIFICACIÓN (MANUAL)
    # ==========================================
    @staticmethod
    def _procesar_notificaciones_cancelacion(db: Session, evento, motivo: str, id_eliminacion: int):
        """
        Busca reservas manualmente y notifica a los usuarios.
        """
        # 1. BUSCAR RESERVAS: "SELECT * FROM reserva_evento WHERE id_evento = X"
        reservas = db.query(ReservaEvento).filter(ReservaEvento.id_evento == evento.id_evento).all()

        if not reservas:
            print(f"--- [INFO] El evento '{evento.nombre_evento}' no tiene reservas registradas. ---")
            return

        print(f"--- [MOCK EMAIL] Iniciando notificación a {len(reservas)} inscriptos ---")
        
        # 2. Obtener datos del organizador (Dueño del evento)
        organizador = db.query(Usuario).filter(Usuario.id_usuario == evento.id_usuario).first()
        contacto_org = organizador.email if organizador else "soporte@tuapp.com"

        count = 0
        for reserva in reservas:
            # 3. BUSCAR USUARIO PARTICIPANTE
            participante = db.query(Usuario).filter(Usuario.id_usuario == reserva.id_usuario).first()
            
            if participante and participante.email:
                destinatario = participante.email
                # Simulación del envío de correo
                print(f" >> Enviando email a: {destinatario}")
                print(f"    Asunto: EVENTO CANCELADO - {evento.nombre_evento}")
                print(f"    Mensaje: El evento ha sido cancelado. Motivo: {motivo}")
                print(f"    Contacto: {contacto_org}")
                print("-" * 30)
                count += 1
        
        print(f"--- [INFO] Fin notificaciones. Total enviados: {count} ---")

        # 4. Actualizar flag en la tabla de eliminación
        eliminacion = db.query(EliminacionEvento).filter(EliminacionEvento.id_eliminacion == id_eliminacion).first()
        if eliminacion:
            eliminacion.notificacion_enviada = True
            db.commit()

    # ==========================================
    # HU 4.2: SOLICITAR ELIMINACIÓN (EXTERNO)
    # ==========================================
    @staticmethod
    def solicitar_eliminacion_externo(db: Session, evento_id: int, motivo: str, usuario_actual):
        evento = EventoService.obtener_evento_por_id(db, evento_id)

        if evento.id_usuario != usuario_actual.id_usuario:
             raise HTTPException(status_code=403, detail="No tienes permiso para gestionar este evento.")

        # Solo si está PUBLICADO
        if evento.id_estado != ID_ESTADO_PUBLICADO:
            raise HTTPException(
                status_code=400, 
                detail=f"Solo se pueden solicitar bajar eventos publicados. Estado actual: {evento.id_estado}"
            )

        # Crear solicitud
        nueva_solicitud = EliminacionEvento(
            id_evento=evento.id_evento,
            motivo_eliminacion=motivo,
            id_usuario=usuario_actual.id_usuario,
            notificacion_enviada=False 
        )
        db.add(nueva_solicitud)

        # Cambiar estado a Pendiente (6)
        # evento.id_estado = ID_ESTADO_PENDIENTE_ELIMINACION
        pass
        db.commit()
        db.refresh(evento)
        
        return {
            "mensaje": "Solicitud enviada. Pendiente de revisión.",
            "estado_nuevo": "Pendiente de Eliminación",
            "id_evento": evento.id_evento
        }

    # ==========================================
    # HU 4.1 y 4.5: CANCELAR PROPIO
    # ==========================================
    @staticmethod
    def cancelar_evento_propio(db: Session, evento_id: int, motivo: str, usuario_actual):
        # 1. Obtener evento
        evento = registro_crud.get_evento_by_id(db, evento_id)
        if not evento:
            raise HTTPException(status_code=404, detail="El evento no existe.")

        # 2. Validar Dueño o Admin
        es_dueno = (evento.id_usuario == usuario_actual.id_usuario)
        es_admin = (usuario_actual.id_rol == ID_ROL_ADMINISTRADOR)

        if not es_dueno and not es_admin:
            raise HTTPException(status_code=403, detail="No tienes permiso. No eres el creador.")

        # 3. Validar Fecha/Estado
        if evento.fecha_evento < date.today():
             raise HTTPException(status_code=400, detail="No se puede eliminar un evento finalizado.")
        
        if evento.id_estado == 4: # Asumiendo 4 es finalizado
             raise HTTPException(status_code=400, detail="El evento ya está finalizado.")

        # 4. Ejecutar Cancelación (Manual para obtener ID para la notificación)
        nueva_eliminacion = EliminacionEvento(
            id_evento=evento.id_evento,
            motivo_eliminacion=motivo,
            id_usuario=usuario_actual.id_usuario,
            notificacion_enviada=False 
        )
        db.add(nueva_eliminacion)
        
        evento.id_estado = ID_ESTADO_CANCELADO
        db.commit()
        db.refresh(nueva_eliminacion)

        # HU 4.5 -> DISPARAR NOTIFICACIONES
        EventoService._procesar_notificaciones_cancelacion(db, evento, motivo, nueva_eliminacion.id_eliminacion)

        return {"detail": "Evento cancelado y participantes notificados.", "estado_nuevo": "Cancelado"}

    # ==========================================
    # HU 4.3 y 4.5: ELIMINAR ADMIN (LIMPIEZA)
    # ==========================================
    @staticmethod
    def eliminar_evento_admin(db: Session, evento_id: int, motivo: str, usuario_actual):
        # 1. Validar Permisos
        roles_permitidos = [ID_ROL_ADMINISTRADOR, ID_ROL_SUPERVISOR]
        
        if usuario_actual.id_rol not in roles_permitidos:
             raise HTTPException(status_code=403, detail="No tienes permisos de eliminar eventos.")

        evento = EventoService.obtener_evento_por_id(db, evento_id)

        # 2. Auditoría
        nueva_eliminacion = EliminacionEvento(
            id_evento=evento.id_evento,
            motivo_eliminacion=f"[ADMIN - LIMPIEZA] {motivo}",
            id_usuario=usuario_actual.id_usuario,
            notificacion_enviada=False
        )
        db.add(nueva_eliminacion)

        # 3. Estado -> Cancelado
        evento.id_estado = ID_ESTADO_CANCELADO
        db.commit()
        db.refresh(nueva_eliminacion)

        # HU 4.5-> DISPARAR NOTIFICACIONES
        EventoService._procesar_notificaciones_cancelacion(
            db, evento, f"[ADMIN] {motivo}", nueva_eliminacion.id_eliminacion
        )

        return {
            "mensaje": "Evento dado de baja por administrador.",
            "id_evento": evento.id_evento,
            "nuevo_estado": "Cancelado (5)"
        }
    
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