import os
import shutil
from uuid import uuid4
from datetime import date, datetime
from app.models.registro_models import EventoMultimedia, EliminacionEvento, ReservaEvento, Evento
from app.models.auth_models import Usuario
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, UploadFile
from typing import List, Optional
from app.db.crud.registro_crud import ID_ROL_ADMINISTRADOR, ID_ROL_SUPERVISOR, ID_ESTADO_CANCELADO, ID_ESTADO_PUBLICADO, ID_ESTADO_PENDIENTE_ELIMINACION
from app.db.crud import registro_crud

# Importamos los schemas
from app.schemas.registro_schema import (
    EventoCreate,
    EventoResponse,
    EventoConCuposResponse,
)

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
        evento_existente = registro_crud.get_evento_por_nombre_y_fecha(
            db, evento_in.nombre_evento, evento_in.fecha_evento
        )
        if evento_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un evento con ese nombre en esa fecha."
            )

        # 3. LÓGICA DE ESTADO
        from datetime import date
        hoy = date.today()
        
        if evento_in.fecha_evento >= hoy:
            id_estado_final = 3 # Publicado
        else:
            id_estado_final = 4 # Finalizado

        # 4. CREAR EN BD
        nuevo_evento = registro_crud.create_evento(
            db=db, 
            evento=evento_in, 
            user_id=usuario_actual.id_usuario,
            id_estado_final=id_estado_final
        )
        return nuevo_evento

    @staticmethod
    def listar_eventos_por_usuario(db: Session, id_usuario: int, skip: int, limit: int):
        return registro_crud.get_eventos_por_usuario(db, id_usuario, skip, limit)

    @staticmethod
    def obtener_evento_por_id(db: Session, evento_id: int):
        evento = registro_crud.get_evento_by_id(db, evento_id)
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")
        return evento

    @staticmethod
    def agregar_detalles_multimedia(db: Session, id_evento: int, lista_archivos: List[UploadFile], url_externa: str):
        evento = registro_crud.get_evento_by_id(db, id_evento)
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")

        resultados = []

        # Procesar IMÁGENES
        if lista_archivos:
            for archivo in lista_archivos:
                nombre_archivo = f"{uuid4()}_{archivo.filename}"
                ruta_archivo = os.path.join(UPLOAD_DIR, nombre_archivo)
                
                with open(ruta_archivo, "wb") as buffer:
                    shutil.copyfileobj(archivo.file, buffer)
                
                url_final = f"/static/uploads/{nombre_archivo}"
                
                media = registro_crud.create_multimedia(
                    db=db, 
                    id_evento=id_evento, 
                    url=url_final, 
                    tipo="imagen"
                )
                resultados.append(media)

        # Procesar VIDEO
        if url_externa:
            media_video = registro_crud.create_multimedia(
                db=db, 
                id_evento=id_evento, 
                url=url_externa, 
                tipo="video"
            )
            resultados.append(media_video)

        return resultados

    # =========================================================================
    #  MÉTODOS DE INSCRIPCIÓN Y CUPOS
    # =========================================================================

    
    # ==========================================
    # HU 4.5: LÓGICA DE NOTIFICACIÓN (MANUAL)
    # ==========================================
    @staticmethod
    def listar_eventos_con_cupos(db: Session, skip: int, limit: int) -> List[EventoConCuposResponse]:
        eventos = registro_crud.get_eventos(db, skip, limit)
        lista_respuesta = []
        
        for ev in eventos:
            ocupados = registro_crud.count_reservas_activas(db, ev.id_evento)
            disponibles = ev.cupo_maximo - ocupados
            if disponibles < 0: disponibles = 0
            
            evento_con_cupo = EventoConCuposResponse(
                id_evento=ev.id_evento,
                nombre_evento=ev.nombre_evento,
                fecha_evento=ev.fecha_evento,
                ubicacion=ev.ubicacion,
                descripcion=ev.descripcion,
                costo_participacion=ev.costo_participacion if ev.costo_participacion else 0.0,
                cupo_maximo=ev.cupo_maximo,
                lat=ev.lat,
                lng=ev.lng,
                cupos_disponibles=disponibles,
                cupos_ocupados=ocupados
            )
            lista_respuesta.append(evento_con_cupo)
            
        return lista_respuesta

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

        # 1. Crear solicitud en la tabla EliminacionEvento
        nueva_solicitud = EliminacionEvento(
            id_evento=evento.id_evento,
            motivo_eliminacion=motivo,
            id_usuario=usuario_actual.id_usuario,
            fecha_eliminacion=datetime.now(), # <--- IMPORTANTE: Guardamos fecha y hora actual
            notificacion_enviada=False 
        )
        db.add(nueva_solicitud)

        # 2. Cambiar estado a Pendiente (6)
        # ESTO ESTABA COMENTADO EN TU CÓDIGO, HAY QUE DESCOMENTARLO:
        evento.id_estado = ID_ESTADO_PENDIENTE_ELIMINACION 
        
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
    def registrar_reserva(db: Session, id_evento: int, id_usuario: int):
        """
        Lógica:
        1. Verifica Cupos.
        2. Determina si es Gratis (Estado 2) o Pago (Estado 1).
        3. Crea reserva (sin categoría).
        4. Simula email.
        """
        # A. Verificar Evento
        evento = registro_crud.get_evento_by_id(db, id_evento)
        if not evento:
            raise HTTPException(status_code=404, detail="El evento no existe.")

        # B. Verificar Duplicados
        reserva_existente = registro_crud.get_reserva_activa_usuario(db, id_evento, id_usuario)
        if reserva_existente:
            raise HTTPException(
                status_code=400, 
                detail="Ya tienes una inscripción o reserva activa para este evento."
            )

        # C. Verificar Cupos
        ocupados = registro_crud.count_reservas_activas(db, id_evento)
        if ocupados >= evento.cupo_maximo:
            raise HTTPException(
                status_code=400, 
                detail="Lo sentimos, no hay cupos disponibles."
            )

        # D. DETERMINAR ESTADO (Gratis vs Pago)
        costo = evento.costo_participacion
        
        if costo is None or costo == 0:
            estado_reserva = 2 # Inscrito Directo
            msg_tipo = "GRATUITO - Confirmado"
        else:
            estado_reserva = 1 # Reserva Pendiente
            msg_tipo = "DE PAGO - Pendiente"

        # E. Crear la reserva (IMPORTANTE: No pasamos categoría aquí)
        nueva_reserva = registro_crud.create_reserva(
            db=db, 
            id_evento=id_evento, 
            id_usuario=id_usuario,
            id_estado=estado_reserva 
        )
        
        # F. Simulación de Envío de Correo (Recuperado de tu código)
        usuario = registro_crud.get_usuario_by_id(db, id_usuario)
        email_usuario = usuario.email if usuario else "desconocido"
        
        print(f"===========================================================")
        print(f"📧 [EMAIL SERVICE] Enviando confirmación a: {email_usuario}")
        print(f"   Evento: {evento.nombre_evento}")
        print(f"   Tipo: {msg_tipo}")
        print(f"   Estado Reserva ID: {nueva_reserva.id_reserva}")
        print(f"===========================================================")
        
        return nueva_reserva

    @staticmethod
    def confirmar_pago_simulado(db: Session, id_reserva: int):
        """
        Pasa una reserva de estado 1 (Pendiente) a 2 (Confirmada).
        """
        reserva = registro_crud.get_reserva_por_id(db, id_reserva)
        
        if not reserva:
            raise HTTPException(status_code=404, detail="Reserva no encontrada")
            
        if reserva.id_estado_reserva == 2:
             raise HTTPException(status_code=400, detail="Esta reserva ya estaba pagada/confirmada.")
             
        reserva_actualizada = registro_crud.confirmar_reserva_pago(db, reserva)
        
        print(f"💰 [PAGO] Dinero recibido para Reserva {id_reserva}. Estado cambiado a INSCRIPTO.")
        return reserva_actualizada