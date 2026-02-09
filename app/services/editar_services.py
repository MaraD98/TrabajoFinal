from datetime import date, datetime
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import HTTPException, status

# Tus modelos
from app.models.registro_models import Evento 
from app.models.editar_models import HistorialEdicionEvento, DetalleCambioEvento
from app.db.crud.notificacion_crud import NotificacionCRUD

class EditarEventoService:

    @staticmethod
    # ¡OJO! Agregué el parámetro id_rol_actual aquí
    def actualizar_evento(db: Session, id_evento: int, evento_update, id_usuario_actual: int, id_rol_actual: int):
        
       # Realiza la edición de un evento con validación de roles:
        """
         Realiza la edición de un evento con validación de roles:
        - Admin (1) o Supervisor (2): Pueden editar SIEMPRE.
        - Dueño: Puede editar SOLO si el evento NO está Publicado (3).
        """
        
        # 1. BUSCAR EL EVENTO
        evento_db = db.query(Evento).filter(Evento.id_evento == id_evento).first()

        if not evento_db:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"El evento con id {id_evento} no existe."
            )

        # === 2. NUEVA LÓGICA DE VALIDACIÓN DE PERMISOS ===
        
        # Definimos constantes según tu BD
        ROL_ADMIN = 1
        ROL_SUPERVISOR = 2
        ESTADO_PUBLICADO = 3
        
        es_autoridad = id_rol_actual in [ROL_ADMIN, ROL_SUPERVISOR]
        es_dueno = evento_db.id_usuario == id_usuario_actual
        esta_publicado = evento_db.id_estado == ESTADO_PUBLICADO

        # Caso A: No es ni autoridad ni el dueño -> FUERA
        if not es_autoridad and not es_dueno:
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="No tienes permisos para editar este evento."
            )

        # Caso B: Es el dueño (pero no admin), y el evento ya está publicado -> PROHIBIDO
        if es_dueno and not es_autoridad and esta_publicado:
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="El evento ya está PUBLICADO. Solo un Administrador o Supervisor puede modificarlo."
            )

        # Si pasa estas validaciones, significa que:
        # 1. O es Autoridad (puede hacer lo que quiera).
        # 2. O es Dueño y el evento sigue en Borrador/Pendiente.
        
        # =================================================

        # 3. VALIDAR REGLA DE NEGOCIO (No editar eventos pasados)
        # Nota: ¿Los admins deberían poder corregir eventos pasados? 
        # Si NO quieres que los admins editen eventos pasados, deja esto tal cual.
        # Si quieres que los admins SÍ puedan, agrega "and not es_autoridad" en el if.
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

        # 5. TRANSACCIÓN DB
        if cambios_detectados:
            try:
                # A. Crear la CABECERA (Historial)
                # Aquí guardamos el id_usuario_actual. Si edita un Admin, queda registrado que FUE EL ADMIN.
                nuevo_historial = HistorialEdicionEvento(
                    id_evento=id_evento,
                    id_usuario=id_usuario_actual
                )
                db.add(nuevo_historial)
                db.flush() 

                # B. Crear los DETALLES
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

            # 6. CREAR NOTIFICACIÓN (si alguien distinto al responsable editó)
                if id_usuario_actual != evento_db.id_usuario:
                    NotificacionCRUD.create_notificacion(
                        db=db,
                        id_usuario=evento_db.id_usuario,  # responsable original del evento
                        id_estado_solicitud=None,
                        mensaje=f"Tu evento '{evento_db.nombre_evento}' fue editado por un administrador."
                    )

            except Exception as e:
                db.rollback() 
                print(f"Error al guardar historial: {e}") 
                raise HTTPException(status_code=500, detail="Error interno al procesar la edición.")
        
        return evento_db
        
    @staticmethod
    def obtener_eventos_pendientes(db: Session):
        """
        Devuelve todos los eventos que están esperando aprobación (Estado 2).
        """
        # Filtramos solo los que tienen id_estado = 2
        eventos_pendientes = db.query(Evento).filter(Evento.id_estado == 2).all()
        return eventos_pendientes
    
    @staticmethod
    def aprobar_cambios(db: Session, id_evento: int):
        evento = db.query(Evento).filter(Evento.id_evento == id_evento).first()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")
        
        # Pasa a Publicado (3)
        evento.id_estado = 3 
        try:
            db.commit()
            
            # --- NOTIFICACIÓN POR APROBACIÓN ---
            NotificacionCRUD.create_notificacion(
                db=db,
                id_usuario=evento.id_usuario,
                mensaje=f"¡Buenas noticias! Tu evento '{evento.nombre_evento}' ha sido aprobado y ya está visible para todos."
            )
            return {"mensaje": "Evento aprobado y publicado exitosamente."}
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail="Error al aprobar el evento.")

    @staticmethod
    def rechazar_y_revertir(db: Session, id_evento: int):
        # 1. Buscar evento
        evento = db.query(Evento).filter(Evento.id_evento == id_evento).first()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")

        # 2. Buscar último historial
        ultimo_historial = db.query(HistorialEdicionEvento)\
            .filter(HistorialEdicionEvento.id_evento == id_evento)\
            .order_by(desc(HistorialEdicionEvento.fecha_edicion))\
            .first()

        if not ultimo_historial:
            raise HTTPException(status_code=400, detail="No hay cambios recientes para revertir.")

        detalles = db.query(DetalleCambioEvento)\
            .filter(DetalleCambioEvento.id_historial_edicion == ultimo_historial.id_historial_edicion)\
            .all()

        try:
            # 3. REVERTIR (Convertibilidad)
            for detalle in detalles:
                campo = detalle.campo_modificado
                valor_antiguo_str = detalle.valor_anterior
                
                if campo == "fecha_evento":
                    val_restaurado = datetime.strptime(valor_antiguo_str, "%Y-%m-%d").date()
                elif campo in ["costo_participacion", "lat", "lng"]:
                    val_restaurado = Decimal(valor_antiguo_str)
                elif campo in ["id_tipo", "id_dificultad", "id_estado"]:
                    val_restaurado = int(valor_antiguo_str)
                else:
                    val_restaurado = valor_antiguo_str 
                
                setattr(evento, campo, val_restaurado)
            
            # 4. Volver a Publicado (3) ya que se restauró la versión "buena"
            evento.id_estado = 3 
            
            db.commit()
            # --- NOTIFICACIÓN POR RECHAZO ---
            NotificacionCRUD.create_notificacion(
                db=db,
                id_usuario=evento.id_usuario,
                mensaje=f"Los cambios recientes en tu evento '{evento.nombre_evento}' no fueron aprobados y se restauró la versión anterior."
            )
            return {"mensaje": "Cambios rechazados. Se ha restaurado la versión anterior."}
            
        except Exception as e:
            db.rollback()
            print(f"Error al revertir: {e}")
            raise HTTPException(status_code=500, detail="Error al revertir cambios.")