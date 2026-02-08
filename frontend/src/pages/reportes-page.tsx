import { useState, useEffect } from "react";
import { exportReporteCSV, getReporteGeneral } from "../services/eventos"; 
import "../styles/reportes.css";
import { Navbar } from "../components/navbar";
import { Footer } from "../components/footer";
import { useAuth } from "../context/auth-context";

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
  const token = localStorage.getItem("token") || "";
  const rolGuardado = localStorage.getItem("rol");
  const usuarioRol = rolGuardado ? Number(rolGuardado) : 0; // 0 significa sin rol/no logueado

  // ... Para el menu desplegable ...
    const { loadingAuth } = useAuth();

  // CARGAR REPORTES
  useEffect(() => {
    if (!loadingAuth && token) {
      cargarReportes();
    } else if (!loadingAuth && !token) {
      setLoading(false);
    }
  }, [token, loadingAuth]);

  const cargarReportes = async () => {
    try {
      setLoading(true);
      const data = await getReporteGeneral(token || "");
      setReporteData(data);
    } catch (err: any) {
      setError(err.response?.status === 401 ? "Sesión expirada" : "Error al cargar reportes");
    } finally {
      setLoading(false);
    }
  };

  const handleExportarCSV = async (tipo: string) => {
    try {
      setExportando(tipo); // Bloquea el botón específico
      await exportReporteCSV(tipo, token);
    } catch (err) {
      alert("Error al exportar el reporte CSV");
    } finally {
      setExportando(null); // Desbloquea
    }
  };

  // --- FORMATEADORES ---
  const getNombreEstado = (id: number) => ({ 1: "Pendiente", 2: "Aprobado", 3: "Rechazado", 4: "Cancelado" }[id] || `Estado ${id}`);
  const getNombreRol = (id: number) => ({ 1: "Admin", 2: "Supervisor", 3: "Operario", 4: "Cliente" }[id] || `Rol ${id}`);
  const getNombreMes = (mes: number) => ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][mes - 1] || mes.toString();

  // --- MÉTODOS DE RENDERIZADO DE GRÁFICOS ---
  const renderGraficoBarras = (data: any[], labelKey: string, valueKey: string, getLabelFn?: (val: any) => string) => {
    if (!data || data.length === 0) return <p className="no-data">Sin datos disponibles</p>;
    const maxValue = Math.max(...data.map(item => item[valueKey]), 1);
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
    if (!data || data.length === 0) return <p className="no-data">Sin datos disponibles</p>;
    const dataOrdenada = [...data].sort((a, b) => a.anio !== b.anio ? a.anio - b.anio : a.mes - b.mes);
    const maxValue = Math.max(...dataOrdenada.map(item => item.cantidad), 1);

    return (
      <div className="grafico-linea">
        <div className="grafico-linea__grid">
          {dataOrdenada.map((item, index) => (
            <div key={index} className="grafico-linea__columna">
              <span className="grafico-linea__count">{item.cantidad}</span>
              <div className="grafico-linea__barra" style={{ height: `${(item.cantidad / maxValue) * 80}%` }}></div>
              <div className="grafico-linea__label">{getNombreMes(item.mes)}<br/>{item.anio}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderGraficoPie = (data: any[], labelKey: string, valueKey: string, getLabelFn?: (val: any) => string) => {
    if (!data || data.length === 0) return <p className="no-data">Sin datos disponibles</p>;
    const total = data.reduce((sum, item) => sum + item[valueKey], 0);
    const colores = ["#ff6b35", "#ffa500", "#4caf50", "#2196f3", "#9c27b0"];
    return (
      <div className="grafico-pie">
        {data.map((item, index) => (
          <div key={index} className="grafico-pie__item">
            <div className="grafico-pie__color" style={{ backgroundColor: colores[index % colores.length] }}></div>
            <div className="grafico-pie__info">
              <span className="grafico-pie__label">{getLabelFn ? getLabelFn(item[labelKey]) : item[labelKey]}</span>
              <span className="grafico-pie__valor">{item[valueKey]} ({((item[valueKey] / (total || 1)) * 100).toFixed(1)}%)</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // --- PROTECCIÓN ---
  // Si está cargando, mostramos el spinner PRIMERO
  if (loadingAuth || loading) {
  return (
    <div className="reportes-page"> 
      <div className="reportes-loading">
        <div className="spinner-large"></div>
        <p>Cargando panel...</p>
      </div>
    </div>
    );
  }

  // Si después de cargar, el token sigue sin existir, mostramos el bloqueo
  if (!token || token === "undefined" || token === "null") {
    return (
      <div className="reportes-page">
        <div className="reportes-alert reportes-alert--error">
          <span className="reportes-alert__icon">🔒</span>
          <span className="reportes-alert__message">Debes iniciar sesión para acceder.</span>
          <button onClick={() => window.location.href = "/login"} className="reportes-alert__retry">Ir al Login</button>
        </div>
      </div>
    );
  }

  // Lógica extra: Contar pendientes para la alerta
  const pendientesCount = reporteData?.eventos_por_estado?.find(e => e.estado === 1)?.cantidad || 0;

  return (
    <div className="reportes-page">
      <Navbar />

      <div className="reportes-page__container">
        {/* HEADER */}
        <div className="reportes-header">
          <div>
            <h1 className="reportes-header__title">Panel de Control y Reportes</h1>
            <p className="reportes-header__subtitle">Gestión centralizada de datos</p>
          </div>
          <button onClick={cargarReportes} className="reportes-header__refresh">↻ Actualizar Datos</button>
        </div>

        {/* ALERTAS DINÁMICAS */}
        {error && <div className="reportes-alert reportes-alert--error">⚠️ {error}</div>}
        {usuarioRol <= 2 && pendientesCount > 0 && (
          <div className="reportes-alert reportes-alert--warning">
            🔔 Tienes <strong>{pendientesCount}</strong> eventos pendientes de revisión.
          </div>
        )}

        {/* TARJETAS RESUMEN */}
        <div className="reportes-resumen">
          <div className="stat-card stat-card--primary">
            <div className="stat-card__valor">{reporteData?.total_eventos || 0}</div>
            <div className="stat-card__label">Total Eventos Sistema</div>
          </div>
          <div className="stat-card stat-card--success">
            <div className="stat-card__valor">{reporteData?.usuarios_total || 0}</div>
            <div className="stat-card__label">Usuarios Registrados</div>
          </div>
          <div className="stat-card stat-card--info">
            <div className="stat-card__valor">{reporteData?.mis_eventos_total || 0}</div>
            <div className="stat-card__label">Mis Eventos Creados</div>
          </div>
        </div>

        {/* SECCIÓN DE GRÁFICOS GRID */}
        <div className="reportes-graficos">
          
          {/* 1. Tendencia Mensual (Ancho completo) */}
          {(usuarioRol <= 2) && reporteData?.eventos_por_mes && (
            <div className="grafico-card grafico-card--wide">
              <div className="grafico-card__header">
                <h3>📅 Tendencia Mensual de Eventos</h3>
                <button 
                  disabled={exportando === "eventos_por_mes"}
                  onClick={() => handleExportarCSV("eventos_por_mes")}
                  className="btn-export"
                >
                  {exportando === "eventos_por_mes" ? "Generando..." : "📥 CSV"}
                </button>
              </div>
              <div className="grafico-card__body">{renderGraficoLinea(reporteData.eventos_por_mes)}</div>
            </div>
          )}

          {/* 2. Usuarios por Rol */}
          {usuarioRol === 1 && reporteData?.usuarios_por_rol && (
            <div className="grafico-card">
              <div className="grafico-card__header">
                <h3>🎭 Distribución por Roles</h3>
                <button 
                  disabled={exportando === "usuarios_por_rol"}
                  onClick={() => handleExportarCSV("usuarios_por_rol")}
                  className="btn-export"
                >
                  {exportando === "usuarios_por_rol" ? "..." : "📥 CSV"}
                </button>
              </div>
              <div className="grafico-card__body">{renderGraficoPie(reporteData.usuarios_por_rol, "rol", "cantidad", getNombreRol)}</div>
            </div>
          )}

          {/* 3. Mis Eventos por Estado */}
          {reporteData?.mis_eventos_por_estado && (
            <div className="grafico-card">
              <div className="grafico-card__header">
                <h3>📊 Mi Actividad (Estados)</h3>
                <button 
                  disabled={exportando === "mis_eventos_por_estado"}
                  onClick={() => handleExportarCSV("mis_eventos_por_estado")}
                  className="btn-export"
                >
                  {exportando === "mis_eventos_por_estado" ? "..." : "📥 CSV"}
                </button>
              </div>
              <div className="grafico-card__body">{renderGraficoBarras(reporteData.mis_eventos_por_estado, "estado", "cantidad", getNombreEstado)}</div>
            </div>
          )}

          {/* 4. Eventos por Tipo */}
          {(usuarioRol <= 2) && reporteData?.eventos_por_tipo && (
            <div className="grafico-card">
              <div className="grafico-card__header">
                <h3>🏃‍♂️ Categorías de Eventos</h3>
                <button 
                  disabled={exportando === "eventos_por_tipo"}
                  onClick={() => handleExportarCSV("eventos_por_tipo")}
                  className="btn-export"
                >
                  {exportando === "eventos_por_tipo" ? "..." : "📥 CSV"}
                </button>
              </div>
              <div className="grafico-card__body">{renderGraficoPie(reporteData.eventos_por_tipo, "tipo", "cantidad")}</div>
            </div>
          )}

          {/* 5. Historial/Auditoría (Placeholder para futura tabla) */}
          {(usuarioRol <= 2) && (
            <div className="grafico-card">
              <div className="grafico-card__header">
                <h3>🕵️ Auditoría de Cambios</h3>
                <button 
                  disabled={exportando === "auditoria"}
                  onClick={() => handleExportarCSV("auditoria")}
                  className="btn-export"
                >
                  {exportando === "auditoria" ? "..." : "📥 CSV"}
                </button>
              </div>
              <div className="grafico-card__body">
                 <p style={{fontSize: '0.9rem', color: '#e0e0e0'}}>
                   Registro de intervenciones realizadas por administradores en eventos de terceros.
                 </p>
                 <div className="audit-badge">Auditoría Activa</div>
              </div>
            </div>
          )}

        </div>
      </div>
      <Footer />
    </div>
  );
}