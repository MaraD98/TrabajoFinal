from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.auth_models import Usuario
from app.models.evento_solicitud_models import EstadoSolicitud, SolicitudPublicacion
from app.models.registro_models import Evento, TipoEvento, NivelDificultad # Importamos NivelDificultad

class ReporteService:

    # ---------------- ADMIN (Rol 1) ----------------
    @staticmethod
    def reportes_admin(db: Session, anio: int = None, mes: int = None):
        # Filtros base para reutilizar
        filtros = []
        if anio:
            filtros.append(func.extract("year", Evento.fecha_evento) == anio)
        if mes:
            filtros.append(func.extract("month", Evento.fecha_evento) == mes)

        # Total eventos con filtro
        total_eventos = db.query(func.count(Evento.id_evento)).filter(*filtros).scalar()

        # Resultados por estado con filtro
        resultados_estado = db.query(Evento.id_estado, func.count(Evento.id_evento)).filter(*filtros).group_by(Evento.id_estado).all()
        eventos_por_estado = [{"estado": estado, "cantidad": cantidad} for estado, cantidad in resultados_estado]

        # Resultados por usuario con filtro
        resultados_usuario = db.query(Evento.id_usuario, func.count(Evento.id_evento)).filter(*filtros).group_by(Evento.id_usuario).all()
        eventos_por_usuario = [{"usuario": usuario, "cantidad": cantidad} for usuario, cantidad in resultados_usuario]

        # Resultados por mes (histórico - no suele filtrarse para ver la línea de tiempo)
        resultados_mes = db.query(
            func.extract("year", Evento.fecha_evento).label("anio"),
            func.extract("month", Evento.fecha_evento).label("mes"),
            func.count(Evento.id_evento)
        ).group_by("anio", "mes").all()
        eventos_por_mes = [{"anio": int(anio), "mes": int(mes), "cantidad": cantidad} for anio, mes, cantidad in resultados_mes]

        # --- REPORTE TIPO (Añadido a Admin con filtro) ---
        resultados_tipo = (
            db.query(TipoEvento.nombre, func.count(Evento.id_evento))
            .join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)
            .filter(*filtros)
            .group_by(TipoEvento.nombre).all()
        )
        eventos_por_tipo = [{"tipo": nombre, "cantidad": cantidad} for nombre, cantidad in resultados_tipo]

        # --- REPORTE DIFICULTAD (Añadido a Admin con filtro) ---
        resultados_dificultad = (
            db.query(NivelDificultad.nombre, func.count(Evento.id_evento))
            .join(NivelDificultad, Evento.id_dificultad == NivelDificultad.id_dificultad)
            .filter(*filtros)
            .group_by(NivelDificultad.nombre).all()
        )
        eventos_por_dificultad = [{"dificultad": nombre, "cantidad": cantidad} for nombre, cantidad in resultados_dificultad]

        usuarios_total = db.query(func.count(Usuario.id_usuario)).scalar()
        resultados_roles = db.query(Usuario.id_rol, func.count(Usuario.id_usuario)).group_by(Usuario.id_rol).all()
        usuarios_por_rol = [{"rol": rol, "cantidad": cantidad} for rol, cantidad in resultados_roles]

        return {
            "total_eventos": total_eventos,
            "eventos_por_tipo": eventos_por_tipo,
            "eventos_por_dificultad": eventos_por_dificultad,
            "eventos_por_estado": eventos_por_estado,
            "eventos_por_usuario": eventos_por_usuario,
            "eventos_por_mes": eventos_por_mes,
            "usuarios_total": usuarios_total,
            "usuarios_por_rol": usuarios_por_rol
        }

   # ---------------- SUPERVISOR (Rol 2) ----------------
    @staticmethod
    def reportes_supervisor(db: Session, id_usuario: int, anio: int = None, mes: int = None):
        filtros = []
        if anio:
            filtros.append(func.extract("year", Evento.fecha_evento) == anio)
        if mes:
            filtros.append(func.extract("month", Evento.fecha_evento) == mes)

        resultados_tipo = (
            db.query(TipoEvento.nombre, func.count(Evento.id_evento))
            .join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)
            .filter(*filtros)
            .group_by(TipoEvento.nombre).all()
        )
        eventos_por_tipo = [{"tipo": nombre, "cantidad": cantidad} for nombre, cantidad in resultados_tipo]

        # --- REPORTE DIFICULTAD (Añadido a Supervisor con filtro) ---
        resultados_dificultad = (
            db.query(NivelDificultad.nombre, func.count(Evento.id_evento))
            .join(NivelDificultad, Evento.id_dificultad == NivelDificultad.id_dificultad)
            .filter(*filtros)
            .group_by(NivelDificultad.nombre).all()
        )
        eventos_por_dificultad = [{"dificultad": nombre, "cantidad": cantidad} for nombre, cantidad in resultados_dificultad]

        resultados_estado = db.query(Evento.id_estado, func.count(Evento.id_evento)).filter(*filtros).group_by(Evento.id_estado).all()
        eventos_por_estado = [{"estado": estado, "cantidad": cantidad} for estado, cantidad in resultados_estado]

        resultados_mes = db.query(
            func.extract("year", Evento.fecha_evento).label("anio"),
            func.extract("month", Evento.fecha_evento).label("mes"),
            func.count(Evento.id_evento)
        ).group_by("anio", "mes").all()
        evolucion_mensual = [{"anio": int(anio), "mes": int(mes), "cantidad": cantidad} for anio, mes, cantidad in resultados_mes]

        resultados_solicitudes = (
            db.query(EstadoSolicitud.nombre, func.count(SolicitudPublicacion.id_solicitud))
            .join(SolicitudPublicacion, EstadoSolicitud.id_estado_solicitud == SolicitudPublicacion.id_estado_solicitud)
            .group_by(EstadoSolicitud.nombre).all()
        )
        solicitudes_externas = [{"estado": nombre, "cantidad": cantidad} for nombre, cantidad in resultados_solicitudes]

        return {
            "eventos_por_tipo": eventos_por_tipo,
            "eventos_por_dificultad": eventos_por_dificultad,
            "eventos_por_estado": eventos_por_estado,
            "evolucion_mensual": evolucion_mensual,
            "solicitudes_externas": solicitudes_externas
        }

    # ---------------- OPERARIO (Rol 3) ----------------
    @staticmethod
    def reportes_operario(db: Session, id_usuario: int):
        mis_eventos_total = db.query(func.count(Evento.id_evento)).filter(Evento.id_usuario == id_usuario).scalar()
        resultados_estado = db.query(Evento.id_estado, func.count(Evento.id_evento)).filter(Evento.id_usuario == id_usuario).group_by(Evento.id_estado).all()
        mis_eventos_por_estado = [{"estado": estado, "cantidad": cantidad} for estado, cantidad in resultados_estado]
        return {
            "mis_eventos_total": mis_eventos_total,
            "mis_eventos_por_estado": mis_eventos_por_estado
        }

    # ---------------- CLIENTE (Rol 4) ----------------
    @staticmethod
    def reportes_cliente(db: Session, id_usuario: int):
        return {
            "mis_inscripciones": "Aquí iría la lógica de inscripciones del cliente",
            "mis_notificaciones": "Aquí iría la lógica de notificaciones del cliente"
        }