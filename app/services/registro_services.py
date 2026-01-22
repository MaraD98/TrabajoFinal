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
    EventoConCuposResponse, # <--- Ahora sí se va a usar
    ReservaCreate,          # <--- Ahora sí se va a usar
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

        # 2. VALIDACIÓN DE DUPLICADOS (Mismo nombre y fecha)
        evento_existente = registro_crud.get_evento_por_nombre_y_fecha(
            db, evento_in.nombre_evento, evento_in.fecha_evento
        )
        if evento_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un evento con ese nombre en esa fecha."
            )

        # 3. LÓGICA DE ESTADO (Automático según fecha)
        from datetime import date
        hoy = date.today()
        
        # Si la fecha es hoy o futura -> Publicado (3)
        if evento_in.fecha_evento >= hoy:
            id_estado_final = 3 
        else:
            # Si es fecha vieja -> Finalizado (4)
            id_estado_final = 4

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
        # 1. Verificar que el evento exista
        evento = registro_crud.get_evento_by_id(db, id_evento)
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")

        resultados = []

        # 2. Procesar IMÁGENES (Si hay)
        if lista_archivos:
            for archivo in lista_archivos:
                # Generar nombre único
                nombre_archivo = f"{uuid4()}_{archivo.filename}"
                ruta_archivo = os.path.join(UPLOAD_DIR, nombre_archivo)
                
                # Guardar en disco
                with open(ruta_archivo, "wb") as buffer:
                    shutil.copyfileobj(archivo.file, buffer)
                
                # Generar URL para la BD
                url_final = f"/static/uploads/{nombre_archivo}"
                
                # Guardar en BD
                media = registro_crud.create_multimedia(
                    db=db, 
                    id_evento=id_evento, 
                    url=url_final, 
                    tipo="imagen"
                )
                resultados.append(media)

        # 3. Procesar LINK DE VIDEO (Si hay)
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
    #  NUEVOS MÉTODOS SPRINT 3 (CUPOS Y RESERVAS)
    # =========================================================================

    @staticmethod
    def listar_eventos_con_cupos(db: Session, skip: int, limit: int) -> List[EventoConCuposResponse]:
        """
        Obtiene los eventos y calcula dinámicamente cuántos lugares quedan.
        """
        # 1. Traer todos los eventos publicados
        eventos = registro_crud.get_eventos(db, skip, limit)
        
        lista_respuesta = []
        
        for ev in eventos:
            # 2. Consultar cuántas reservas confirmadas/pendientes tiene este evento
            ocupados = registro_crud.count_reservas_activas(db, ev.id_evento)
            
            # 3. Calcular disponibilidad (Matemática simple)
            disponibles = ev.cupo_maximo - ocupados
            
            # 4. Asegurar que no dé negativo (por si acaso)
            if disponibles < 0:
                disponibles = 0
            
            # 5. Armar el objeto de respuesta "híbrido" (Datos Evento + Dato Calculado)
            # Convertimos el modelo de SQLAlchemy al esquema de Pydantic manualmente o desempaquetando
            evento_con_cupo = EventoConCuposResponse(
                id_evento=ev.id_evento,
                nombre_evento=ev.nombre_evento,
                fecha_evento=ev.fecha_evento,
                ubicacion=ev.ubicacion,
                descripcion=ev.descripcion,
                costo_participacion=ev.costo_participacion,
                cupo_maximo=ev.cupo_maximo,
                lat=ev.lat,
                lng=ev.lng,
                # Agregamos los calculados:
                cupos_disponibles=disponibles,
                cupos_ocupados=ocupados
            )
            lista_respuesta.append(evento_con_cupo)
            
        return lista_respuesta

    @staticmethod
    def registrar_reserva(db: Session, id_evento: int, id_usuario: int, datos_reserva: ReservaCreate):
        """
        Maneja la lógica de inscripción: validaciones y envío de mail simulado.
        """
        # A. Verificar que el evento exista
        evento = registro_crud.get_evento_by_id(db, id_evento)
        if not evento:
            raise HTTPException(status_code=404, detail="El evento no existe.")

        # B. Verificar que el usuario no esté ya inscripto
        reserva_existente = registro_crud.get_reserva_activa_usuario(db, id_evento, id_usuario)
        if reserva_existente:
            raise HTTPException(
                status_code=400, 
                detail="Ya tienes una reserva activa para este evento."
            )

        # C. Verificar Cupos (Critical Section)
        ocupados = registro_crud.count_reservas_activas(db, id_evento)
        if ocupados >= evento.cupo_maximo:
            raise HTTPException(
                status_code=400, 
                detail="Lo sentimos, no hay cupos disponibles para este evento."
            )

        # D. Crear la reserva
        nueva_reserva = registro_crud.create_reserva(
            db=db, 
            id_evento=id_evento, 
            id_usuario=id_usuario,
            categoria=datos_reserva.categoria_participante
        )
        
        # E. Simulación de Envío de Correo (HU 8.6)
        usuario = registro_crud.get_usuario_by_id(db, id_usuario)
        email_usuario = usuario.email if usuario else "desconocido"
        
        print(f"===========================================================")
        print(f"📧 [EMAIL SERVICE] Enviando confirmación a: {email_usuario}")
        print(f"   Asunto: Reserva Confirmada - {evento.nombre_evento}")
        print(f"   Tu cupo expira el: {nueva_reserva.fecha_expiracion}")
        print(f"===========================================================")

        return nueva_reserva