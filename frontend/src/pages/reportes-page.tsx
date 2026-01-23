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


export default function ReportesPage() {
  const [reporteData, setReporteData] = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportando, setExportando] = useState<string | null>(null);

  // 1. DATOS DE SESIÓN Y ROL
  const token = localStorage.getItem("token");
  const rolGuardado = localStorage.getItem("rol");
  const usuarioRol = rolGuardado ? Number(rolGuardado) : 0; // 0 significa sin rol/no logueado

  useEffect(() => {
    if (token && token !== "undefined") {
      cargarReportes();
    } else {
      setLoading(false);
    }
  }, [token]);

  // --- PROTECCIÓN DE ACCESO ---
  if (!token || token === "undefined") {
    return (
      <div className="reportes-page">
        <div className="reportes-alert reportes-alert--error">
          <span className="reportes-alert__icon">🔒</span>
          <span className="reportes-alert__message">Debes iniciar sesión para acceder a los reportes.</span>
          <button onClick={() => window.location.href = "/login"} className="reportes-alert__retry">Ir al Login</button>
        </div>
      </div>
    );
  }

  const cargarReportes = async () => {
    try {
      setLoading(true);
      setError(null);

      const baseUrl = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${baseUrl}/reportes/`, {      
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      // Evitar error de JSON si devuelve HTML (<!doctype)
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("El servidor devolvió una respuesta no válida (HTML). Verifica la ruta de la API.");
      }

      // Si el servidor dice que el token no vale (401), mandarlo al login
      if (response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }

      if (!response.ok) throw new Error("Error en la respuesta del servidor");
      
      const data = await response.json();
      setReporteData(data);
    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message || "Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleExportarCSV = async (tipo: string) => {
    try {
      setExportando(tipo);
      await exportReporteCSV(tipo, token || "");
    } catch (err) {
      alert("Error al exportar");
    } finally {
      setExportando(null);
    }
  };

  // --- FORMATEADORES ---
  const getNombreEstado = (id: number) => ({ 1: "Pendiente", 2: "Aprobado", 3: "Rechazado", 4: "Cancelado" }[id] || `Estado ${id}`);
  const getNombreRol = (id: number) => ({ 1: "Admin", 2: "Supervisor", 3: "Operario", 4: "Cliente" }[id] || `Rol ${id}`);
  const getNombreMes = (mes: number) => ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][mes - 1] || mes.toString();

  // --- MÉTODOS DE RENDERIZADO DE GRÁFICOS ---
  
  const renderGraficoBarras = (data: any[], labelKey: string, valueKey: string, getLabelFn?: (val: any) => string) => {
    if (!data || data.length === 0) return <p>Sin datos</p>;
    const maxValue = Math.max(...data.map(item => item[valueKey]));
    return (
      <div className="grafico-barras">
        {data.map((item, index) => (
          <div key={index} className="grafico-barras__item">
            <div className="grafico-barras__label">{getLabelFn ? getLabelFn(item[labelKey]) : item[labelKey]}</div>
            <div className="grafico-barras__bar-container">
              <div className="grafico-barras__bar" style={{ width: `${(item[valueKey] / maxValue) * 100}%` }}>
                <span className="grafico-barras__valor">{item[valueKey]}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderGraficoLinea = (data: any[]) => {
  if (!data || data.length === 0) return <p>Sin datos</p>;

  // 1. ORDENAR CRONOLÓGICAMENTE
  const dataOrdenada = [...data].sort((a, b) => {
    // Si el año es distinto, ordena por año
    if (a.anio !== b.anio) return a.anio - b.anio;
    // Si el año es igual, ordena por mes
    return a.mes - b.mes;
  });

  const maxValue = Math.max(...dataOrdenada.map(item => item.cantidad), 1);

  return (
    <div className="grafico-linea">
      <div className="grafico-linea__grid">
        {dataOrdenada.map((item, index) => (
          <div key={index} className="grafico-linea__columna">
            <span style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>
              {item.cantidad}
            </span>
            <div 
              className="grafico-linea__barra" 
              style={{ height: `${(item.cantidad / maxValue) * 80}%` }}
            ></div>
            <div className="grafico-linea__label">
              {getNombreMes(item.mes)} <br/> {item.anio}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

  const renderGraficoPie = (data: any[], labelKey: string, valueKey: string, getLabelFn?: (val: any) => string) => {
    if (!data || data.length === 0) return <p>Sin datos</p>;
    const total = data.reduce((sum, item) => sum + item[valueKey], 0);
    const colores = ["#ff6b35", "#ffa500", "#4caf50", "#2196f3", "#9c27b0"];
    return (
      <div className="grafico-pie">
        {data.map((item, index) => (
          <div key={index} className="grafico-pie__item">
            <div className="grafico-pie__color" style={{ backgroundColor: colores[index % colores.length] }}></div>
            <div className="grafico-pie__info">
              <span className="grafico-pie__label">{getLabelFn ? getLabelFn(item[labelKey]) : item[labelKey]}</span>
              <span className="grafico-pie__valor">{item[valueKey]} ({((item[valueKey]/total)*100).toFixed(1)}%)</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <div className="reportes-page"><div className="spinner-large"></div><p>Cargando datos...</p></div>;

  return (
    <div className="reportes-page">
      <div className="reportes-page__container">
        <div className="reportes-header">
          <div>
            <h1 className="reportes-header__title">Panel de Control y Reportes</h1>
            <p className="reportes-header__subtitle">Información analítica del sistema</p>
          </div>
          <button onClick={cargarReportes} className="reportes-header__refresh">↻ Actualizar</button>
        </div>

        {error && <div className="reportes-alert reportes-alert--error">⚠️ {error}</div>}

        {/* TARJETAS RESUMEN */}
        <div className="reportes-resumen">
          <div className="stat-card stat-card--primary">
            <div className="stat-card__valor">{reporteData?.total_eventos || 0}</div>
            <div className="stat-card__label">Total Eventos</div>
          </div>
          <div className="stat-card stat-card--success">
            <div className="stat-card__valor">{reporteData?.usuarios_total || 0}</div>
            <div className="stat-card__label">Usuarios</div>
          </div>
          <div className="stat-card stat-card--info">
            <div className="stat-card__valor">{reporteData?.mis_eventos_total || 0}</div>
            <div className="stat-card__label">Mis Eventos</div>
          </div>
        </div>

        {/* SECCIÓN DE GRÁFICOS */}
        <div className="reportes-graficos">
          
          {/* Eventos por Mes (Línea) - Admin/Supervisor */}
          {(usuarioRol <= 2) && reporteData?.eventos_por_mes && (
            <div className="grafico-card grafico-card--wide">
              <div className="grafico-card__header">
                <h3>📅 Tendencia Mensual de Eventos</h3>
                <button onClick={() => handleExportarCSV("eventos_por_mes")}>📥 CSV</button>
              </div>
              <div className="grafico-card__body">{renderGraficoLinea(reporteData.eventos_por_mes)}</div>
            </div>
          )}

          {/* Usuarios por Rol (Pie) - Solo Admin */}
          {usuarioRol === 1 && reporteData?.usuarios_por_rol && (
            <div className="grafico-card">
              <div className="grafico-card__header">
                <h3>🎭 Usuarios por Rol</h3>
                <button onClick={() => handleExportarCSV("usuarios_por_rol")}>📥 CSV</button>
              </div>
              <div className="grafico-card__body">{renderGraficoPie(reporteData.usuarios_por_rol, "rol", "cantidad", getNombreRol)}</div>
            </div>
          )}

          {/* Mis Eventos por Estado (Barras) - Todos */}
          {reporteData?.mis_eventos_por_estado && (
            <div className="grafico-card">
              <div className="grafico-card__header">
                <h3>📊 Mi Actividad por Estado</h3>
                <button onClick={() => handleExportarCSV("mis_eventos_por_estado")}>📥 CSV</button>
              </div>
              <div className="grafico-card__body">{renderGraficoBarras(reporteData.mis_eventos_por_estado, "estado", "cantidad", getNombreEstado)}</div>
            </div>
          )}

          {/* Eventos por Tipo (Pie) */}
          {(usuarioRol <= 2) && reporteData?.eventos_por_tipo && (
            <div className="grafico-card">
              <div className="grafico-card__header">
                <h3>🏃‍♂️ Eventos por Tipo</h3>
                <button onClick={() => handleExportarCSV("eventos_por_tipo")}>📥 CSV</button>
              </div>
              <div className="grafico-card__body">{renderGraficoPie(reporteData.eventos_por_tipo, "tipo", "cantidad")}</div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}