import { useState, useEffect } from "react";
import { exportReporteCSV } from "../services/eventos";

import "../styles/reportes.css";

interface ReporteData {
  total_eventos?: number;
  eventos_por_estado?: { estado: number; cantidad: number }[];
  eventos_por_usuario?: { usuario: number; cantidad: number }[];
  eventos_por_mes?: { anio: number; mes: number; cantidad: number }[];
  usuarios_total?: number;
  usuarios_por_rol?: { rol: number; cantidad: number }[];
  eventos_por_tipo?: { tipo: string; cantidad: number }[];
  solicitudes_externas?: { estado: string; cantidad: number }[];
  mis_eventos_total?: number;
  mis_eventos_por_estado?: { estado: number; cantidad: number }[];
  mis_inscripciones?: any[];
  mis_notificaciones?: any[];
}

interface TarjetaReporte {
  id: string;
  titulo: string;
  descripcion: string;
  icono: string;
  color: string;
  rolesPermitidos: number[];
}

export default function ReportesPage() {
  const [reporteData, setReporteData] = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportando, setExportando] = useState<string | null>(null);

  // 1. LEER LOS DATOS REALES DEL LOCALSTORAGE
  const token = localStorage.getItem("token");
  const rolGuardado = localStorage.getItem("rol");
  const usuarioRol = rolGuardado ? Number(rolGuardado) : 0; // 0 significa sin rol/no logueado

  // 2. PRIMERA PROTECCIÓN: Si no hay token, no ejecutar nada más
  if (!token) {
    return (
      <div className="reportes-page">
        <div className="reportes-alert reportes-alert--error">
          <span className="reportes-alert__icon">🔒</span>
          <span className="reportes-alert__message">
            Debes iniciar sesión para acceder a los reportes.
          </span>
          <button onClick={() => window.location.href = "/login"} className="reportes-alert__retry">
            Ir al Login
          </button>
        </div>
      </div>
    );
  }

  // Definir los reportes disponibles según rol
  const reportesDisponibles: TarjetaReporte[] = [
    {
      id: "total_eventos",
      titulo: "Total de Eventos",
      descripcion: "Cantidad total de eventos registrados en el sistema",
      icono: "📊",
      color: "#ff6b35",
      rolesPermitidos: [2],
    },
    {
      id: "eventos_por_estado",
      titulo: "Eventos por Estado",
      descripcion: "Distribución de eventos según su estado actual",
      icono: "📈",
      color: "#ffa500",
      rolesPermitidos: [2, 3],
    },
    {
      id: "eventos_por_usuario",
      titulo: "Eventos por Usuario",
      descripcion: "Cantidad de eventos creados por cada usuario",
      icono: "👥",
      color: "#4caf50",
      rolesPermitidos: [2],
    },
    {
      id: "eventos_por_mes",
      titulo: "Eventos por Mes",
      descripcion: "Tendencia de eventos a lo largo del tiempo",
      icono: "📅",
      color: "#2196f3",
      rolesPermitidos: [2],
    },
    {
      id: "usuarios_total",
      titulo: "Total de Usuarios",
      descripcion: "Cantidad total de usuarios registrados",
      icono: "👤",
      color: "#9c27b0",
      rolesPermitidos: [1],
    },
    {
      id: "usuarios_por_rol",
      titulo: "Usuarios por Rol",
      descripcion: "Distribución de usuarios según su rol",
      icono: "🎭",
      color: "#e91e63",
      rolesPermitidos: [1],
    },
    {
      id: "eventos_por_tipo",
      titulo: "Eventos por Tipo",
      descripcion: "Clasificación de eventos según su tipo",
      icono: "🏃‍♂️",
      color: "#ff9800",
      rolesPermitidos: [2],
    },
    {
      id: "solicitudes_externas",
      titulo: "Solicitudes Externas",
      descripcion: "Estado de solicitudes externas pendientes",
      icono: "📧",
      color: "#00bcd4",
      rolesPermitidos: [2],
    },
    {
      id: "mis_eventos_total",
      titulo: "Mis Eventos",
      descripcion: "Total de eventos que has creado",
      icono: "🎯",
      color: "#ff6b35",
      rolesPermitidos: [2, 3, 4],
    },
    {
      id: "mis_eventos_por_estado",
      titulo: "Mis Eventos por Estado",
      descripcion: "Estado de tus eventos creados",
      icono: "📊",
      color: "#4caf50",
      rolesPermitidos: [2, 3, 4],
    },
    {
      id: "mis_inscripciones",
      titulo: "Mis Inscripciones",
      descripcion: "Eventos en los que estás inscrito",
      icono: "✅",
      color: "#2196f3",
      rolesPermitidos: [2, 3, 4],
    },
    {
      id: "mis_notificaciones",
      titulo: "Mis Notificaciones",
      descripcion: "Notificaciones recibidas",
      icono: "🔔",
      color: "#ffa500",
      rolesPermitidos: [2, 3, 4],
    },
  ];

  // 3. FILTRAR POR EL ROL REAL QUE VIENE DEL LOGIN
  const reportesFiltrados = reportesDisponibles.filter((reporte) =>
    reporte.rolesPermitidos.includes(usuarioRol)
  );

  useEffect(() => {
    cargarReportes();
  }, []);

  const cargarReportes = async () => {
    // 1. Verificación estricta del token
    const tokenActual = localStorage.getItem("token");
    if (!tokenActual || tokenActual === "undefined") {
        setError("Sesión inválida. Por favor, vuelve a loguearte.");
        setLoading(false);
        return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/reportes/", {
        headers: {
          Authorization: `Bearer ${tokenActual}`,
          "Content-Type": "application/json"
        },
      });
    // 3. Verificar si la respuesta es HTML en lugar de JSON
      const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
        throw new Error("El servidor no devolvió JSON. Revisa la URL de la API.");
      }

      // Si el servidor dice que el token no vale (401), mandarlo al login
      if (response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }

      if (!response.ok) throw new Error("Error al cargar reportes");
      
      const data = await response.json();
      setReporteData(data);
    } catch (err: any) {
      console.error("Error cargando reportes:", err);
      setError("No se pudieron cargar los reportes");
    } finally {
      setLoading(false);
    }
  };

  const handleExportarCSV = async (tipo: string) => {
    const tokenParaExportar = localStorage.getItem("token"); // Siempre leer el más reciente
    if (!tokenParaExportar) {
        alert("Sesión expirada. Por favor, inicia sesión de nuevo.");
        window.location.href = "/login";
        return;
    }
    
    try {
      setExportando(tipo);
      await exportReporteCSV(tipo, token);
    } catch (err) {
      console.error("Error exportando CSV:", err);
      alert("Error al exportar el reporte");
    } finally {
      setExportando(null);
    }
  };

  const obtenerValorReporte = (id: string): string | number => {
    if (!reporteData) return "N/A";
    
    switch (id) {
      case "total_eventos":
        return reporteData.total_eventos || 0;
      case "eventos_por_estado":
        return reporteData.eventos_por_estado?.length || 0;
      case "eventos_por_usuario":
        return reporteData.eventos_por_usuario?.length || 0;
      case "eventos_por_mes":
        return reporteData.eventos_por_mes?.length || 0;
      case "usuarios_total":
        return reporteData.usuarios_total || 0;
      case "usuarios_por_rol":
        return reporteData.usuarios_por_rol?.length || 0;
      case "eventos_por_tipo":
        return reporteData.eventos_por_tipo?.length || 0;
      case "solicitudes_externas":
        return reporteData.solicitudes_externas?.length || 0;
      case "mis_eventos_total":
        return reporteData.mis_eventos_total || 0;
      case "mis_eventos_por_estado":
        return reporteData.mis_eventos_por_estado?.length || 0;
      case "mis_inscripciones":
        return reporteData.mis_inscripciones?.length || 0;
      case "mis_notificaciones":
        return reporteData.mis_notificaciones?.length || 0;
      default:
        return "N/A";
    }
  };

  if (loading) {
    return (
      <div className="reportes-page">
        <div className="reportes-loading">
          <div className="spinner-large"></div>
          <p>Cargando reportes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reportes-page">
      <div className="reportes-page__container">
        <div className="reportes-header">
          <div className="reportes-header__content">
            <h1 className="reportes-header__title">Reportes y Estadísticas</h1>
            <p className="reportes-header__subtitle">
              Visualiza y exporta información clave de la plataforma
            </p>
          </div>
          <button onClick={cargarReportes} className="reportes-header__refresh">
            <span className="refresh-icon">↻</span>
            Actualizar
          </button>
        </div>

        {error && (
          <div className="reportes-alert reportes-alert--error">
            <span className="reportes-alert__icon">⚠️</span>
            <span className="reportes-alert__message">{error}</span>
            <button onClick={cargarReportes} className="reportes-alert__retry">
              Reintentar
            </button>
          </div>
        )}

        <div className="reportes-grid">
          {reportesFiltrados.map((reporte) => (
            <div
              key={reporte.id}
              className="reporte-card"
              style={{ "--card-color": reporte.color } as React.CSSProperties}
            >
              <div className="reporte-card__header">
                <div className="reporte-card__icon">{reporte.icono}</div>
                <div className="reporte-card__info">
                  <h3 className="reporte-card__title">{reporte.titulo}</h3>
                  <p className="reporte-card__description">
                    {reporte.descripcion}
                  </p>
                </div>
              </div>

              <div className="reporte-card__body">
                <div className="reporte-card__valor">
                  {obtenerValorReporte(reporte.id)}
                </div>
              </div>

              <div className="reporte-card__footer">
                <button
                  onClick={() => handleExportarCSV(reporte.id)}
                  className="reporte-card__export"
                  disabled={exportando === reporte.id}
                >
                  {exportando === reporte.id ? (
                    <>
                      <span className="mini-spinner"></span>
                      Exportando...
                    </>
                  ) : (
                    <>
                      <span className="export-icon">📥</span>
                      Exportar CSV
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {reportesFiltrados.length === 0 && (
          <div className="reportes-empty">
            <div className="reportes-empty__icon">📊</div>
            <h2 className="reportes-empty__title">No hay reportes disponibles</h2>
            <p className="reportes-empty__message">
              No tienes permisos para visualizar reportes en este momento
            </p>
          </div>
        )}

        <div className="reportes-info">
          <div className="reportes-info__card">
            <h3 className="reportes-info__title">💡 Información</h3>
            <ul className="reportes-info__list">
              <li>Los reportes se actualizan en tiempo real</li>
              <li>Puedes exportar cualquier reporte a formato CSV</li>
              <li>Los datos exportados incluyen toda la información detallada</li>
              <li>Los permisos dependen de tu rol en el sistema</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}