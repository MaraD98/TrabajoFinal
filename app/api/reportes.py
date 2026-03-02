from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.api.admin_eventos import get_current_user
from app.db.database import get_db
from app.services.reportes_services import ReporteService
from fastapi.responses import StreamingResponse
from io import StringIO
import csv

router = APIRouter(prefix="/reportes", tags=["Reportes"])

@router.get("/", summary="Obtener reportes según rol")
def obtener_reportes(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    anio: int = Query(None, description="Año para filtrar"),
    mes: int = Query(None, description="Mes para filtrar")
):
    rol = current_user.id_rol
    uid = current_user.id_usuario

    if rol == 1:
        # El Admin recibe su dashboard + la vista detallada global
        data_admin = ReporteService.reportes_admin(db, anio=anio, mes=mes)
        data_detallada = ReporteService.reportes_organizacion_externa(db, uid, rol)
        return {**data_admin, **data_detallada} # Fusionamos los diccionarios
    
    elif rol == 2:
        # El Supervisor recibe su dashboard + la vista detallada global
        data_super = ReporteService.reportes_supervisor(db, uid, anio=anio, mes=mes)
        data_detallada = ReporteService.reportes_organizacion_externa(db, uid, rol)
        return {**data_super, **data_detallada}
    
    elif rol == 3:
        return ReporteService.reportes_organizacion_externa(db, uid, rol)
    
    elif rol == 4:
        return ReporteService.reportes_cliente(db, uid)
    
    else:
        raise HTTPException(status_code=403, detail="Rol no autorizado")


# ── EXPORTACION DE REPORTES ──────────────────────────────────────────────────

@router.get("/export", summary="Exportar reportes en CSV")
def export_reportes(
    tipo: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    rol = current_user.id_rol
    uid = current_user.id_usuario

    # 1. Mapeo de roles permitidos (Agregamos los detallados para roles 1, 2 y 3)
    roles_permitidos = {
        "total_eventos": [1, 2],
        "eventos_por_estado": [1, 2, 3],
        "eventos_por_usuario": [1, 2],
        "eventos_por_mes": [1, 2],
        "usuarios_total": [1],
        "usuarios_por_rol": [1],
        "eventos_por_tipo": [1, 2, 3], 
        "eventos_por_dificultad": [1, 2], 
        "solicitudes_externas": [2],
        "mis_eventos_total": [3,4],
        "mis_eventos_por_estado": [1,2,3,4],
        "eventos_por_ubicacion": [1,2],
        "lista_eventos_detallada": [1,2,3],
        "tendencias_ubicacion_completa": [1, 3], # Admin y Org Externa
        "top_10_recaudacion": [1],               # Solo Admin
        "usuarios_nuevos": [1],                  # Solo Admin
        "lista_eventos_detallada": [1, 2, 3],     # Ahora el 1 también lo usa
        "analisis_organizadores": [1, 2],  
        "top_ocupacion": [1, 2],
        "dashboard_eventos": [1, 2],       
        "solicitudes_externas": [2],
        "mis_inscripciones": [4],
        # Nuevos agregados para que admin/super puedan exportarlos:
        "lista_eventos_detallada": [1, 2, 3],
        "detalle_recaudacion": [1, 2, 3],
        "tendencias_ubicacion": [1, 2, 3]
    }

    if tipo not in roles_permitidos:
        raise HTTPException(status_code=400, detail="Tipo de reporte no válido")
    
    if rol not in roles_permitidos[tipo]:
        raise HTTPException(status_code=403, detail="No tienes permisos para exportar este reporte")
    
    # 2. Obtención de datos centralizada y combinada
    data_completa = {}
    if rol == 1:
        data_completa = {**ReporteService.reportes_admin(db), **ReporteService.reportes_organizacion_externa(db, uid, rol)}
    elif rol == 2:
        data_completa = {**ReporteService.reportes_supervisor(db, uid), **ReporteService.reportes_organizacion_externa(db, uid, rol)}
    elif rol == 3:
        data_completa = ReporteService.reportes_organizacion_externa(db, uid, rol)
    elif rol == 4:
        data_completa = ReporteService.reportes_cliente(db, uid)

    # 3. Extracción de datos y fieldnames
    data = []
    fieldnames = []

    # Bloque Admin
    if tipo == "total_eventos":
        data = [{"total_eventos": data_completa.get("total_eventos", 0)}]
        fieldnames = ["total_eventos"]
    elif tipo == "eventos_por_estado":
        data = data_completa.get("eventos_por_estado", [])
        fieldnames = ["estado", "cantidad"]
    elif tipo == "eventos_por_usuario":
        data = data_completa.get("eventos_por_usuario", [])
        fieldnames = ["usuario", "cantidad"]
    elif tipo == "eventos_por_mes":
        data = data_completa.get("eventos_por_mes", [])
        fieldnames = ["anio", "mes", "cantidad"]
    elif tipo == "usuarios_total":
        data = [{"usuarios_total": data_completa.get("usuarios_total", 0)}]
        fieldnames = ["usuarios_total"]
    elif tipo == "usuarios_por_rol":
        data = data_completa.get("usuarios_por_rol", [])
        fieldnames = ["rol", "cantidad"]
    elif tipo == "eventos_por_tipo":
        data = data_completa.get("eventos_por_tipo", data_completa.get("rendimiento_por_tipo", []))
        fieldnames = ["tipo", "cantidad"]
    elif tipo == "eventos_por_dificultad":
        data = data_completa.get("eventos_por_dificultad", [])
        fieldnames = ["dificultad", "cantidad"]
    elif tipo == "eventos_por_ubicacion":
        data = data_completa.get("eventos_por_ubicacion", [])
        fieldnames = ["ubicacion", "cantidad"]

    # Bloque Supervisor
    elif tipo == "analisis_organizadores":
        data = data_completa.get("analisis_organizadores", [])
        fieldnames = ["id_usuario", "organizador", "email", "rol", "total_eventos", "activos", "finalizados", "recaudacion_total"]
    elif tipo == "top_ocupacion":
        data = data_completa.get("top_ocupacion", [])
        fieldnames = ["id_evento", "nombre_evento", "fecha_evento", "cupo_maximo", "inscriptos_pagos", "reservados_no_pagos", "total_ocupado", "tasa_ocupacion", "es_pago"]
    elif tipo == "dashboard_eventos":
        data = data_completa.get("dashboard_eventos", [])
        fieldnames = ["id_evento", "nombre_evento", "fecha_evento", "responsable", "estado", "pertenencia"]
    elif tipo == "solicitudes_externas": 
        data = data_completa.get("solicitudes_externas", [])
        fieldnames = ["estado", "cantidad"]

    # Bloque Organizacion Externa / Detallado (Ahora accesible por roles 1, 2 y 3)
    elif tipo == "lista_eventos_detallada":
        data = data_completa.get("lista_eventos_detallada", [])
        fieldnames = ["id", "nombre", "fecha_evento", "tipo", "reservas", "estado_evento", "cupo_maximo", "costo_participacion", "ubicacion_completa"]
    elif tipo == "detalle_recaudacion":
        data = data_completa.get("detalle_recaudacion", [])
        fieldnames = ["id_evento", "nombre_evento", "monto", "inscriptos_confirmados", "cupo_maximo"]
    elif tipo == "mis_eventos_por_estado":
        data = data_completa.get("mis_eventos_por_estado", [])
        fieldnames = ["estado", "cantidad"]

    # Bloque Cliente
    elif tipo == "eventos_por_ubicacion":
        data = data_completa.get("eventos_por_ubicacion", [])
        fieldnames = ["ubicacion", "cantidad"]
        
    # Nuevos exportables del Supervisor
    if current_user.id_rol == 2:
        reporte_super = ReporteService.reportes_supervisor(db, current_user.id_usuario)
        
    if tipo == "analisis_organizadores":
        data = reporte_super.get("analisis_organizadores", [])
        fieldnames = ["id_usuario", "organizador", "email", "rol", "total_eventos", "activos", "finalizados", "recaudacion_total"]

    elif tipo == "top_ocupacion":
        data = reporte_super.get("top_ocupacion", [])
        fieldnames = ["id_evento", "nombre_evento", "fecha_evento", "cupo_maximo", "inscriptos_pagos", "reservados_no_pagos", "total_ocupado", "tasa_ocupacion", "es_pago"]

    elif tipo == "dashboard_eventos":
        data = reporte_super.get("dashboard_eventos", [])
        fieldnames = ["id_evento", "nombre_evento", "fecha_evento", "responsable", "estado", "pertenencia"]

    elif tipo == "solicitudes_externas": 
        data = reporte_super.get("solicitudes_externas", [])
        fieldnames = ["estado", "cantidad"]

    # Desde aca empiezo con los reportes para organizacion externa
    elif tipo == "lista_eventos_detallada":
        data = data_completa.get("lista_eventos_detallada", [])
        fieldnames = ["id", "nombre", "fecha", "tipo", "reservas", "estado"]

    elif tipo == "tendencias_ubicacion_completa":
        if current_user.id_rol == 1:
            data = ReporteService.reportes_admin(db).get("tendencias_ubicacion_completa", [])
        else:
            data = ReporteService.reportes_organizacion_externa(db, current_user.id_usuario).get("tendencias_ubicacion", [])
        fieldnames = ["provincia", "total_eventos"] # Podés sumar más columnas si querés

    elif tipo == "top_10_recaudacion":
        data = ReporteService.reportes_admin(db).get("top_10_recaudacion", [])
        fieldnames = ["nombre", "fecha_evento", "tipo", "pertenencia", "organizador", "inscripciones_confirmadas", "monto_recaudado"]

    elif tipo == "usuarios_nuevos":
        data = ReporteService.reportes_admin(db).get("usuarios_nuevos", [])
        fieldnames = ["nombre", "email", "rol", "fecha_creacion", "cantidad_inscripciones", "cantidad_eventos_creados"]
    elif tipo == "mis_inscripciones":
        data = data_completa.get("mis_inscripciones", [])
        fieldnames = ["evento_nombre", "estado"]

    # 4. Generación del CSV
    output = StringIO()
    if data:
        writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(data)
    else:
        output.write("Sin datos disponibles para este reporte")
    
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={tipo}.csv"}
    )