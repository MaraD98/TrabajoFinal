import { useState, useEffect, useRef } from "react"; // 1. Agregamos useRef
import "../styles/reportes.css";
import { Navbar } from "../components/navbar";
import { Footer } from "../components/footer";
import { useAuth } from "../context/auth-context";
import { getReporteGeneral, exportReporteCSV } from "../services/eventos";

// 2. Importamos las librerías para PDF
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface ReporteData {
  total_eventos?: number;
  eventos_por_estado?: { estado: number; cantidad: number }[];
  eventos_por_usuario?: { usuario: number; cantidad: number }[];
  eventos_por_mes?: { anio: number; mes: number; cantidad: number }[];
  usuarios_total?: number;
  usuarios_por_rol?: { rol: number; cantidad: number }[];
  eventos_por_tipo?: { tipo: string; cantidad: number }[];
  eventos_por_dificultad?: { dificultad: string; cantidad: number }[]; 
  solicitudes_externas?: { estado: string; cantidad: number }[];
  mis_eventos_total?: number;
  mis_eventos_por_estado?: { estado: number; cantidad: number }[];
  mis_inscripciones?: any[];
  mis_notificaciones?: any[];
  eventos_por_ubicacion?: { ubicacion: string; cantidad: number }[];
  // NUEVOS CAMPOS ROL 3
  lista_eventos_detallada?: {
    id: number;
    nombre: string;
    fecha: string;
    estado: number;
    tipo: string;
    reservas: number;
  }[];
  rendimiento_por_tipo?: { tipo: string; cantidad: number }[];
  total_reservas_recibidas?: number;
}

export default function ReportesPage() {
  const [reporteData, setReporteData] = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportando, setExportando] = useState<string | null>(null);
  const [estadoAbierto, setEstadoAbierto] = useState<number | null>(null);

  // Filtros para la consulta
  const [anioFiltro, setAnioFiltro] = useState<string>("");
  const [mesFiltro, setMesFiltro] = useState<string>("");

  // 3. Referencia al contenedor que queremos imprimir
  const reporteRef = useRef<HTMLDivElement>(null);  
  
  // ✅ CAMBIO CLAVE: Usamos getToken y user del contexto en lugar de localStorage directo
  const { user, getToken, loadingAuth } = useAuth();
  
  // Obtenemos el rol dinámicamente del usuario logueado
  const usuarioRol = user?.id_rol || 0;

  // CARGAR REPORTES
  useEffect(() => {
    // Solo intentamos cargar si el AuthContext terminó de inicializarse
    if (!loadingAuth) {
      const currentToken = getToken();
      if (currentToken) {
        cargarReportes(currentToken);
      } else {
        setLoading(false);
      }
    }
  }, [loadingAuth, getToken, anioFiltro, mesFiltro]);

  const cargarReportes = async (tokenParaCargar?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Usamos el token que viene por parámetro o lo buscamos en el momento
      const token = tokenParaCargar || getToken();
      
      if (!token) {
        setError("No se encontró una sesión activa.");
        return;
      }

      // ✅ CORRECCIÓN AQUÍ: Pasamos los filtros de forma que el backend no reciba strings vacíos
      // Usamos "" para el tipo (que es el primer parámetro en tu service actual)
      const data = await getReporteGeneral(
      token, 
      anioFiltro ? parseInt(anioFiltro) : undefined, 
      mesFiltro ? parseInt(mesFiltro) : undefined
    );
      setReporteData(data);
    } catch (err: any) {
      console.error("Error en reportes:", err);
      setError(err.response?.status === 401 ? "Sesión expirada" : "Error al cargar reportes");
    } finally {
      setLoading(false);
    }
  };

  const handleExportarCSV = async (tipo: string) => {
    try {
      const token = getToken();
      if (!token) return alert("Sesión no válida");
      
      setExportando(tipo); 
      await exportReporteCSV(tipo, token);
    } catch (err) {
      alert("Error al exportar el reporte CSV");
    } finally {
      setExportando(null); 
    }
  };

  // 4. NUEVA FUNCIÓN: Descargar PDF
  const handleDescargarPDF = async () => {
    const input = reporteRef.current;
    if (!input) return;

    try {
      setExportando("pdf"); // Usamos este estado para mostrar feedback visual en el botón
      
      // Capturamos el contenido como imagen
      const canvas = await html2canvas(input, { 
        scale: 2, // Mejora la resolución
        backgroundColor: "#000000" // Asegura fondo negro
      });
      
      const imgData = canvas.toDataURL("image/png");
      
      // Creamos el PDF (A4 vertical, medidas en mm)
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      // Calculamos dimensiones para ajustar la imagen al PDF
      const imgProps = pdf.getImageProperties(imgData);
      const pdfImgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      // Agregamos la imagen al PDF (con un pequeño margen superior)
      pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfImgHeight);
      
      pdf.save("reporte-panel-control.pdf");
      
    } catch (err) {
      console.error("Error al generar PDF", err);
      alert("No se pudo generar el PDF");
    } finally {
      setExportando(null);
    }
  };

  // --- FORMATEADORES ---
  const getNombreEstado = (id: number) => ({ 1: "Borrador", 2: "Pendiente", 3: "Publicado", 4: "Finalizado", 5: "Cancelado", 6: "Depurado por Admin" }[id] || `Estado ${id}`);
  const getNombreRol = (id: number) => ({ 1: "Admin", 2: "Supervisor", 3: "Operario", 4: "Cliente" }[id] || `Rol ${id}`);
  const getNombreMes = (mes: number) => ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][mes - 1] || mes.toString();


  // --- GRAFICOS RENDERIZADOS ---
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

  // --- 2. NUEVO RENDERIZADOR PARA UBICACIONES (Barras Horizontales) ---
  const renderRankingHorizontal = (data: any[], labelKey: string, valueKey: string) => {
    if (!data || data.length === 0) return <p className="no-data">Sin datos de ubicación</p>;
    // Ordenamos de mayor a menor y tomamos top 10 para visualización
    const dataSorted = [...data].sort((a, b) => b[valueKey] - a[valueKey]).slice(0, 10);
    const maxValue = Math.max(...dataSorted.map(d => d[valueKey]), 1);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
        {dataSorted.map((item, index) => (
          <div key={index} style={{ display: 'flex', flexDirection: 'column', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ fontWeight: 500, color: '#e0e0e0' }}>{item[labelKey]}</span>
              <span style={{ fontWeight: 'bold', color: '#4ade80' }}>{item[valueKey]}</span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: '#333', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ 
                width: `${(item[valueKey] / maxValue) * 100}%`, 
                height: '100%', 
                backgroundColor: '#4ade80',
                borderRadius: '4px' 
              }}></div>
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

  const renderGraficoTorta = (data: any[], labelKey: string, valueKey: string) => {
  if (!data || data.length === 0) return <p className="no-data">Sin datos disponibles</p>;

  const total = data.reduce((sum, item) => sum + item[valueKey], 0);
  const colores = ["#ff6b35", "#4ade80", "#60a5fa", "#fbbf24", "#a78bfa", "#d63a3a"];
  
  const size = 180; 
  const center = size / 2;
  const radius = 80;
  let currentAngle = -90; 

  return (
    <div className="grafico-pie-flex-container" style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
      
      {/* EL CÍRCULO CON NÚMEROS ADENTRO */}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        {data.map((item, index) => {
          const valor = item[valueKey];
          const angleRange = (valor / total) * 360;
          const startAngle = currentAngle;
          const endAngle = currentAngle + angleRange;
          const middleAngle = startAngle + angleRange / 2;

          // Coordenadas del arco
          const x1 = center + radius * Math.cos((Math.PI * startAngle) / 180);
          const y1 = center + radius * Math.sin((Math.PI * startAngle) / 180);
          const x2 = center + radius * Math.cos((Math.PI * endAngle) / 180);
          const y2 = center + radius * Math.sin((Math.PI * endAngle) / 180);
          
          // Coordenada del texto (posicionado al 65% del radio para que esté ADENTRO)
          const textRadius = radius * 0.65; 
          const tx = center + textRadius * Math.cos((Math.PI * middleAngle) / 180);
          const ty = center + textRadius * Math.sin((Math.PI * middleAngle) / 180);

          const largeArcFlag = angleRange > 180 ? 1 : 0;
          const pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
          currentAngle += angleRange;

          return (
            <g key={index}>
              <path d={pathData} fill={colores[index % colores.length]} stroke="#1a1a1a" strokeWidth="1" />
              <text x={tx} y={ty} fill="white" fontSize="14" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle">
                {valor}
              </text>
            </g>
          );
        })}
        <circle cx={center} cy={center} r={radius * 0.35} fill="#1a1a1a" /> {/* Agujero central para estética */}
      </svg>

      {/* LA LEYENDA RECUPERADA (Con porcentaje y cantidad) */}
      <div className="grafico-pie__leyenda" style={{ flexGrow: 1 }}>
        {data.map((item, index) => {
          const porcentajeIndividual = ((item[valueKey] / total) * 100).toFixed(1);
          return (
            <div key={index} className="grafico-torta__leyenda-item" style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <div 
                className="grafico-torta__color-box" 
                style={{ backgroundColor: colores[index % colores.length], width: '12px', height: '12px', borderRadius: '2px', marginRight: '10px' }}
              ></div>
              <span className="grafico-torta__texto" style={{ fontSize: '0.9rem', color: '#ccc' }}>
                <strong style={{ color: '#fff' }}>{item[labelKey]}:</strong> {item[valueKey]} 
                <span style={{ color: '#888', marginLeft: '5px' }}>({porcentajeIndividual}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

  // --- PROTECCIÓN DE RUTA ---
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

  // ✅ Verificación robusta del token
  const activeToken = getToken();
  if (!activeToken) {
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

  const pendientesCount = reporteData?.eventos_por_estado?.find(e => e.estado === 1)?.cantidad || 0;

  return (
    <div className="reportes-page">
      <Navbar />
      <div className="reportes-page__container" ref={reporteRef}>
        
        {/* HEADER */}
        <div className="reportes-header">
          <div>
            <h1 className="reportes-header__title">Panel de Control y Reportes</h1>
            <p className="reportes-header__subtitle">Gestión centralizada de datos para {user?.nombre_y_apellido}</p>
          </div>
          
          <div className="reportes-header__actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
             {/* Selectores de Filtro */}
             <div data-html2canvas-ignore="true" style={{ display: 'flex', gap: '5px' }}>
                <select value={anioFiltro} onChange={(e) => setAnioFiltro(e.target.value)} className="filter-select">
                  <option value="">Año (Todos)</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                </select>
                <select value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} className="filter-select">
                  <option value="">Mes (Todos)</option>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                    <option key={m} value={m}>{getNombreMes(m)}</option>
                  ))}
                </select>
             </div>

             {/* 6. Botón para Descargar PDF */}
             <button 
                onClick={handleDescargarPDF} 
                disabled={exportando === "pdf"}
                className="reportes-header__refresh" 
                style={{ backgroundColor: '#e74c3c' }} 
             >
                {exportando === "pdf" ? "Generando..." : "📄 Guardar PDF"}
             </button>

             <button 
                onClick={() => cargarReportes()}
                className="reportes-header__refresh"
               >
                ↻ Actualizar Datos
            </button>
          </div>
        </div>

        {/* ALERTAS */}
        {error && <div className="reportes-alert reportes-alert--error">⚠️ {error}</div>}
        
        {usuarioRol <= 2 && pendientesCount > 0 && (
          <div className="reportes-alert reportes-alert--warning">
            🔔 Tienes <strong>{pendientesCount}</strong> eventos pendientes de revisión.
          </div>
        )}

        {/* Solo Admin y Supervisor ven el total global */}
        {(usuarioRol === 1 || usuarioRol === 2) && (
          <>
            <div className="stat-card stat-card--primary">
              <div className="stat-card__valor">{reporteData?.total_eventos || 0}</div>
              <div className="stat-card__label">Total Eventos Sistema</div>
            </div>
            <div className="stat-card stat-card--success">
              <div className="stat-card__valor">{reporteData?.usuarios_total || 0}</div>
              <div className="stat-card__label">Usuarios Registrados</div>
            </div>
            <div className="stat-card stat-card--info"
            onClick={() => document.getElementById('lista_eventos_detallada')?.scrollIntoView({behavior: 'smooth'})}
              style={{cursor: 'pointer'}}
              >
              <div className="stat-card__valor">{reporteData?.mis_eventos_total || 0}</div>
              <div className="stat-card__label">Mis Eventos Creados</div>
            </div>
          </>
        )}

        {/* --- SECCIÓN ESPECÍFICA ROL 3: ORGANIZACIÓN EXTERNA CON ACORDEÓN --- */}
        {usuarioRol === 3 && reporteData?.lista_eventos_detallada && (
          <div className="reportes-rol3-container" style={{ marginTop: '20px' }}>
            
            <div className="grafico-card grafico-card--wide">
              <div className="grafico-card__header">
                <h3>📋 Detalle de Mis Solicitudes por Estado</h3>
              </div>
              
              <div className="grafico-card__body">
                {[2, 3, 4, 5, 6].map((idEstado) => {
                  const eventosEnEstado = reporteData.lista_eventos_detallada?.filter(e => e.estado === idEstado) || [];
                  if (eventosEnEstado.length === 0) return null; // No mostrar si no hay eventos en ese estado

                  const isOpen = estadoAbierto === idEstado;

                  return (
                    <div key={idEstado} className="accordion-section" style={{ marginBottom: '10px', border: '1px solid #333', borderRadius: '8px', overflow: 'hidden' }}>
                      {/* CABECERA DEL ACORDEÓN */}
                      <div 
                        onClick={() => setEstadoAbierto(isOpen ? null : idEstado)}
                        style={{ 
                          padding: '15px', 
                          backgroundColor: '#252525', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          cursor: 'pointer',
                          borderLeft: `4px solid ${idEstado === 3 ? '#4ade80' : idEstado === 2 ? '#fbbf24' : '#e74c3c'}`
                        }}
                      >
                        <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>
                          {getNombreEstado(idEstado).toUpperCase()} ({eventosEnEstado.length})
                        </span>
                        <span style={{ transition: 'transform 0.3s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                          ▼
                        </span>
                      </div>

                      {/* CONTENIDO DESPLEGABLE */}
                      {isOpen && (
                        <div style={{ padding: '10px', backgroundColor: '#1a1a1a' }}>
                          <div className="table-responsive">
                            <table className="tabla-reportes-custom">
                              <thead>
                                <tr>
                                  <th>Evento</th>
                                  <th>Fecha</th>
                                  <th>Tipo</th>
                                  <th style={{ textAlign: 'center' }}>Reservas</th>
                                </tr>
                              </thead>
                              <tbody>
                                {eventosEnEstado.map((evento) => (
                                  <tr key={evento.id}>
                                    <td style={{ fontWeight: 'bold' }}>{evento.nombre}</td>
                                    <td>{evento.fecha}</td>
                                    <td><span className="badge-tipo">{evento.tipo}</span></td>
                                    <td style={{ textAlign: 'center' }}>
                                      <div className="reservas-indicator">{evento.reservas}</div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {reporteData?.mis_eventos_por_estado && (
            <div className="grafico-card">
              <div className="grafico-card__header">
                <h3>📊 Mi Actividad (Estados)</h3>
                <button 
                  data-html2canvas-ignore="true"
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

            <div className="reportes-graficos">
              {/* Gráfico de Rendimiento por Tipo (Para el Rol 3) */}
              <div className="grafico-card">
                <div className="grafico-card__header">
                  <h3>📈 Popularidad por Categoría</h3>
                  <p style={{fontSize: '0.8rem', color: '#888'}}>Distribución de inscritos según el tipo de actividad.</p>
                  <button 
                    data-html2canvas-ignore="true"
                    onClick={() => handleExportarCSV("rendimiento_categorias")}
                    className="btn-export"
                  >
                    📥 CSV
                  </button>
                </div>
                <div className="grafico-card__body">
                  {renderGraficoTorta(reporteData.rendimiento_por_tipo || [], "tipo", "cantidad")}
                  <div className="insight-text">
                  {reporteData.rendimiento_por_tipo && reporteData.rendimiento_por_tipo.length > 0 ? (
                    <>
                      💡 Tu categoría más buscada es <strong>{ [...reporteData.rendimiento_por_tipo].sort((a, b) => b.cantidad - a.cantidad)[0].tipo }</strong>
                    </>
                  ) : (
                    "💡 No hay datos suficientes para determinar una tendencia."
                  )}
                </div>
                </div>
              </div>

              {/* Card de Total Reservas (Highlight) */}
              <div className="grafico-card">
                <div className="grafico-card__header">
                  <h3>👥 Detalle de Inscripciones</h3>
                </div>
                <div className="grafico-card__body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <span style={{ fontSize: '4rem', fontWeight: 'bold', color: '#4ade80' }}>
                        {reporteData.total_reservas_recibidas || 0}
                    </span>
                    <p style={{ color: 'var(--color-text-muted)' }}>Usuarios que han completado el formulario de inscripción para tus eventos publicados.</p>
                </div>
              </div>
            </div>

  
          </div>
        )}


        {/* SECCIÓN DE GRÁFICOS */}
        <div className="reportes-graficos">
          
          {/* 1. Tendencia Mensual */}
          {(usuarioRol <= 2) && reporteData?.eventos_por_mes && (
            <div className="grafico-card grafico-card--wide">
              <div className="grafico-card__header">
                <h3>📅 Tendencia Mensual de Eventos</h3>
                <button 
                  data-html2canvas-ignore="true" 
                  disabled={exportando === "eventos_por_mes"}
                  onClick={() => handleExportarCSV("eventos_por_mes")}
                  className="btn-export"
                >
                  {exportando === "eventos_por_mes" ? "..." : "📥 CSV"}
                </button>
              </div>
              <div className="grafico-card__body">{renderGraficoLinea(reporteData.eventos_por_mes)}</div>
            </div>
          )}

          {/* Gráfico Tipo (Torta) */}
          {(usuarioRol <= 2) && reporteData?.eventos_por_tipo && (
            <div className="grafico-card">
              <div className="grafico-card__header">
                <h3>🏃‍♂️ Eventos por Tipo</h3>
                <button 
                  data-html2canvas-ignore="true" 
                  disabled={exportando === "eventos_por_tipo"}
                  onClick={() => handleExportarCSV("eventos_por_tipo")}
                  className="btn-export"
                >
                  {exportando === "eventos_por_tipo" ? "..." : "📥 CSV"}
                </button>
              </div>
              <div className="grafico-card__body">
                {renderGraficoTorta(reporteData.eventos_por_tipo, "tipo", "cantidad")}
              </div>
            </div>
          )}

          {/* Gráfico Dificultad (Torta) */}
          {(usuarioRol <= 2) && reporteData?.eventos_por_dificultad && (
            <div className="grafico-card">
              <div className="grafico-card__header">
                <h3>🧗 Eventos por Dificultad</h3>
                <button 
                  data-html2canvas-ignore="true" 
                  disabled={exportando === "eventos_por_dificultad"}
                  onClick={() => handleExportarCSV("eventos_por_dificultad")}
                  className="btn-export"
                >
                  {exportando === "eventos_por_dificultad" ? "..." : "📥 CSV"}
                </button>
              </div>
              <div className="grafico-card__body">
                {renderGraficoTorta(reporteData.eventos_por_dificultad, "dificultad", "cantidad")}
              </div>
            </div>
          )}

          {/* NUEVO CARD: TOP UBICACIONES */}
          {(usuarioRol <= 2) && reporteData?.eventos_por_ubicacion && (
            <div className="grafico-card">
              <div className="grafico-card__header">
                <h3>📍 Top Ubicaciones</h3>
                <button 
                  data-html2canvas-ignore="true" 
                  disabled={exportando === "eventos_por_ubicacion"}
                  onClick={() => handleExportarCSV("eventos_por_ubicacion")}
                  className="btn-export"
                >
                  {exportando === "eventos_por_ubicacion" ? "..." : "📥 CSV"}
                </button>
              </div>
              <div className="grafico-card__body" style={{ overflowY: 'auto', maxHeight: '300px' }}>
                {renderRankingHorizontal(reporteData.eventos_por_ubicacion, "ubicacion", "cantidad")}
              </div>
            </div>
          )}

          {usuarioRol === 1 && reporteData?.usuarios_por_rol && (
            <div className="grafico-card">
              <div className="grafico-card__header">
                <h3>🎭 Distribución por Roles</h3>
                <button 
                  data-html2canvas-ignore="true"
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

          

          {/* 5. Auditoría */}
          {(usuarioRol <= 2) && (
            <div className="grafico-card">
              <div className="grafico-card__header">
                <h3>🕵️ Auditoría de Cambios</h3>
                <button 
                  data-html2canvas-ignore="true"
                  disabled={exportando === "auditoria"}
                  onClick={() => handleExportarCSV("auditoria")}
                  className="btn-export"
                >
                  {exportando === "auditoria" ? "..." : "📥 CSV"}
                </button>
              </div>
              <div className="grafico-card__body">
                 <p style={{fontSize: '0.9rem', color: '#e0e0e0'}}>
                    Registro de intervenciones.
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