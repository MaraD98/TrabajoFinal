from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from app.db.crud import inscripcion_crud, registro_crud
from app.models.inscripcion_models import ReservaEvento
from app.models.auth_models import Usuario
from app.models.registro_models import Evento
from app.models.inscripcion_models import ReservaEvento as Inscripcion

class InscripcionService:

    @staticmethod
    def listar_todas(db: Session):
        """
        Recupera reservas corrigiendo el error de atributo 'nombre'.
        Usa 'nombre_y_apellido' como está definido en auth.models.
        """
        # Traemos la reserva con sus relaciones para no fallar al leer datos
        reservas = db.query(ReservaEvento).options(
            joinedload(ReservaEvento.usuario),
            joinedload(ReservaEvento.evento).joinedload(Evento.tipo_evento),
            joinedload(ReservaEvento.evento).joinedload(Evento.nivel_dificultad)
        ).all()

        datos_formateados = []

        for r in reservas:
            # 1. OBJETOS RELACIONADOS
            evt = r.evento
            usr = r.usuario

            # 2. MAPEO DE ESTADOS (IDs a Texto)
            nombre_estado = "Desconocido"
            if r.id_estado_reserva == 1:
                nombre_estado = "Pendiente"
            elif r.id_estado_reserva == 2:
                nombre_estado = "Confirmada"
            elif r.id_estado_reserva == 3:
                nombre_estado = "Cancelada"
            elif r.id_estado_reserva == 4:
                nombre_estado = "Expirada"

            # 3. CORRECCIÓN DEL USUARIO (Aquí estaba el error 500)
            # Usamos 'nombre_y_apellido' que es lo que existe en tu BD.
            u_nombre_completo = usr.nombre_y_apellido if usr else "Usuario Eliminado"
            u_email = usr.email if usr else "Sin Email"

            # 4. DATOS DEL EVENTO (Para que se vea bonito en el front)
            nombre_evt = evt.nombre_evento if evt else "Evento no encontrado"
            
            # Tipo y Dificultad: Si existen, sacamos el .nombre, si no "N/A"
            tipo_txt = evt.tipo_evento.nombre if (evt and evt.tipo_evento) else "N/A"
            dificultad_txt = evt.nivel_dificultad.nombre if (evt and evt.nivel_dificultad) else "N/A"
            
            # Fecha y Costo
            fecha_evt = str(evt.fecha_evento) if (evt and evt.fecha_evento) else "-"
            monto_real = float(evt.costo_participacion) if (evt and evt.costo_participacion) else 0.0

            # Fecha Inscripción (formato string)
            fecha_insc = str(r.fecha_reserva).split(".")[0] if r.fecha_reserva else "-"

            item = {
                "id_reserva": r.id_reserva,
                
                # CORRECCIÓN AQUÍ:
                "usuario_nombre": u_nombre_completo, 
                "usuario_apellido": "", # Lo dejamos vacío porque tu BD tiene todo junto en nombre_y_apellido
                "usuario_email": u_email,

                # DATOS DE EVENTO
                "nombre_evento": nombre_evt,
                "fecha_evento": fecha_evt,
                "tipo_evento": tipo_txt,            # Ej: "Carrera"
                "nivel_dificultad": dificultad_txt, # Ej: "Básico"
                
                # DATOS DE RESERVA
                "fecha_inscripcion": fecha_insc,
                "estado_reserva": nombre_estado,
                "monto": monto_real
            }
            datos_formateados.append(item)

        return datos_formateados

    # -------------------------------------------------------------------------
    # MÉTODOS DE CREACIÓN Y PAGO (Sin cambios lógicos, solo limpieza)
    # -------------------------------------------------------------------------

    @staticmethod
    def crear_inscripcion(db: Session, id_evento: int, usuario_actual):
        evento = registro_crud.get_evento_by_id(db, id_evento)
        if not evento:
            raise HTTPException(status_code=404, detail="El evento no existe.")

        # Verificar si está publicado (Estado 3 = Publicado)
        if evento.id_estado != 3:
             raise HTTPException(status_code=400, detail="No puedes inscribirte a un evento que no está publicado.")

        # Verificar si ya tiene reserva
        reserva_existente = inscripcion_crud.get_reserva_activa_usuario(db, id_evento, usuario_actual.id_usuario)
        if reserva_existente:
            estado_txt = "Confirmada" if reserva_existente.id_estado_reserva == 2 else "Pendiente"
            raise HTTPException(
                status_code=400, 
                detail=f"Ya tienes una inscripción activa ({estado_txt}) para este evento."
            )

        # Verificar cupos
        if evento.cupo_maximo and evento.cupo_maximo > 0:
            inscritos = inscripcion_crud.count_reservas_activas(db, id_evento)
            if inscritos >= evento.cupo_maximo:
                raise HTTPException(status_code=400, detail="Lo sentimos, no hay cupos disponibles.")

        # Costo 0 -> Confirmado (2), Costo > 0 -> Pendiente (1)
        costo = evento.costo_participacion or 0
        if costo == 0:
            id_estado_inicial = 2
            mensaje = "Inscripción exitosa. Lugar confirmado."
        else:
            id_estado_inicial = 1
            mensaje = "Reserva creada. Tienes 72hs para pagar."

        nueva = inscripcion_crud.create_reserva(
            db=db,
            id_evento=id_evento,
            id_usuario=usuario_actual.id_usuario,
            id_estado=id_estado_inicial
        )

        return {
            "mensaje": mensaje,
            "reserva_id": nueva.id_reserva,
            "estado": "Confirmada" if id_estado_inicial == 2 else "Pendiente",
            "fecha_expiracion": nueva.fecha_expiracion if id_estado_inicial == 1 else None
        }

    @staticmethod
    def confirmar_pago_manual(db: Session, id_reserva: int, usuario_actual):
        # Solo Admin(1) o Supervisor(2)
        if usuario_actual.id_rol not in [1, 2]:
             raise HTTPException(status_code=403, detail="No tienes permisos para confirmar pagos.")

        reserva = inscripcion_crud.get_reserva_por_id(db, id_reserva)
        if not reserva:
            raise HTTPException(status_code=404, detail="Reserva no encontrada.")
        
        if reserva.id_estado_reserva == 2:
             raise HTTPException(status_code=400, detail="Esta reserva ya está confirmada.")

        # Confirmar
        reserva_act = inscripcion_crud.confirmar_reserva_pago(db, reserva)
        
        return {
            "mensaje": "Pago registrado. Inscripción confirmada.",
            "id_reserva": reserva_act.id_reserva,
            "nuevo_estado": "Confirmada"
        }
    
    @staticmethod
    def cancelar_inscripcion(db: Session, id_inscripcion: int, usuario_actual):
        # 1. Buscar la inscripción (recordá usar .id_reserva)
        inscripcion = db.query(Inscripcion).filter(Inscripcion.id_reserva == id_inscripcion).first()
        
        if not inscripcion:
            raise HTTPException(status_code=404, detail="La inscripción no existe.")

        # 2. Seguridad... (verificación de usuario)
        if usuario_actual.id_rol not in [1, 2] and inscripcion.id_usuario != usuario_actual.id_usuario:
             raise HTTPException(status_code=403, detail="No tienes permiso...")

        # 3. Borrar la inscripción
        db.delete(inscripcion)
        db.commit()
        
        return {"message": "Inscripción cancelada exitosamente"}