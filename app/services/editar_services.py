from datetime import date, datetime
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import HTTPException, status

# Importamos los modelos necesarios
# Asumo que Evento está en registro_models (donde lo tenías originalmente)
from app.models.registro_models import Evento 
# Importamos tus nuevos modelos de historial
from app.models.editar_models import HistorialEdicionEvento, DetalleCambioEvento

class EditarEventoService:

    """ESTO ESTABA ANTES
    @staticmethod
    def actualizar_evento(db: Session, id_evento: int, evento_update, id_usuario_actual: int):
        
        Realiza la edición de un evento siguiendo el flujo:
        1. Buscar y Verificar existencia.
        2. Verificar permisos (Dueño).
        3. Verificar reglas de negocio (Fecha futura).
        4. Detectar cambios (Auditoría).
        5. Guardar Historial Maestro-Detalle.
        6. Aplicar cambios al Evento.
        
        
        # 1. BUSCAR EL EVENTO
        evento_db = db.query(Evento).filter(Evento.id_evento == id_evento).first()

        if not evento_db:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"El evento con id {id_evento} no existe."
            )

        # 2. VALIDAR PERMISOS (Solo el creador puede editar)
        # En tu tabla Evento el campo es 'id_usuario', no 'id_organizador'
        if evento_db.id_usuario != id_usuario_actual:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="No tienes permisos para editar este evento (no eres administrador)."
            )

        # 3. VALIDAR REGLA DE NEGOCIO (No editar eventos pasados)
        # Comparamos con la fecha de hoy
        if evento_db.fecha_evento < date.today():
             raise HTTPException(
                 status_code=status.HTTP_400_BAD_REQUEST, 
                 detail="No se permite editar un evento cuya fecha ya ha pasado."
             )

        # 4. DETECCIÓN DE CAMBIOS (Core de la Auditoría)
        # exclude_unset=True significa: "Solo dame lo que el usuario envió en el JSON"
        datos_nuevos = evento_update.model_dump(exclude_unset=True) 
        cambios_detectados = []

        for campo, valor_nuevo in datos_nuevos.items():
            # Obtenemos el valor actual de la base de datos
            valor_anterior = getattr(evento_db, campo)

            # Convertimos ambos a String para poder compararlos y guardarlos en la BD de texto
            # Esto maneja Fechas, Decimales, Floats, etc. sin que Python explote.
            str_anterior = str(valor_anterior) if valor_anterior is not None else ""
            str_nuevo = str(valor_nuevo) if valor_nuevo is not None else ""

            if str_anterior != str_nuevo:
                cambios_detectados.append({
                    "campo": campo,
                    "anterior": str_anterior,
                    "nuevo": str_nuevo,
                    "valor_real": valor_nuevo # Guardamos el valor original para actualizar la tabla Evento
                })

        # 5. TRANSACCIÓN DB (Si hubo cambios, guardamos todo)
        if cambios_detectados:
            try:
                # A. Crear la CABECERA (Historial)
                nuevo_historial = HistorialEdicionEvento(
                    id_evento=id_evento,
                    id_usuario=id_usuario_actual
                    # fecha_edicion es automática por la BD
                )
                db.add(nuevo_historial)
                
                # FLUSH: Envía la cabecera a la BD para obtener su 'id_historial_edicion' 
                # pero NO confirma la transacción todavía.
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

                # Confirmamos todo el paquete junto
                db.commit()
                db.refresh(evento_db)
            
            except Exception as e:
                db.rollback() # Si algo falla, volvemos atrás como si nada hubiera pasado
                print(f"Error al guardar historial: {e}") # Log interno para debugear
                raise HTTPException(status_code=500, detail="Error interno al procesar la edición.")
        
        return evento_db"""
        
    @staticmethod
    def actualizar_evento(db: Session, id_evento: int, evento_update, id_usuario_actual: int, id_rol_actual: int):
        # 1. BUSCAR EL EVENTO
        evento_db = db.query(Evento).filter(Evento.id_evento == id_evento).first()

        if not evento_db:
            raise HTTPException(status_code=404, detail=f"El evento {id_evento} no existe.")

        # 2. VALIDAR PERMISOS (Propiedad o Admin)
        # Si es Admin (1) o Supervisor (2), puede editar cualquier evento.
        # Si es Usuario normal, solo el suyo.
        es_autoridad = id_rol_actual in [1, 2]
        
        if not es_autoridad and evento_db.id_usuario != id_usuario_actual:
            raise HTTPException(status_code=403, detail="No tienes permisos para editar este evento.")

        # 3. VALIDAR FECHA FUTURA
        if evento_db.fecha_evento < date.today():
             raise HTTPException(status_code=400, detail="No se puede editar un evento pasado.")

        # 4. DETECCIÓN DE CAMBIOS
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

        # 5. GUARDAR Y ACTUALIZAR ESTADO
        if cambios_detectados:
            try:
                # A. Crear Historial
                nuevo_historial = HistorialEdicionEvento(
                    id_evento=id_evento,
                    id_usuario=id_usuario_actual
                )
                db.add(nuevo_historial)
                db.flush() 

                # B. Crear Detalles y actualizar Evento
                for cambio in cambios_detectados:
                    detalle = DetalleCambioEvento(
                        id_historial_edicion=nuevo_historial.id_historial_edicion,
                        campo_modificado=cambio["campo"],
                        valor_anterior=cambio["anterior"],
                        valor_nuevo=cambio["nuevo"]
                    )
                    db.add(detalle)
                    setattr(evento_db, cambio["campo"], cambio["valor_real"])

                # --- LÓGICA CORREGIDA HU-3.5 ---
                # Solo pasa a Pendiente si NO es Admin/Supervisor y estaba Publicado
                if not es_autoridad and evento_db.id_estado == 3:
                    evento_db.id_estado = 2 
                    # (Si es Admin, se queda en 3: Publicado)

                db.commit()
                db.refresh(evento_db)
            
            except Exception as e:
                db.rollback()
                print(f"Error al editar: {e}")
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
        db.commit()
        return {"mensaje": "Evento aprobado y publicado exitosamente."}

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
            return {"mensaje": "Cambios rechazados. Se ha restaurado la versión anterior."}
            
        except Exception as e:
            db.rollback()
            print(f"Error al revertir: {e}")
            raise HTTPException(status_code=500, detail="Error al revertir cambios.")