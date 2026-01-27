from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.db.crud import inscripcion_crud, registro_crud
from app.models.inscripcion_models import ReservaEvento

# Estados de Reserva (Deben coincidir con DB)
ESTADO_PENDIENTE_PAGO = 1
ESTADO_CONFIRMADO = 2
ESTADO_CANCELADO = 3
ESTADO_EXPIRADO = 4

class InscripcionService:

    @staticmethod
    def crear_inscripcion(db: Session, id_evento: int, usuario_actual):
        """
        Lógica principal de inscripción (HU 8.1 - 8.3)
        """
        # 1. Obtener datos del evento (Necesitamos costo y cupo)
        evento = registro_crud.get_evento_by_id(db, id_evento)
        if not evento:
            raise HTTPException(status_code=404, detail="El evento no existe.")

        # 2. Validar que el evento esté PUBLICADO (3)
        if evento.id_estado != 3:
             raise HTTPException(status_code=400, detail="No puedes inscribirte a un evento que no está publicado.")

        # 3. Validar duplicidad (El usuario ya tiene reserva?)
        reserva_existente = inscripcion_crud.get_reserva_activa_usuario(db, id_evento, usuario_actual.id_usuario)
        if reserva_existente:
            estado_str = "Confirmada" if reserva_existente.id_estado_reserva == 2 else "Pendiente de Pago"
            raise HTTPException(
                status_code=400, 
                detail=f"Ya tienes una inscripción activa ({estado_str}) para este evento."
            )

        # 4. Validar Cupos (Si el evento tiene límite)
        if evento.cupo_maximo and evento.cupo_maximo > 0:
            inscritos_actuales = inscripcion_crud.count_reservas_activas(db, id_evento)
            if inscritos_actuales >= evento.cupo_maximo:
                raise HTTPException(
                    status_code=400, 
                    detail="Lo sentimos, no hay cupos disponibles para este evento."
                )

        # 5. Determinar Estado Inicial (Gratis vs Pago)
        # Si costo es 0 o Null -> Confirmado directo (2)
        # Si costo > 0       -> Pendiente de Pago (1)
        costo = evento.costo_participacion or 0
        if costo == 0:
            id_estado_inicial = ESTADO_CONFIRMADO
            mensaje_exito = "Inscripción realizada con éxito. Tu lugar está confirmado."
        else:
            id_estado_inicial = ESTADO_PENDIENTE_PAGO
            mensaje_exito = "Reserva creada. Tienes 72 horas para realizar el pago."

        # 6. Crear la reserva en BD
        nueva_reserva = inscripcion_crud.create_reserva(
            db=db,
            id_evento=id_evento,
            id_usuario=usuario_actual.id_usuario,
            id_estado=id_estado_inicial
        )

        return {
            "mensaje": mensaje_exito,
            "reserva_id": nueva_reserva.id_reserva,
            "estado": "Confirmado" if id_estado_inicial == 2 else "Pendiente de Pago",
            "fecha_expiracion": nueva_reserva.fecha_expiracion if id_estado_inicial == 1 else None
        }

    @staticmethod
    def confirmar_pago_manual(db: Session, id_reserva: int, usuario_actual):
        """
        Para el Admin/Supervisor: Confirmar que recibieron la plata.
        """
        # Validar Rol Admin
        if usuario_actual.id_rol not in [1, 2]:
             raise HTTPException(status_code=403, detail="No tienes permisos para confirmar pagos.")

        reserva = inscripcion_crud.get_reserva_por_id(db, id_reserva)
        if not reserva:
            raise HTTPException(status_code=404, detail="Reserva no encontrada.")
        
        if reserva.id_estado_reserva == ESTADO_CONFIRMADO:
             raise HTTPException(status_code=400, detail="Esta reserva ya está confirmada.")

        # Actualizar a Confirmado
        reserva_actualizada = inscripcion_crud.confirmar_reserva_pago(db, reserva)
        
        return {
            "mensaje": "Pago registrado. La inscripción ha sido confirmada.",
            "id_reserva": reserva_actualizada.id_reserva,
            "nuevo_estado": "Confirmado"
        }