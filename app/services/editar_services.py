from datetime import date
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.registro_models import Evento 
# Importamos tus nuevos modelos de historial
from app.models.editar_models import HistorialEdicionEvento, DetalleCambioEvento
from app.db.crud.notificacion_crud import NotificacionCRUD

class EditarEventoService:

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

            # 6. CREAR NOTIFICACIÓN (si alguien distinto al responsable editó)
                if id_usuario_actual != evento_db.id_usuario:
                    NotificacionCRUD.create_notificacion(
                        db=db,
                        id_usuario=evento_db.id_usuario,  # responsable original del evento
                        id_estado_solicitud=None,
                        mensaje=f"Tu evento '{evento_db.nombre_evento}' fue editado por un administrador."
                    )

            except Exception as e:
                db.rollback() # Si algo falla, volvemos atrás como si nada hubiera pasado
                print(f"Error al guardar historial: {e}") # Log interno para debugear
                raise HTTPException(status_code=500, detail="Error interno al procesar la edición.")
        
        return evento_db