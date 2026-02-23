from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from app.db.crud import inscripcion_crud, registro_crud
from app.models.inscripcion_models import ReservaEvento
from app.models.auth_models import Usuario
from app.models.registro_models import Evento
from app.models.inscripcion_models import ReservaEvento as Inscripcion

from app.email import enviar_correo_reserva, enviar_correo_cancelacion_reserva


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

    # 👇 ESTE ES EL MÉTODO NUEVO QUE AGREGAMOS PARA TU PERFIL
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

            item = {
                "id_reserva": r.id_reserva,
                "nombre_evento": evt.nombre_evento if evt else "Evento no encontrado",
                "fecha_evento": str(evt.fecha_evento) if (evt and evt.fecha_evento) else "-",
                "tipo_evento": evt.tipo_evento.nombre if (evt and evt.tipo_evento) else "N/A",
                "nivel_dificultad": evt.nivel_dificultad.nombre if (evt and evt.nivel_dificultad) else "N/A",
                "fecha_inscripcion": str(r.fecha_reserva).split(".")[0] if r.fecha_reserva else "-",
                "estado_reserva": nombre_estado,
                "monto": float(evt.costo_participacion) if (evt and evt.costo_participacion) else 0.0
            }
            datos_formateados.append(item)
        return datos_formateados

    @staticmethod
    def crear_inscripcion(db: Session, id_evento: int, usuario_actual):
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

        try:
            # 👇 CAMBIO AQUÍ: Pasamos el id_evento para que el mail tenga el link correcto
            enviar_correo_reserva(
                email_destino=usuario_actual.email,
                nombre_usuario=usuario_actual.nombre_y_apellido,
                evento=evento.nombre_evento,
                fecha=f"{evento.fecha_evento}. {mensaje}"
                # Nota: Si actualizaste enviar_correo_reserva para recibir id_evento, agregalo acá
            )
        except Exception as e:
            print(f"⚠️ Error al enviar email: {e}")

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
    def cancelar_inscripcion(db: Session, id_inscripcion: int, usuario_actual):
        # 1. Buscamos la inscripción
        inscripcion = db.query(Inscripcion).options(joinedload(Inscripcion.evento)).filter(Inscripcion.id_reserva == id_inscripcion).first()
        
        if not inscripcion:
            raise HTTPException(status_code=404, detail="La inscripción no existe.")
        
        if usuario_actual.id_rol not in [1, 2] and inscripcion.id_usuario != usuario_actual.id_usuario:
             raise HTTPException(status_code=403, detail="No tienes permiso para cancelar esta reserva.")
        
        # 2. CAPTURAMOS LOS DATOS AQUÍ
        email_u = usuario_actual.email
        nom_u = usuario_actual.nombre_y_apellido
        nom_e = "Evento"
        if inscripcion.evento:
            nom_e = inscripcion.evento.nombre_evento

        # 3. BORRAMOS Y HACEMOS COMMIT
        db.delete(inscripcion)
        db.commit()

        # 4. DISPARAMOS EL MAIL
        try:
            print(f"📧 Enviando cancelación a {email_u}...")
            enviar_correo_cancelacion_reserva(email_destino=email_u, nombre_usuario=nom_u, evento=nom_e)
            print("✅ Mail enviado.")
        except Exception as e:
            print(f"⚠️ El mail no salió: {e}")
        
        return {"message": "Inscripción cancelada exitosamente"}