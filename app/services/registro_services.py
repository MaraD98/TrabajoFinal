import os
import shutil
from uuid import uuid4
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, UploadFile
from typing import List 
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