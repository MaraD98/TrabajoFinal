from datetime import date, datetime
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import HTTPException, status

# Tus modelos
from app.models.registro_models import Evento
from app.models.editar_models import HistorialEdicionEvento, DetalleCambioEvento

class EditarEventoService:
    
    @staticmethod
    def actualizar_evento(db: Session, id_evento: int, evento_update, id_usuario_actual: int, id_rol_actual: int):
        """
        ✅ CORREGIDO: Edición con flujo de aprobación.
        
        LÓGICA:
        - Admin (1) o Supervisor (2): Editan DIRECTAMENTE. Evento sigue en estado 3 (Publicado).
        - Dueño (3/4): Crea SOLICITUD de edición. Evento sigue en estado 3 (visible), 
          pero aparece en "Pendientes de Edición" para admin.
        
        SIMILAR al flujo de eliminación:
        - El evento queda ACTIVO y visible para todos
        - Se crea un registro de auditoría con los cambios propuestos
        - El admin puede aprobar/rechazar los cambios
        """
        
        # 1. BUSCAR EL EVENTO
        evento_db = db.query(Evento).filter(Evento.id_evento == id_evento).first()
        if not evento_db:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"El evento con id {id_evento} no existe."
            )

        # === 2. VALIDACIÓN DE PERMISOS ===
        
        ROL_ADMIN = 1
        ROL_SUPERVISOR = 2
        ESTADO_PUBLICADO = 3
        
        es_autoridad = id_rol_actual in [ROL_ADMIN, ROL_SUPERVISOR]
        es_dueno = evento_db.id_usuario == id_usuario_actual
        esta_publicado = evento_db.id_estado == ESTADO_PUBLICADO
        
        # Caso A: No es ni autoridad ni el dueño → FUERA
        if not es_autoridad and not es_dueno:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="No tienes permisos para editar este evento."
            )
        
        # Caso B: Es el dueño (pero no admin), y el evento está publicado → CREAR SOLICITUD
        if es_dueno and not es_autoridad and esta_publicado:
            return EditarEventoService._crear_solicitud_edicion(
                db=db,
                evento=evento_db,
                cambios=evento_update,
                id_usuario=id_usuario_actual
            )
        
        # Caso C: Admin/Supervisor → EDICIÓN DIRECTA
        if es_autoridad:
            return EditarEventoService._aplicar_cambios_directos(
                db=db,
                evento=evento_db,
                cambios=evento_update,
                id_usuario=id_usuario_actual
            )
        
        # Caso D: Dueño edita su evento en borrador/pendiente (no publicado)
        return EditarEventoService._aplicar_cambios_directos(
            db=db,
            evento=evento_db,
            cambios=evento_update,
            id_usuario=id_usuario_actual
        )
    
    @staticmethod
    def _crear_solicitud_edicion(db: Session, evento: Evento, cambios, id_usuario: int):
        """
        ✅ NUEVO: Crea una solicitud de edición (similar a solicitud de baja).
        
        El evento:
        - Permanece en estado 3 (Publicado) → Visible para todos
        - Pero aparece en "Pendientes de Edición" para el dueño y admin
        
        Cómo funciona:
        - Guardamos los cambios propuestos en historial_edicion_evento
        - Cambiamos temporalmente el estado a 2 (Pendiente)
        - El admin puede aprobar/rechazar desde su panel
        """
        
        # Validar que no sea un evento pasado
        if evento.fecha_evento < date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="No se permite editar un evento cuya fecha ya ha pasado."
            )
        
        # Detectar cambios
        datos_nuevos = cambios.model_dump(exclude_unset=True)
        cambios_detectados = []
        
        for campo, valor_nuevo in datos_nuevos.items():
            valor_anterior = getattr(evento, campo)
            
            str_anterior = str(valor_anterior) if valor_anterior is not None else ""
            str_nuevo = str(valor_nuevo) if valor_nuevo is not None else ""
            
            if str_anterior != str_nuevo:
                cambios_detectados.append({
                    "campo": campo,
                    "anterior": str_anterior,
                    "nuevo": str_nuevo,
                    "valor_real": valor_nuevo
                })
        
        if not cambios_detectados:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se detectaron cambios en el evento."
            )
        
        try:
            # 1. Crear historial de edición (SOLICITUD)
            nuevo_historial = HistorialEdicionEvento(
                id_evento=evento.id_evento,
                id_usuario=id_usuario
            )
            db.add(nuevo_historial)
            db.flush()
            
            # 2. Guardar detalles de los cambios PROPUESTOS
            for cambio in cambios_detectados:
                detalle = DetalleCambioEvento(
                    id_historial_edicion=nuevo_historial.id_historial_edicion,
                    campo_modificado=cambio["campo"],
                    valor_anterior=cambio["anterior"],
                    valor_nuevo=cambio["nuevo"]
                )
                db.add(detalle)
            
            # 3. ✅ CRUCIAL: Cambiar estado a 2 (Pendiente de Edición)
            # Esto hace que aparezca en "Pendientes de Edición"
            evento.id_estado = 2
            
            db.commit()
            db.refresh(evento)
            
            return {
                "mensaje": "Solicitud de edición enviada. El evento seguirá visible hasta que el administrador apruebe los cambios.",
                "id_evento": evento.id_evento,
                "estado_actual": "Pendiente de Edición",
                "id_historial": nuevo_historial.id_historial_edicion
            }
            
        except Exception as e:
            db.rollback()
            print(f"Error al crear solicitud de edición: {e}")
            raise HTTPException(status_code=500, detail="Error al procesar la solicitud de edición.")
    
    @staticmethod
    def _aplicar_cambios_directos(db: Session, evento: Evento, cambios, id_usuario: int):
        """
        Aplica cambios INMEDIATOS al evento (para Admin/Supervisor o eventos no publicados).
        Guarda auditoría pero NO cambia el estado.
        """
        
        # Validar que no sea un evento pasado
        if evento.fecha_evento < date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="No se permite editar un evento cuya fecha ya ha pasado."
            )
        
        # Detectar cambios
        datos_nuevos = cambios.model_dump(exclude_unset=True)
        cambios_detectados = []
        
        for campo, valor_nuevo in datos_nuevos.items():
            valor_anterior = getattr(evento, campo)
            
            str_anterior = str(valor_anterior) if valor_anterior is not None else ""
            str_nuevo = str(valor_nuevo) if valor_nuevo is not None else ""
            
            if str_anterior != str_nuevo:
                cambios_detectados.append({
                    "campo": campo,
                    "anterior": str_anterior,
                    "nuevo": str_nuevo,
                    "valor_real": valor_nuevo
                })
        
        if not cambios_detectados:
            return evento
        
        try:
            # 1. Crear historial
            nuevo_historial = HistorialEdicionEvento(
                id_evento=evento.id_evento,
                id_usuario=id_usuario
            )
            db.add(nuevo_historial)
            db.flush()
            
            # 2. Guardar detalles
            for cambio in cambios_detectados:
                detalle = DetalleCambioEvento(
                    id_historial_edicion=nuevo_historial.id_historial_edicion,
                    campo_modificado=cambio["campo"],
                    valor_anterior=cambio["anterior"],
                    valor_nuevo=cambio["nuevo"]
                )
                db.add(detalle)
                
                # 3. APLICAR CAMBIO AL EVENTO
                setattr(evento, cambio["campo"], cambio["valor_real"])
            
            db.commit()
            db.refresh(evento)
            return evento
            
        except Exception as e:
            db.rollback()
            print(f"Error al aplicar cambios: {e}")
            raise HTTPException(status_code=500, detail="Error al guardar cambios.")
    
    @staticmethod
    def obtener_eventos_pendientes(db: Session):
        """
        Devuelve todos los eventos que están esperando aprobación (Estado 2).
        Incluye tanto solicitudes de edición como nuevos eventos.
        """
        eventos_pendientes = db.query(Evento).filter(Evento.id_estado == 2).all()
        return eventos_pendientes
    
    @staticmethod
    def aprobar_cambios(db: Session, id_evento: int):
        """
        Admin aprueba los cambios propuestos.
        
        Proceso:
        1. Obtener el último historial de edición
        2. Aplicar los cambios al evento
        3. Cambiar estado a 3 (Publicado)
        """
        evento = db.query(Evento).filter(Evento.id_evento == id_evento).first()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")
        
        # Buscar último historial
        ultimo_historial = db.query(HistorialEdicionEvento)\
            .filter(HistorialEdicionEvento.id_evento == id_evento)\
            .order_by(desc(HistorialEdicionEvento.fecha_edicion))\
            .first()
        
        if not ultimo_historial:
            raise HTTPException(status_code=400, detail="No hay cambios pendientes para aprobar.")
        
        # Obtener detalles de los cambios
        detalles = db.query(DetalleCambioEvento)\
            .filter(DetalleCambioEvento.id_historial_edicion == ultimo_historial.id_historial_edicion)\
            .all()
        
        try:
            # Aplicar cada cambio
            for detalle in detalles:
                campo = detalle.campo_modificado
                valor_nuevo_str = detalle.valor_nuevo
                
                # Convertir string a tipo correcto
                if campo == "fecha_evento":
                    val_aplicar = datetime.strptime(valor_nuevo_str, "%Y-%m-%d").date()
                elif campo in ["costo_participacion", "lat", "lng"]:
                    val_aplicar = Decimal(valor_nuevo_str) if valor_nuevo_str else None
                elif campo in ["id_tipo", "id_dificultad", "id_estado", "cupo_maximo"]:
                    val_aplicar = int(valor_nuevo_str)
                else:
                    val_aplicar = valor_nuevo_str
                
                setattr(evento, campo, val_aplicar)
            
            # Cambiar estado a Publicado
            evento.id_estado = 3
            
            db.commit()
            return {"mensaje": "Cambios aprobados y publicados exitosamente."}
            
        except Exception as e:
            db.rollback()
            print(f"Error al aprobar cambios: {e}")
            raise HTTPException(status_code=500, detail="Error al aprobar cambios.")
    
    @staticmethod
    def rechazar_y_revertir(db: Session, id_evento: int):
        """
        Admin rechaza los cambios propuestos.
        El evento vuelve a estado 3 (Publicado) sin aplicar cambios.
        """
        evento = db.query(Evento).filter(Evento.id_evento == id_evento).first()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")
        
        # Simplemente volver a estado Publicado
        evento.id_estado = 3
        
        db.commit()
        return {"mensaje": "Cambios rechazados. El evento mantiene su versión anterior."}