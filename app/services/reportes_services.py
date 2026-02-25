from collections import Counter
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from app.models.auth_models import Usuario
from app.models.evento_solicitud_models import EstadoSolicitud, SolicitudPublicacion
from app.models.registro_models import Evento, TipoEvento, NivelDificultad
from app.models.inscripcion_models import ReservaEvento


class ReporteService:

    # ══════════════════════════════════════════════════════════════════════════
    # HELPERS PRIVADOS
    # ══════════════════════════════════════════════════════════════════════════

    @staticmethod
    def _get_mis_estadisticas(db: Session, id_usuario: int):
        total = db.query(func.count(Evento.id_evento))\
                  .filter(Evento.id_usuario == id_usuario).scalar()

        res_estados = db.query(Evento.id_estado, func.count(Evento.id_evento))\
                        .filter(Evento.id_usuario == id_usuario)\
                        .group_by(Evento.id_estado).all()
        por_estado = [{"estado": e, "cantidad": c} for e, c in res_estados]

        return {
            "mis_eventos_total": total,
            "mis_eventos_por_estado": por_estado
        }

    @staticmethod
    def _extraer_provincia(ubicacion_completa: str) -> str:
        if not ubicacion_completa:
            return "Sin Provincia"
        partes = [p.strip() for p in ubicacion_completa.split(',')]
        for parte in partes:
            if "Provincia de" in parte:
                return parte.replace("Provincia de", "").strip().title()
            if "Province of" in parte:
                return parte.replace("Province of", "").strip().title()
        if len(partes) >= 3:
            candidata = partes[-3].strip()
            if not candidata.isdigit() and candidata.lower() != "argentina":
                return candidata.title()
        if len(partes) >= 2:
            return partes[-2].strip().title()
        return "Sin Provincia"

    @staticmethod
    def _extraer_localidad(ubicacion_completa: str) -> str:
        if not ubicacion_completa:
            return "Sin Localidad"
        partes = [p.strip() for p in ubicacion_completa.split(',')]
        for parte in partes:
            if "Municipio de" in parte:
                return parte.replace("Municipio de", "").strip().title()
        for parte in partes:
            if "Departamento" in parte:
                return parte.strip().title()
        if len(partes) >= 3:
            return partes[-3].strip().title()
        return partes[0].strip().title()

    # ──────────────────────────────────────────────────────────────────────────
    # HELPER PRIVADO: construye el detalle de recaudación enriquecido con
    # `organizador_nombre` y `organizador_tipo`. Usado exclusivamente por Admin.
    # ──────────────────────────────────────────────────────────────────────────
    @staticmethod
    def _build_detalle_recaudacion_admin(db: Session, filtros: list) -> tuple:
        """
        Retorna (lista_detalle, total_recaudado).

        Cada ítem incluye:
          - organizador_nombre : nombre_y_apellido del dueño del evento
          - organizador_tipo   : 'Externo' (id_rol == 3) | 'Admin/Supervisor' (id_rol <= 2)
        """
        # ── Query principal: eventos + organizador + reservas ────────────────
        eventos_query = (
            db.query(
                Evento.id_evento,
                Evento.nombre_evento,
                Evento.fecha_evento,
                Evento.fecha_creacion,
                Evento.id_estado,
                Evento.costo_participacion,
                Evento.cupo_maximo,
                Evento.distancia_km,
                Evento.descripcion,
                Evento.ubicacion,
                Evento.id_usuario,
                TipoEvento.nombre.label("tipo_nombre"),
                Usuario.nombre_y_apellido.label("organizador_nombre"),
                Usuario.id_rol.label("organizador_rol"),
                func.count(ReservaEvento.id_reserva).label("total_reservas"),
            )
            .join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)
            .join(Usuario, Evento.id_usuario == Usuario.id_usuario)
            .outerjoin(ReservaEvento, Evento.id_evento == ReservaEvento.id_evento)
            .filter(*filtros)
            .group_by(
                Evento.id_evento,
                TipoEvento.nombre,
                Usuario.nombre_y_apellido,
                Usuario.id_rol,
            )
            .order_by(Evento.fecha_evento.desc())
            .all()
        )

        # ── Reservas confirmadas (estado 2) por evento ───────────────────────
        confirmadas_subq = (
            db.query(
                ReservaEvento.id_evento,
                func.sum(
                    case((ReservaEvento.id_estado_reserva == 2, 1), else_=0)
                ).label("confirmadas"),
                func.count(ReservaEvento.id_reserva).label("total")
            )
            .join(Evento, ReservaEvento.id_evento == Evento.id_evento)
            .filter(*filtros)
            .group_by(ReservaEvento.id_evento)
            .all()
        )
        confirmadas_map: dict = {
            row.id_evento: {
                "confirmadas": int(row.confirmadas or 0),
                "total": int(row.total or 0),
            }
            for row in confirmadas_subq
        }

        # ── Construcción de la lista ─────────────────────────────────────────
        detalle: list = []
        total_recaudado: float = 0.0

        for e in eventos_query:
            costo = float(e.costo_participacion or 0)
            stats = confirmadas_map.get(
                e.id_evento,
                {"confirmadas": 0, "total": int(e.total_reservas or 0)},
            )
            inscriptos_confirmados = stats["confirmadas"]
            inscriptos_count = stats["total"]
            monto_evento = costo * inscriptos_confirmados
            total_recaudado += monto_evento

            # Clasificación del organizador
            if e.organizador_rol <= 2:
                org_tipo = "Admin/Supervisor"
            else:
                org_tipo = "Externo"

            detalle.append({
                "id_evento": e.id_evento,
                "nombre_evento": e.nombre_evento,
                "fecha_evento": e.fecha_evento.strftime('%Y-%m-%d') if e.fecha_evento else "Sin fecha",
                "monto": round(monto_evento, 2),
                "monto_unitario": costo,
                "inscriptos_count": inscriptos_count,
                "inscriptos_confirmados": inscriptos_confirmados,
                "cupo_maximo": e.cupo_maximo,
                "estado_evento": e.id_estado,
                "tipo": e.tipo_nombre,
                "descripcion": e.descripcion or "",
                "ubicacion_completa": e.ubicacion or "",
                "distancia_km": float(e.distancia_km or 0),
                # ── CAMPOS NUEVOS: Ruta del Dinero ───────────────────────────
                "organizador_nombre": e.organizador_nombre,
                "organizador_tipo": org_tipo,
            })

        return detalle, round(total_recaudado, 2)

    # ══════════════════════════════════════════════════════════════════════════
    # REPORTE ADMIN  (Rol 1)
    # ══════════════════════════════════════════════════════════════════════════

    @staticmethod
    def reportes_admin(db: Session, anio: int = None, mes: int = None):
        filtros = []
        if anio:
            filtros.append(func.extract("year", Evento.fecha_evento) == anio)
        if mes:
            filtros.append(func.extract("month", Evento.fecha_evento) == mes)

        # ── Totales básicos ──────────────────────────────────────────────────
        total_eventos = db.query(func.count(Evento.id_evento)).filter(*filtros).scalar()

        resultados_estado = db.query(Evento.id_estado, func.count(Evento.id_evento))\
            .filter(*filtros).group_by(Evento.id_estado).all()
        eventos_por_estado = [{"estado": e, "cantidad": c} for e, c in resultados_estado]

        resultados_usuario = db.query(Evento.id_usuario, func.count(Evento.id_evento))\
            .filter(*filtros).group_by(Evento.id_usuario).all()
        eventos_por_usuario = [{"usuario": u, "cantidad": c} for u, c in resultados_usuario]

        resultados_mes = db.query(
            func.extract("year", Evento.fecha_evento).label("anio"),
            func.extract("month", Evento.fecha_evento).label("mes"),
            func.count(Evento.id_evento)
        ).filter(*filtros).group_by("anio", "mes").all()
        eventos_por_mes = [{"anio": int(a), "mes": int(m), "cantidad": c} for a, m, c in resultados_mes]

        resultados_tipo = (
            db.query(TipoEvento.nombre, func.count(Evento.id_evento))
            .join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)
            .filter(*filtros).group_by(TipoEvento.nombre).all()
        )
        eventos_por_tipo = [{"tipo": n, "cantidad": c} for n, c in resultados_tipo]

        resultados_dificultad = (
            db.query(NivelDificultad.nombre, func.count(Evento.id_evento))
            .join(NivelDificultad, Evento.id_dificultad == NivelDificultad.id_dificultad)
            .filter(*filtros).group_by(NivelDificultad.nombre).all()
        )
        eventos_por_dificultad = [{"dificultad": n, "cantidad": c} for n, c in resultados_dificultad]

        usuarios_total = db.query(func.count(Usuario.id_usuario)).scalar()
        resultados_roles = db.query(Usuario.id_rol, func.count(Usuario.id_usuario))\
            .group_by(Usuario.id_rol).all()
        usuarios_por_rol = [{"rol": r, "cantidad": c} for r, c in resultados_roles]

        ubicaciones_crudas = db.query(Evento.ubicacion).filter(*filtros).all()
        lista_lugares = [ReporteService._extraer_localidad(u[0]) for u in ubicaciones_crudas if u[0]]
        conteo = Counter(lista_lugares)
        eventos_por_ubicacion = [
            {"ubicacion": lugar, "cantidad": cantidad}
            for lugar, cantidad in conteo.most_common(10)
        ]

        # ── NUEVO: Recaudación total con trazabilidad de organizador ─────────
        detalle_recaudacion, recaudacion_total = \
            ReporteService._build_detalle_recaudacion_admin(db, filtros)

        # ── NUEVO: Total de eventos de organizaciones externas ───────────────
        # (id_rol == 3 → Organización Externa)
        total_eventos_externos = (
            db.query(func.count(Evento.id_evento))
            .join(Usuario, Evento.id_usuario == Usuario.id_usuario)
            .filter(Usuario.id_rol == 3, *filtros)
            .scalar()
        )

        # Total de inscripciones en todo el sistema
        total_inscripciones_sistema = (
            db.query(func.count(ReservaEvento.id_reserva))
            .join(Evento, ReservaEvento.id_evento == Evento.id_evento)
            .filter(*filtros)
            .scalar()
        )

        # ── NUEVO: Top 10 eventos por recaudación histórica ──────────────────
        # Recaudación = costo_participacion × reservas confirmadas (estado 2)
        top10_recaudacion = (
            db.query(
                Evento.id_evento,
                Evento.nombre_evento,
                Evento.fecha_evento,
                Evento.id_estado,
                Evento.costo_participacion,
                TipoEvento.nombre.label("tipo_nombre"),
                Usuario.nombre_y_apellido.label("organizador_nombre"),
                Usuario.id_rol.label("organizador_rol"),
                func.sum(
                    case((ReservaEvento.id_estado_reserva == 2, 1), else_=0)
                ).label("confirmadas"),
                func.count(ReservaEvento.id_reserva).label("total_reservas"),
                (
                    Evento.costo_participacion *
                    func.sum(
                        case((ReservaEvento.id_estado_reserva == 2, 1), else_=0)
                    )
                ).label("recaudacion_evento"),
            )
            .join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)
            .join(Usuario, Evento.id_usuario == Usuario.id_usuario)
            .outerjoin(ReservaEvento, Evento.id_evento == ReservaEvento.id_evento)
            .filter(*filtros)
            .group_by(
                Evento.id_evento,
                TipoEvento.nombre,
                Usuario.nombre_y_apellido,
                Usuario.id_rol,
            )
            .order_by(func.desc("recaudacion_evento"))
            .order_by(text("recaudacion_evento DESC"))
            .limit(10)
            .all()
        )

        top10_recaudacion_lista = [
            {
                "id_evento": row.id_evento,
                "nombre_evento": row.nombre_evento,
                "fecha_evento": row.fecha_evento.strftime('%Y-%m-%d') if row.fecha_evento else "Sin fecha",
                "estado_evento": row.id_estado,
                "tipo": row.tipo_nombre,
                "organizador_nombre": row.organizador_nombre,
                "organizador_tipo": "Admin/Supervisor" if row.organizador_rol <= 2 else "Externo",
                "monto_unitario": float(row.costo_participacion or 0),
                "inscriptos_confirmados": int(row.confirmadas or 0),
                "total_reservas": int(row.total_reservas or 0),
                "recaudacion_evento": round(float(row.recaudacion_evento or 0), 2),
            }
            for row in top10_recaudacion
        ]

        # ── NUEVO: Métricas de usuarios — nuevos por mes ─────────────────────
        # Distingue entre Organización Externa (id_rol=3) y Cliente (id_rol=4)
        nuevos_usuarios_mes = (
            db.query(
                func.extract("year", Usuario.fecha_creacion).label("anio"),
                func.extract("month", Usuario.fecha_creacion).label("mes"),
                Usuario.id_rol,
                func.count(Usuario.id_usuario).label("cantidad"),
            )
            .filter(Usuario.id_rol.in_([3, 4]))   # solo Externo y Cliente
            .group_by("anio", "mes", Usuario.id_rol)
            .order_by("anio", "mes")
            .all()
        )
        nuevos_usuarios_por_mes = [
            {
                "anio": int(row.anio),
                "mes": int(row.mes),
                "id_rol": row.id_rol,
                "tipo": "Externo" if row.id_rol == 3 else "Cliente",
                "cantidad": row.cantidad,
            }
            for row in nuevos_usuarios_mes
        ]

        # ── NUEVO: Acordeón de usuarios — detalle por rol ────────────────────
        # Para cada usuario devolvemos un resumen liviano; el endpoint
        # /reportes/usuario-detalle/{id} proveerá el drill-down completo.
        usuarios_detalle = (
            db.query(
                Usuario.id_usuario,
                Usuario.nombre_y_apellido,
                Usuario.email,
                Usuario.id_rol,
                Usuario.fecha_creacion,
                func.count(Evento.id_evento).label("eventos_creados"),
            )
            .outerjoin(Evento, Evento.id_usuario == Usuario.id_usuario)
            .group_by(Usuario.id_usuario)
            .order_by(Usuario.id_rol, Usuario.nombre_y_apellido)
            .all()
        )

        # Inscripciones por usuario (solo para Clientes, rol 4)
        inscripciones_por_usuario = (
            db.query(
                ReservaEvento.id_usuario,
                func.count(ReservaEvento.id_reserva).label("cantidad"),
            )
            .group_by(ReservaEvento.id_usuario)
            .all()
        )
        inscripciones_map = {row.id_usuario: row.cantidad for row in inscripciones_por_usuario}

        usuarios_acordeon = [
            {
                "id_usuario": u.id_usuario,
                "nombre": u.nombre_y_apellido,
                "email": u.email,
                "id_rol": u.id_rol,
                "fecha_creacion": u.fecha_creacion.strftime('%Y-%m-%d') if u.fecha_creacion else None,
                # Organizadores: cuántos eventos crearon
                "eventos_creados": int(u.eventos_creados or 0),
                # Clientes: cuántas inscripciones tienen
                "inscripciones": inscripciones_map.get(u.id_usuario, 0),
            }
            for u in usuarios_detalle
        ]

        # ── NUEVO: Tendencias por ubicación (provincias/localidades) ─────────
        # igual que en reportes_organizacion_externa pero sin filtro de usuario
        eventos_globales = (
            db.query(
                Evento.id_evento,
                Evento.nombre_evento,
                Evento.ubicacion,
                Evento.fecha_evento,
                Evento.id_estado,
                Evento.distancia_km,
                Evento.id_usuario,
                TipoEvento.nombre.label("tipo_nombre"),
                Usuario.nombre_y_apellido.label("organizador_nombre"),
                Usuario.id_rol.label("organizador_rol"),
            )
            .join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)
            .join(Usuario, Evento.id_usuario == Usuario.id_usuario)
            .filter(Evento.id_estado.in_([3, 4]))
            .filter(*filtros)
            .all()
        )

        tendencias_dict: dict = {}
        for evento in eventos_globales:
            provincia = ReporteService._extraer_provincia(evento.ubicacion).strip().title()
            localidad = ReporteService._extraer_localidad(evento.ubicacion).strip().title()

            if provincia not in tendencias_dict:
                tendencias_dict[provincia] = {
                    "provincia": provincia,
                    "total_eventos": 0,
                    "localidades": {},
                }

            if localidad not in tendencias_dict[provincia]["localidades"]:
                tendencias_dict[provincia]["localidades"][localidad] = {
                    "localidad": localidad,
                    "cantidad": 0,
                    "eventos": [],
                }

            tendencias_dict[provincia]["localidades"][localidad]["eventos"].append({
                "nombre": evento.nombre_evento,
                "tipo": evento.tipo_nombre,
                "distancia_km": float(evento.distancia_km or 0),
                "fecha_evento": evento.fecha_evento.strftime('%Y-%m-%d') if evento.fecha_evento else "Sin fecha",
                "estado": evento.id_estado,
                # ── CAMPO NUEVO: identificación de origen ──────────────────
                "organizador_nombre": evento.organizador_nombre,
                "organizador_tipo": "Admin/Supervisor" if evento.organizador_rol <= 2 else "Externo",
            })
            tendencias_dict[provincia]["localidades"][localidad]["cantidad"] += 1
            tendencias_dict[provincia]["total_eventos"] += 1

        tendencias_ubicacion = []
        for prov_data in tendencias_dict.values():
            prov_data["localidades"] = list(prov_data["localidades"].values())
            tendencias_ubicacion.append(prov_data)
        tendencias_ubicacion.sort(key=lambda x: x["total_eventos"], reverse=True)
        tendencias_ubicacion = tendencias_ubicacion[:10]

        # ── Retorno final ────────────────────────────────────────────────────
        return {
            # Métricas originales (sin cambios)
            "total_eventos": total_eventos,
            "eventos_por_tipo": eventos_por_tipo,
            "eventos_por_dificultad": eventos_por_dificultad,
            "eventos_por_estado": eventos_por_estado,
            "eventos_por_usuario": eventos_por_usuario,
            "eventos_por_mes": eventos_por_mes,
            "usuarios_total": usuarios_total,
            "usuarios_por_rol": usuarios_por_rol,
            "eventos_por_ubicacion": eventos_por_ubicacion,
            # ── NUEVOS campos para el Admin ──────────────────────────────────
            "recaudacion_total": recaudacion_total,
            "detalle_recaudacion": detalle_recaudacion,       # con organizador_nombre/tipo
            "total_inscripciones_sistema": total_inscripciones_sistema,
            "total_eventos_externos": total_eventos_externos,
            "top10_recaudacion": top10_recaudacion_lista,
            "nuevos_usuarios_por_mes": nuevos_usuarios_por_mes,
            "usuarios_acordeon": usuarios_acordeon,
            "tendencias_ubicacion": tendencias_ubicacion,     # con organizador_tipo por evento
        }

    # ══════════════════════════════════════════════════════════════════════════
    # REPORTE SUPERVISOR  (Rol 2)  — sin cambios
    # ══════════════════════════════════════════════════════════════════════════

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
            .filter(*filtros).group_by(TipoEvento.nombre).all()
        )
        eventos_por_tipo = [{"tipo": n, "cantidad": c} for n, c in resultados_tipo]

        resultados_dificultad = (
            db.query(NivelDificultad.nombre, func.count(Evento.id_evento))
            .join(NivelDificultad, Evento.id_dificultad == NivelDificultad.id_dificultad)
            .filter(*filtros).group_by(NivelDificultad.nombre).all()
        )
        eventos_por_dificultad = [{"dificultad": n, "cantidad": c} for n, c in resultados_dificultad]

        resultados_estado = db.query(Evento.id_estado, func.count(Evento.id_evento))\
            .filter(*filtros).group_by(Evento.id_estado).all()
        eventos_por_estado = [{"estado": e, "cantidad": c} for e, c in resultados_estado]

        resultados_mes = db.query(
            func.extract("year", Evento.fecha_evento).label("anio"),
            func.extract("month", Evento.fecha_evento).label("mes"),
            func.count(Evento.id_evento)
        ).filter(*filtros).group_by("anio", "mes").all()
        evolucion_mensual = [{"anio": int(a), "mes": int(m), "cantidad": c} for a, m, c in resultados_mes]

        resultados_solicitudes = (
            db.query(EstadoSolicitud.nombre, func.count(SolicitudPublicacion.id_solicitud))
            .join(SolicitudPublicacion,
                  EstadoSolicitud.id_estado_solicitud == SolicitudPublicacion.id_estado_solicitud)
            .group_by(EstadoSolicitud.nombre).all()
        )
        solicitudes_externas = [{"estado": n, "cantidad": c} for n, c in resultados_solicitudes]

        return {
            "eventos_por_tipo": eventos_por_tipo,
            "eventos_por_dificultad": eventos_por_dificultad,
            "eventos_por_estado": eventos_por_estado,
            "evolucion_mensual": evolucion_mensual,
            "solicitudes_externas": solicitudes_externas,
        }

    # ══════════════════════════════════════════════════════════════════════════
    # REPORTE ORGANIZACIÓN EXTERNA  (Rol 3)  — sin cambios
    # ══════════════════════════════════════════════════════════════════════════

    @staticmethod
    def reportes_organizacion_externa(db: Session, id_usuario: int):
        stats_base = ReporteService._get_mis_estadisticas(db, id_usuario)

        # ── Lista detallada de todos mis eventos ──────────────────────────────
        eventos_query = (
            db.query(
                Evento.id_evento,
                Evento.nombre_evento,
                Evento.fecha_evento,
                Evento.fecha_creacion,
                Evento.id_estado,
                Evento.costo_participacion,
                Evento.cupo_maximo,
                Evento.distancia_km,
                Evento.descripcion,
                Evento.ubicacion,
                TipoEvento.nombre.label("tipo_nombre"),
                func.count(ReservaEvento.id_reserva).label("total_reservas"),
            )
            .join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)
            .outerjoin(ReservaEvento, Evento.id_evento == ReservaEvento.id_evento)
            .filter(Evento.id_usuario == id_usuario)
            .group_by(Evento.id_evento, TipoEvento.nombre)
            .order_by(Evento.fecha_evento.desc())
            .all()
        )

        lista_eventos = [
            {
                "id": e.id_evento,
                "nombre": e.nombre_evento,
                "fecha": e.fecha_evento.strftime('%d/%m/%Y') if e.fecha_evento else "Sin fecha",
                "fecha_solicitud": e.fecha_creacion.strftime('%d/%m/%Y') if e.fecha_creacion else "Sin fecha",
                "fecha_creacion": e.fecha_creacion.strftime('%d/%m/%Y') if e.fecha_creacion else "Sin fecha",
                "fecha_evento": e.fecha_evento.strftime('%Y-%m-%d') if e.fecha_evento else "Sin fecha",
                "estado": e.id_estado,
                "estado_evento": e.id_estado,
                "tipo": e.tipo_nombre,
                "reservas": e.total_reservas,
                "cupo_maximo": e.cupo_maximo,
                "costo_participacion": float(e.costo_participacion or 0),
                "distancia_km": float(e.distancia_km or 0),
                "descripcion": e.descripcion or "",
                "ubicacion_completa": e.ubicacion or "",
            }
            for e in eventos_query
        ]

        # ── Popularidad por tipo (total inscriptos por categoría) ─────────────
        resultados_tipo = (
            db.query(TipoEvento.nombre, func.count(ReservaEvento.id_reserva))
            .join(Evento, Evento.id_tipo == TipoEvento.id_tipo)
            .outerjoin(ReservaEvento, Evento.id_evento == ReservaEvento.id_evento)
            .filter(Evento.id_usuario == id_usuario)
            .group_by(TipoEvento.nombre)
            .all()
        )
        rendimiento_tipo = [{"tipo": n, "cantidad": c} for n, c in resultados_tipo if c > 0]

        # ── Reservas confirmadas por evento (sub-query separada, sin CAST) ────
        #    Usamos case() de SQLAlchemy, que es compatible con todos los dialectos.
        confirmadas_subq = (
            db.query(
                ReservaEvento.id_evento,
                func.sum(
                    case((ReservaEvento.id_estado_reserva == 2, 1), else_=0)
                ).label("confirmadas"),
                func.count(ReservaEvento.id_reserva).label("total")
            )
            .join(Evento, ReservaEvento.id_evento == Evento.id_evento)
            .filter(Evento.id_usuario == id_usuario)
            .group_by(ReservaEvento.id_evento)
            .all()
        )
        confirmadas_map: dict = {
            row.id_evento: {
                "confirmadas": int(row.confirmadas or 0),
                "total": int(row.total or 0),
            }
            for row in confirmadas_subq
        }

        # ── Detalle de recaudación: TODOS los eventos (incluye gratuitos) ─────
        detalle_recaudacion = []
        total_recaudado = 0.0

        for e in eventos_query:
            costo = float(e.costo_participacion or 0)
            stats = confirmadas_map.get(
                e.id_evento,
                {"confirmadas": 0, "total": int(e.total_reservas or 0)},
            )
            inscriptos_confirmados = stats["confirmadas"]
            inscriptos_count = stats["total"]
            monto_evento = costo * inscriptos_confirmados
            total_recaudado += monto_evento

            detalle_recaudacion.append({
                "id_evento": e.id_evento,
                "nombre_evento": e.nombre_evento,
                "fecha_evento": e.fecha_evento.strftime('%Y-%m-%d') if e.fecha_evento else "Sin fecha",
                "monto": round(monto_evento, 2),
                "monto_unitario": costo,
                "inscriptos_count": inscriptos_count,
                "inscriptos_confirmados": inscriptos_confirmados,
                "cupo_maximo": e.cupo_maximo,
                "estado_evento": e.id_estado,
                "tipo": e.tipo_nombre,
                "descripcion": e.descripcion or "",
                "ubicacion_completa": e.ubicacion or "",
                "distancia_km": float(e.distancia_km or 0),
            })

        # ── Tendencias globales por ubicación ─────────────────────────────────
        eventos_globales = (
            db.query(
                Evento.nombre_evento,
                Evento.ubicacion,
                Evento.fecha_evento,
                Evento.id_estado,
                Evento.distancia_km,
                TipoEvento.nombre.label("tipo_nombre"),
            )
            .join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)
            .filter(Evento.id_estado.in_([3, 4]))
            .all()
        )

        tendencias_dict: dict = {}
        for evento in eventos_globales:
            # .strip().title() garantiza agrupación case-insensitive
            provincia = ReporteService._extraer_provincia(evento.ubicacion).strip().title()
            localidad = ReporteService._extraer_localidad(evento.ubicacion).strip().title()

            if provincia not in tendencias_dict:
                tendencias_dict[provincia] = {
                    "provincia": provincia,
                    "total_eventos": 0,
                    "localidades": {},
                }

            if localidad not in tendencias_dict[provincia]["localidades"]:
                tendencias_dict[provincia]["localidades"][localidad] = {
                    "localidad": localidad,
                    "cantidad": 0,
                    "eventos": [],
                }

            tendencias_dict[provincia]["localidades"][localidad]["eventos"].append({
                "nombre": evento.nombre_evento,
                "tipo": evento.tipo_nombre,
                "distancia_km": float(evento.distancia_km or 0),
                "fecha_evento": evento.fecha_evento.strftime('%Y-%m-%d') if evento.fecha_evento else "Sin fecha",
                "estado": evento.id_estado,
            })
            tendencias_dict[provincia]["localidades"][localidad]["cantidad"] += 1
            tendencias_dict[provincia]["total_eventos"] += 1

        tendencias_ubicacion = []
        for prov_data in tendencias_dict.values():
            prov_data["localidades"] = list(prov_data["localidades"].values())
            tendencias_ubicacion.append(prov_data)
        tendencias_ubicacion.sort(key=lambda x: x["total_eventos"], reverse=True)
        tendencias_ubicacion = tendencias_ubicacion[:10]

        return {
            "mis_eventos_total": stats_base["mis_eventos_total"],
            "mis_eventos_por_estado": stats_base["mis_eventos_por_estado"],
            "lista_eventos_detallada": lista_eventos,
            "rendimiento_por_tipo": rendimiento_tipo,
            "total_reservas_recibidas": sum(e["reservas"] for e in lista_eventos),
            "recaudacion_total": round(total_recaudado, 2),
            "detalle_recaudacion": detalle_recaudacion,
            "tendencias_ubicacion": tendencias_ubicacion,
        }

    # ══════════════════════════════════════════════════════════════════════════
    # REPORTE CLIENTE  (Rol 4)  — sin cambios
    # ══════════════════════════════════════════════════════════════════════════

    @staticmethod
    def reportes_cliente(db: Session, id_usuario: int):
        return {
            "mis_inscripciones": "Aquí iría la lógica de inscripciones del cliente",
            "mis_notificaciones": "Aquí iría la lógica de notificaciones del cliente",
        }

    # ══════════════════════════════════════════════════════════════════════════
    # NUEVO: Drill-down de un usuario individual (para el Modal "Ver más")
    # Llamado desde un endpoint dedicado: GET /reportes/usuario-detalle/{id_usuario}
    # ══════════════════════════════════════════════════════════════════════════

    @staticmethod
    def detalle_usuario_admin(db: Session, id_usuario_objetivo: int):
        """
        Retorna el perfil completo de un usuario para el modal de detalle del Admin.
        - Si es Organizador Externo (id_rol=3): lista sus eventos con fecha y estado.
        - Si es Cliente (id_rol=4): lista sus inscripciones con fecha y estado.
        - Si es Admin/Supervisor (id_rol<=2): lista eventos creados en el sistema.
        """
        usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario_objetivo).first()
        if not usuario:
            return None

        if usuario.id_rol <= 2:
            # Admin / Supervisor → eventos creados por él
            eventos = (
                db.query(
                    Evento.id_evento,
                    Evento.nombre_evento,
                    Evento.fecha_evento,
                    Evento.id_estado,
                    TipoEvento.nombre.label("tipo"),
                )
                .join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)
                .filter(Evento.id_usuario == id_usuario_objetivo)
                .order_by(Evento.fecha_evento.desc())
                .all()
            )
            items = [
                {
                    "id": e.id_evento,
                    "nombre": e.nombre_evento,
                    "fecha": e.fecha_evento.strftime('%Y-%m-%d') if e.fecha_evento else "Sin fecha",
                    "estado": e.id_estado,
                    "tipo": e.tipo,
                }
                for e in eventos
            ]
            categoria = "eventos_creados"

        elif usuario.id_rol == 3:
            # Organizador Externo → sus eventos
            eventos = (
                db.query(
                    Evento.id_evento,
                    Evento.nombre_evento,
                    Evento.fecha_evento,
                    Evento.id_estado,
                    TipoEvento.nombre.label("tipo"),
                )
                .join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)
                .filter(Evento.id_usuario == id_usuario_objetivo)
                .order_by(Evento.fecha_evento.desc())
                .all()
            )
            items = [
                {
                    "id": e.id_evento,
                    "nombre": e.nombre_evento,
                    "fecha": e.fecha_evento.strftime('%Y-%m-%d') if e.fecha_evento else "Sin fecha",
                    "estado": e.id_estado,
                    "tipo": e.tipo,
                }
                for e in eventos
            ]
            categoria = "eventos_creados"

        else:
            # Cliente → sus inscripciones
            inscripciones = (
                db.query(
                    ReservaEvento.id_reserva,
                    ReservaEvento.fecha_reserva,
                    ReservaEvento.id_estado_reserva,
                    Evento.nombre_evento,
                    Evento.fecha_evento,
                    TipoEvento.nombre.label("tipo"),
                )
                .join(Evento, ReservaEvento.id_evento == Evento.id_evento)
                .join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)
                .filter(ReservaEvento.id_usuario == id_usuario_objetivo)
                .order_by(ReservaEvento.fecha_reserva.desc())
                .all()
            )
            items = [
                {
                    "id": r.id_reserva,
                    "nombre": r.nombre_evento,
                    "fecha_evento": r.fecha_evento.strftime('%Y-%m-%d') if r.fecha_evento else "Sin fecha",
                    "fecha_reserva": r.fecha_reserva.strftime('%Y-%m-%d') if r.fecha_reserva else "Sin fecha",
                    "estado_reserva": r.id_estado_reserva,
                    "tipo": r.tipo,
                }
                for r in inscripciones
            ]
            categoria = "inscripciones"

        return {
            "id_usuario": usuario.id_usuario,
            "nombre": usuario.nombre_y_apellido,
            "email": usuario.email,
            "id_rol": usuario.id_rol,
            "fecha_creacion": usuario.fecha_creacion.strftime('%Y-%m-%d') if usuario.fecha_creacion else None,
            "categoria": categoria,
            "items": items,
        }