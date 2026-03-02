from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from app.db.crud import inscripcion_crud, registro_crud
from app.models.inscripcion_models import ReservaEvento
from app.models.auth_models import Usuario
from app.models.registro_models import Evento
from app.models.inscripcion_models import ReservaEvento as Inscripcion
from app.email import enviar_correo_reserva, enviar_correo_cancelacion_reserva
from app.whatsapp import enviar_whatsapp_reserva, enviar_whatsapp_cancelacion_evento

class InscripcionService:

    @staticmethod
    def listar_todas(db: Session):
        reservas = db.query(ReservaEvento).options(
            joinedload(ReservaEvento.usuario),
            joinedload(ReservaEvento.evento).joinedload(Evento.tipo_evento),
            joinedload(ReservaEvento.evento).joinedload(Evento.nivel_dificultad)
        ).all()

        datos_formateados = []

        for r in reservas:
            evt = r.evento
            usr = r.usuario

            nombre_estado = "Desconocido"
            if r.id_estado_reserva == 1:
                nombre_estado = "Pendiente"
            elif r.id_estado_reserva == 2:
                nombre_estado = "Confirmada"
            elif r.id_estado_reserva == 3:
                nombre_estado = "Cancelada"
            elif r.id_estado_reserva == 4:
                nombre_estado = "Expirada"

            u_nombre_completo = usr.nombre_y_apellido if usr else "Usuario Eliminado"
            u_email = usr.email if usr else "Sin Email"
            nombre_evt = evt.nombre_evento if evt else "Evento no encontrado"
            tipo_txt = evt.tipo_evento.nombre if (evt and evt.tipo_evento) else "N/A"
            dificultad_txt = evt.nivel_dificultad.nombre if (evt and evt.nivel_dificultad) else "N/A"
            fecha_evt = str(evt.fecha_evento) if (evt and evt.fecha_evento) else "-"
            monto_real = float(evt.costo_participacion) if (evt and evt.costo_participacion) else 0.0
            fecha_insc = str(r.fecha_reserva).split(".")[0] if r.fecha_reserva else "-"

            item = {
                "id_reserva": r.id_reserva,
                "usuario_nombre": u_nombre_completo, 
                "usuario_apellido": "", 
                "usuario_email": u_email,
                "nombre_evento": nombre_evt,
                "fecha_evento": fecha_evt,
                "tipo_evento": tipo_txt,
                "nivel_dificultad": dificultad_txt,
                "fecha_inscripcion": fecha_insc,
                "estado_reserva": nombre_estado,
                "monto": monto_real
            }
            datos_formateados.append(item)

        return datos_formateados

    # ESTE ES EL MÉTODO NUEVO QUE AGREGAMOS PARA TU PERFIL
    @staticmethod
    def listar_por_usuario(db: Session, id_usuario: int):
        reservas = db.query(ReservaEvento).filter(ReservaEvento.id_usuario == id_usuario).options(
            joinedload(ReservaEvento.evento).joinedload(Evento.tipo_evento),
            joinedload(ReservaEvento.evento).joinedload(Evento.nivel_dificultad)
        ).all()

        datos_formateados = []
        for r in reservas:
            evt = r.evento
            nombre_estado = "Desconocido"
            if r.id_estado_reserva == 1:
                nombre_estado = "Pendiente"
            elif r.id_estado_reserva == 2:
                nombre_estado = "Confirmada"
            elif r.id_estado_reserva == 3:
                nombre_estado = "Cancelada"
            elif r.id_estado_reserva == 4:
                nombre_estado = "Expirada"

            # --- LÓGICA DE DETALLE DE CANCELACIÓN ---
            detalle_baja = ""
            if r.id_estado_reserva == 3:
                # Importamos aquí para evitar importaciones circulares
                from app.models.eliminacion_models import EliminacionEvento
                # Buscamos si hay un registro de que el evento fue eliminado
                eliminacion = db.query(EliminacionEvento).filter(EliminacionEvento.id_evento == r.id_evento).first()
                if eliminacion:
                    detalle_baja = f"Evento cancelado por el organizador: {eliminacion.motivo_eliminacion}"
                else:
                    detalle_baja = "Cancelada por el usuario"
            # ----------------------------------------

            item = {
                "id_reserva": r.id_reserva,
                "nombre_evento": evt.nombre_evento if evt else "Evento no encontrado",
                "fecha_evento": str(evt.fecha_evento) if (evt and evt.fecha_evento) else "-",
                "tipo_evento": evt.tipo_evento.nombre if (evt and evt.tipo_evento) else "N/A",
                "nivel_dificultad": evt.nivel_dificultad.nombre if (evt and evt.nivel_dificultad) else "N/A",
                "fecha_inscripcion": str(r.fecha_reserva).split(".")[0] if r.fecha_reserva else "-",
                "estado_reserva": nombre_estado,
                "estado_id": r.id_estado_reserva, # Agregamos el ID para facilitar el estilo en el front
                "monto": float(evt.costo_participacion) if (evt and evt.costo_participacion) else 0.0,
                "detalle_baja": detalle_baja # <--- Mandamos el motivo al front
            }
            datos_formateados.append(item)
        return datos_formateados

    @staticmethod
    def crear_inscripcion(db: Session, id_evento: int, usuario_actual, background_tasks):
        evento = registro_crud.get_evento_by_id(db, id_evento)
        if not evento:
            raise HTTPException(status_code=404, detail="El evento no existe.")

        if evento.id_estado != 3:
             raise HTTPException(status_code=400, detail="No puedes inscribirte a un evento que no está publicado.")

        reserva_existente = inscripcion_crud.get_reserva_activa_usuario(db, id_evento, usuario_actual.id_usuario)
        if reserva_existente:
            estado_txt = "Confirmada" if reserva_existente.id_estado_reserva == 2 else "Pendiente"
            raise HTTPException(
                status_code=400, 
                detail=f"Ya tienes una inscripción activa ({estado_txt}) para este evento."
            )

        if evento.cupo_maximo and evento.cupo_maximo > 0:
            inscritos = inscripcion_crud.count_reservas_activas(db, id_evento)
            if inscritos >= evento.cupo_maximo:
                raise HTTPException(status_code=400, detail="Lo sentimos, no hay cupos disponibles.")

        costo = evento.costo_participacion or 0
        if costo == 0:
            id_estado_inicial = 2
            mensaje = "Inscripción exitosa. Lugar confirmado."
        else:
            id_estado_inicial = 1
            mensaje = "Reserva exitosa. Tienes 72hs para realizar el pago de tu evento."

        nueva = inscripcion_crud.create_reserva(
            db=db,
            id_evento=id_evento,
            id_usuario=usuario_actual.id_usuario,
            id_estado=id_estado_inicial
        )

        # MANDAMOS EL MAIL EN SEGUNDO PLANO
        background_tasks.add_task(
            enviar_correo_reserva,
            email_destino=usuario_actual.email,
            nombre_usuario=usuario_actual.nombre_y_apellido,
            evento=evento.nombre_evento,
            fecha=f"{evento.fecha_evento}. {mensaje}"
        )

        # MANDAMOS EL WHATSAPP EN SEGUNDO PLANO (SOLO SI EL USUARIO TIENE TELÉFONO)
        if hasattr(usuario_actual, 'telefono') and usuario_actual.telefono:
            background_tasks.add_task(
                enviar_whatsapp_reserva,
                telefono=usuario_actual.telefono,
                nombre_usuario=usuario_actual.nombre_y_apellido,
                evento=evento.nombre_evento,
                fecha=str(evento.fecha_evento)
            )

        return {
            "mensaje": mensaje,
            "reserva_id": nueva.id_reserva,
            "estado": "Confirmada" if id_estado_inicial == 2 else "Pendiente",
            "fecha_expiracion": nueva.fecha_expiracion if id_estado_inicial == 1 else None
        }

    @staticmethod
    def confirmar_pago_manual(db: Session, id_reserva: int, usuario_actual):
        if usuario_actual.id_rol not in [1, 2]:
             raise HTTPException(status_code=403, detail="No tienes permisos para confirmar pagos.")
        reserva = inscripcion_crud.get_reserva_por_id(db, id_reserva)
        if not reserva:
            raise HTTPException(status_code=404, detail="Reserva no encontrada.")
        if reserva.id_estado_reserva == 2:
             raise HTTPException(status_code=400, detail="Esta reserva ya está confirmada.")
        reserva_act = inscripcion_crud.confirmar_reserva_pago(db, reserva)
        return {
            "mensaje": "Pago registrado. Inscripción confirmada.",
            "id_reserva": reserva_act.id_reserva,
            "nuevo_estado": "Confirmada"
        }
    
    # En app/services/inscripcion_services.py

    @staticmethod
    def confirmar_pago_automatico(db: Session, id_reserva: int):
        # 1. Buscamos la reserva
        reserva = db.query(ReservaEvento).filter(ReservaEvento.id_reserva == id_reserva).first()
        if not reserva:
            return None
        
        # 2. Cambiamos el estado a 2 (que suele ser 'Pagado' o 'Confirmado')
        # Fijate en tu tabla EstadoReserva qué ID tiene 'Pagado'
        reserva.id_estado_reserva = 2 
        
        db.commit()
        db.refresh(reserva)
        return reserva

    @staticmethod
    def cancelar_inscripcion(db: Session, id_inscripcion: int, usuario_actual, background_tasks):
        # 1. Buscamos la inscripción
        inscripcion = db.query(Inscripcion).options(joinedload(Inscripcion.evento)).filter(Inscripcion.id_reserva == id_inscripcion).first()
        
        if not inscripcion:
            raise HTTPException(status_code=404, detail="La inscripción no existe.")
        
        if usuario_actual.id_rol not in [1, 2] and inscripcion.id_usuario != usuario_actual.id_usuario:
             raise HTTPException(status_code=403, detail="No tienes permiso para cancelar esta reserva.")
        
        # 2. CAPTURAMOS LOS DATOS PARA NOTIFICAR
        email_u = usuario_actual.email
        nom_u = usuario_actual.nombre_y_apellido
        nom_e = inscripcion.evento.nombre_evento if inscripcion.evento else "Evento"

        # 3. 🔥 CAMBIO CLAVE: NO BORRAMOS, ACTUALIZAMOS EL ESTADO
        # Según tus ifs de arriba, el ID 3 es "Cancelada"
        inscripcion.id_estado_reserva = 3 
        db.commit() # Guardamos el cambio de estado

        # 4. MANDAMOS NOTIFICACIONES EN SEGUNDO PLANO
        background_tasks.add_task(
            enviar_correo_cancelacion_reserva, 
            email_destino=email_u, 
            nombre_usuario=nom_u, 
            evento=nom_e
        )

        if hasattr(usuario_actual, 'telefono') and usuario_actual.telefono:
            background_tasks.add_task(
                enviar_whatsapp_cancelacion_evento,
                telefono=usuario_actual.telefono,
                nombre_evento=nom_e,
                motivo="Cancelación realizada exitosamente."
            )
        
        return {"message": "Inscripción cancelada exitosamente (Soft Delete)"}