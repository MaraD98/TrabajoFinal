import os
import shutil
from uuid import uuid4
from datetime import date, datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, UploadFile
from typing import List, Optional
from app.models.auth_models import Usuario
from app.models.eliminacion_models import EliminacionEvento
from app.db.crud import registro_crud
from app.db.crud.registro_crud import (
    ID_ROL_ADMINISTRADOR, 
    ID_ROL_SUPERVISOR, 
    ID_ESTADO_CANCELADO, 
    ID_ESTADO_PUBLICADO, 
)
from app.schemas.registro_schema import EventoCreate, EventoResponse
from app.models.inscripcion_models import ReservaEvento 

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
        
        Incluye lógica unificada:
        1. Cálculo de cupos disponibles.
        2. Verificación de solicitudes de eliminación pendientes.
        """
        # 1. Obtener eventos base
        eventos = registro_crud.get_eventos_por_usuario(
            db=db, 
            id_usuario=id_usuario, 
            skip=skip, 
            limit=limit
        )
        
        eventos_procesados = []
        for evento in eventos:
            # --- LÓGICA 1: CALCULAR CUPOS ---
            ocupados = db.query(ReservaEvento).filter(
                ReservaEvento.id_evento == evento.id_evento
            ).count()
            
            total = evento.cupo_maximo if evento.cupo_maximo else 0
            cupos_disponibles = total - ocupados
            # --- LÓGICA 2: SOLICITUDES PENDIENTES ---
            solicitud = db.query(EliminacionEvento).filter(
                EliminacionEvento.id_evento == evento.id_evento,
                EliminacionEvento.notificacion_enviada == False
            ).first()
            
            # --- UNIFICACIÓN EN EL OBJETO DE RESPUESTA ---
            # Convertimos a dict para agregar los campos calculados dinámicamente
            evento_dict = evento.__dict__.copy()
            
            # Limpieza de metadata de SQLAlchemy si es necesario (opcional, pero recomendado)
            if "_sa_instance_state" in evento_dict:
                del evento_dict["_sa_instance_state"]
            # Agregamos los nuevos campos al diccionario
            evento_dict.update({
                'cupos_disponibles': cupos_disponibles,
                'tiene_solicitud_pendiente': solicitud is not None,
                'motivo_solicitud': solicitud.motivo_eliminacion if solicitud else None
            })
            
            eventos_procesados.append(evento_dict)
        
        return eventos_procesados
    @staticmethod
    def listar_todos_los_eventos(db: Session, skip: int = 0, limit: int = 100) -> List[EventoResponse]:
        # Traemos los eventos del CRUD tal cual estaban
        eventos = registro_crud.get_eventos(db=db, skip=skip, limit=limit)
        
        # --- NUEVO: AQUÍ HACEMOS LA MAGIA DE LOS CUPOS ---
        for evento in eventos:
            # Contamos cuántos inscriptos hay en la tabla ReservaEvento
            ocupados = db.query(ReservaEvento).filter(ReservaEvento.id_evento == evento.id_evento).count()
            
            # Hacemos la resta
            total = evento.cupo_maximo if evento.cupo_maximo else 0
            evento.cupos_disponibles = total - ocupados
        # ------------------------------------------------
        
        return eventos
    @staticmethod
    def obtener_evento_por_id(db: Session, evento_id: int) -> EventoResponse:
        """Obtiene un evento por su ID"""
        evento = registro_crud.get_evento_by_id(db=db, evento_id=evento_id)
        if not evento:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No se encontró el evento con ID {evento_id}"
            )
        
        # --- NUEVO: CALCULAR CUPOS PARA UN SOLO EVENTO ---
        ocupados = db.query(ReservaEvento).filter(ReservaEvento.id_evento == evento.id_evento).count()
        total = evento.cupo_maximo if evento.cupo_maximo else 0
        evento.cupos_disponibles = total - ocupados
        # -------------------------------------------------
        
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
                print(f"  >> Enviando email a: {destinatario}")
                print(f"     Asunto: EVENTO CANCELADO - {evento.nombre_evento}")
                print(f"     Mensaje: El evento ha sido cancelado. Motivo: {motivo}")
                print(f"     Contacto: {contacto_org}")
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
        # 1. Crear solicitud en la tabla EliminacionEvento
        nueva_solicitud = EliminacionEvento(
            id_evento=evento.id_evento,
            motivo_eliminacion=motivo,
            id_usuario=usuario_actual.id_usuario,
            fecha_eliminacion=datetime.now(), 
            notificacion_enviada=False
        )
        db.add(nueva_solicitud)
        
        db.commit()
        db.refresh(evento)
        
        return {
            "mensaje": "Solicitud enviada. Pendiente de revisión.",
            "estado_nuevo": "Publicado (con solicitud pendiente)",
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
        
        if evento.id_estado == 4:  # Asumiendo 4 es finalizado
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
    # AQUÍ ESTÁ LA LÓGICA DE MULTIMEDIA ACTUALIZADA 
    # ---------------------------------------------------------
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