import { useState, useEffect, useRef } from "react";
import "../styles/reportes.css";
import { Navbar } from "../components/navbar";
import { Footer } from "../components/footer";
import { useAuth } from "../context/auth-context";
import { getReporteGeneral, exportReporteCSV } from "../services/eventos";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
// ─── Types ────────────────────────────────────────────────────────────────────

interface DetalleRecaudacion {
  id_evento: number;
  nombre_evento: string;
  fecha_evento: string;
  monto: number;
  monto_unitario: number;
  inscriptos_count: number;
  inscriptos_confirmados: number;
  cupo_maximo: number | null;
  estado_evento: number;
  tipo: string;
  descripcion: string;
  ubicacion_completa: string;
  distancia_km: number;
}

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
  lista_eventos_detallada?: any[];
  rendimiento_por_tipo?: { tipo: string; cantidad: number }[];
  total_reservas_recibidas?: number;
  recaudacion_total?: number;
  detalle_recaudacion?: DetalleRecaudacion[];
  tendencias_ubicacion?: any[];
  analisis_organizadores?: { id_usuario: number; organizador: string; email: string; rol: string; total_eventos: number; activos: number; finalizados: number; recaudacion_total: number; }[];
  top_ocupacion?: { id_evento: number; nombre_evento: string; cupo_maximo: number; inscriptos_pagos: number; reservados_no_pagos: number; total_ocupado: number; tasa_ocupacion: number; es_pago: boolean; }[];
  dashboard_eventos?: { id_evento: number; nombre_evento: string; fecha_evento: string; responsable: string; estado: string; pertenencia: string; }[];
}

// ─── Modal detalle de evento ──────────────────────────────────────────────────

function EventoDetalleModal({
  evento,
  onClose,
}: {
  evento: DetalleRecaudacion;
  onClose: () => void;
}) {
  const estadoLabel: Record<number, string> = {
    1: "Borrador", 2: "Pendiente", 3: "Publicado",
    4: "Finalizado", 5: "Cancelado", 6: "Depurado por Admin",
  };
  const estadoColor: Record<number, string> = {
    3: "#4ade80", 4: "#60a5fa", 5: "#f87171", 2: "#fbbf24",
  };
  const color = estadoColor[evento.estado_evento] || "#888";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
        zIndex: 9999, display: "flex", alignItems: "center",
        justifyContent: "center", padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1a1a1a", border: "1px solid #333", borderRadius: "16px",
          padding: "32px", maxWidth: "600px", width: "100%",
          maxHeight: "85vh", overflowY: "auto", position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: "16px", right: "16px",
            background: "none", border: "none", color: "#888",
            fontSize: "1.4rem", cursor: "pointer", lineHeight: 1,
          }}
        >
          ✕
        </button>

        <div
          style={{
            display: "inline-block", padding: "4px 12px", borderRadius: "20px",
            background: color + "22", border: `1px solid ${color}`,
            color, fontSize: "0.78rem", fontWeight: "bold", marginBottom: "12px",
          }}
        >
          {(estadoLabel[evento.estado_evento] || `Estado ${evento.estado_evento}`).toUpperCase()}
        </div>

        <h2 style={{ margin: "0 0 4px", fontSize: "1.4rem", color: "#fff" }}>
          {evento.nombre_evento}
        </h2>
        <p style={{ margin: "0 0 24px", color: "#888", fontSize: "0.9rem" }}>
          {evento.tipo}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          {[
            { label: "Fecha", value: new Date(evento.fecha_evento).toLocaleDateString("es-AR") },
            { label: "Distancia", value: `${evento.distancia_km} km` },
            {
              label: "Valor Unitario",
              value: evento.monto_unitario === 0
                ? "Gratuito"
                : `$${evento.monto_unitario.toLocaleString("es-AR")}`,
            },
            {
              label: "Cupo",
              value: evento.cupo_maximo
                ? `${evento.inscriptos_count} / ${evento.cupo_maximo}`
                : `${evento.inscriptos_count} inscriptos`,
            },
            { label: "Confirmados", value: `${evento.inscriptos_confirmados}` },
            { label: "Recaudado", value: `$${evento.monto.toLocaleString("es-AR")}` },
          ].map((item) => (
            <div
              key={item.label}
              style={{ background: "#252525", borderRadius: "8px", padding: "12px 16px" }}
            >
              <p style={{ margin: 0, color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {item.label}
              </p>
              <p style={{ margin: "4px 0 0", color: "#fff", fontWeight: "bold", fontSize: "1rem" }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {evento.ubicacion_completa && (
          <div style={{ marginBottom: "16px" }}>
            <p style={{ margin: "0 0 6px", color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              📍 Ubicación
            </p>
            <p style={{ margin: 0, color: "#e0e0e0", fontSize: "0.9rem" }}>
              {evento.ubicacion_completa}
            </p>
          </div>
        )}

        {evento.descripcion && (
          <div>
            <p style={{ margin: "0 0 6px", color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              📝 Descripción
            </p>
            <p style={{ margin: 0, color: "#ccc", fontSize: "0.9rem", lineHeight: 1.6 }}>
              {evento.descripcion}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ReportesPage() {

  // ── Estado ──────────────────────────────────────────────────────────────
  const [reporteData, setReporteData] = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportando, setExportando] = useState<string | null>(null);
  const [estadoAbierto, setEstadoAbierto] = useState<number | null>(null);
  const [eventoDetalle, setEventoDetalle] = useState<DetalleRecaudacion | null>(null);

  // Sort tabla de solicitudes
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  // Tendencias
  const [tabTendencias, setTabTendencias] = useState<"activos" | "pasados">("activos");
  const [filtroTipoTendencias, setFiltroTipoTendencias] = useState<string>("");
  const [provinciaExpandida, setProvinciaExpandida] = useState<string | null>(null);
  const [localidadExpandida, setLocalidadExpandida] = useState<string | null>(null);

  // Recaudación
  const [busquedaEvento, setBusquedaEvento] = useState<string>("");
  const [filtroEstadoRecaudacion, setFiltroEstadoRecaudacion] = useState<"todos" | "activos" | "pasados">("todos");
  const [filtroTipoRecaudacion, setFiltroTipoRecaudacion] = useState<string>("");
  const [sortFinanzas, setSortFinanzas] = useState<{
    key: "nombre" | "fecha" | "monto" | "cupo" | "unitario";
    direction: "asc" | "desc";
  }>({ key: "fecha", direction: "desc" });
  const fmt = (val: number) => new Intl.NumberFormat("es-AR").format(val);
  const fmtPeso = (val: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(val);
  const fmtFecha = (f?: string) => f ? new Date(f).toLocaleDateString("es-AR") : "-";

  // Estados exclusivos para Supervisor
  const [sortConfigOrg, setSortConfigOrg] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'recaudacion_total', direction: 'desc' });
  const [modalDashboard, setModalDashboard] = useState<{ isOpen: boolean, title: string, data: any[] }>({ isOpen: false, title: "", data: [] });

  // Función para ordenar la tabla de Organizadores
  const handleSortOrg = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfigOrg.key === key && sortConfigOrg.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfigOrg({ key, direction });
  };

  const sortedOrganizadores = [...(reporteData?.analisis_organizadores || [])].sort((a: any, b: any) => {
    if (a[sortConfigOrg.key] < b[sortConfigOrg.key]) return sortConfigOrg.direction === 'asc' ? -1 : 1;
    if (a[sortConfigOrg.key] > b[sortConfigOrg.key]) return sortConfigOrg.direction === 'asc' ? 1 : -1;
    return 0;
  });
  // --- Ordenamiento para la tabla de Ocupación ---
  const [sortConfigOcupacion, setSortConfigOcupacion] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'tasa_ocupacion', direction: 'desc' });

  const handleSortOcupacion = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfigOcupacion.key === key && sortConfigOcupacion.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfigOcupacion({ key, direction });
  };

  const sortedOcupacion = [...(reporteData?.top_ocupacion || [])].sort((a: any, b: any) => {
    if (a[sortConfigOcupacion.key] < b[sortConfigOcupacion.key]) return sortConfigOcupacion.direction === 'asc' ? -1 : 1;
    if (a[sortConfigOcupacion.key] > b[sortConfigOcupacion.key]) return sortConfigOcupacion.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Funciones para procesar el Dashboard
  const evtSist = reporteData?.dashboard_eventos || [];
  const statsSist = {
    Activo: { Propios: 0, Externos: 0, Total: 0 },
    Finalizado: { Propios: 0, Externos: 0, Total: 0 },
    Cancelado: { Propios: 0, Externos: 0, Total: 0 }
  };

  evtSist.forEach(e => {
    // Verificamos que el estado exista en nuestro diccionario (Activo, Finalizado o Cancelado)
    if (e.estado && statsSist[e.estado as keyof typeof statsSist]) {
      const tipo = e.pertenencia === "Propio" ? "Propios" : "Externos";
      statsSist[e.estado as keyof typeof statsSist][tipo] += 1;
      statsSist[e.estado as keyof typeof statsSist].Total += 1;
    }
  });

  const barData = [
    { name: 'Activos', Propios: statsSist.Activo.Propios, Externos: statsSist.Activo.Externos },
    { name: 'Finalizados', Propios: statsSist.Finalizado.Propios, Externos: statsSist.Finalizado.Externos },
    { name: 'Eliminados', Propios: statsSist.Cancelado.Propios, Externos: statsSist.Cancelado.Externos },
  ];

  const pieData = [
    { name: 'Activos', value: statsSist.Activo.Total, color: '#4ade80' },
    { name: 'Finalizados', value: statsSist.Finalizado.Total, color: '#3b82f6' },
    { name: 'Eliminados', value: statsSist.Cancelado.Total, color: '#ef4444' }
  ];

  const handleChartClick = (estadoFiltroPlural: string, tipoFiltro: string | null = null) => {
    // Reconvertimos el plural visual al singular del backend para poder filtrar la tabla del modal
    const estadoSingular = estadoFiltroPlural === 'Activos' ? 'Activo' : estadoFiltroPlural === 'Finalizados' ? 'Finalizado' : 'Cancelado';
    
    const filtrados = evtSist.filter(e => 
      e.estado === estadoSingular && (!tipoFiltro || e.pertenencia === tipoFiltro)
    );
    const title = tipoFiltro ? `Eventos ${estadoFiltroPlural} (${tipoFiltro}s)` : `Todos los Eventos ${estadoFiltroPlural}`;
    setModalDashboard({ isOpen: true, title, data: filtrados });
  };

  const reporteRef = useRef<HTMLDivElement>(null);
  const { user, getToken, loadingAuth } = useAuth();
  const usuarioRol = user?.id_rol || 0;

  const TIPOS_EVENTO = [
    "Ciclismo de Ruta",
    "Mountain Bike (MTB)",
    "Rural Bike",
    "Gravel",
    "Cicloturismo",
    "Entrenamiento / Social",
  ];

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loadingAuth) {
      const token = getToken();
      if (token) cargarReportes(token);
      else setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingAuth]);

  // ── Acciones ──────────────────────────────────────────────────────────────
  const cargarReportes = async (tokenParam?: string) => {
    try {
      setLoading(true); setError(null);
      const token = tokenParam || getToken();
      if (!token) { setError("No se encontró una sesión activa."); return; }
      const data = await getReporteGeneral(token, undefined, undefined);
      setReporteData(data);
    } catch (err: any) {
      setError(err?.response?.status === 401 ? "Sesión expirada. Iniciá sesión nuevamente." : "Error al cargar reportes.");
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
    } catch {
      alert("Error al exportar el reporte CSV");
    } finally {
      setExportando(null);
    }
  };

  const handleDescargarPDF = async () => {
    if (!reporteRef.current) return;
    try {
      setExportando("pdf");
      const canvas = await html2canvas(reporteRef.current, { scale: 2, backgroundColor: "#080808" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const w = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      pdf.addImage(imgData, "PNG", 0, 0, w, (imgProps.height * w) / imgProps.width);
      pdf.save(`reporte-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      alert("No se pudo generar el PDF");
    } finally {
      setExportando(null);
    }
  };

  // ── Sort helpers ──────────────────────────────────────────────────────────
  const handleSort = (key: string) => {
    setSortConfig((prev) =>
      !prev || prev.key !== key
        ? { key, direction: "asc" }
        : { key, direction: prev.direction === "asc" ? "desc" : "asc" }
    );
  };

  const si = (key: string) =>
    sortConfig?.key === key ? (sortConfig.direction === "asc" ? " ↑" : " ↓") : "";

  const handleSortFin = (key: "nombre" | "fecha" | "monto" | "cupo" | "unitario") => {
    setSortFinanzas((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sif = (key: string) =>
    sortFinanzas.key === key ? (sortFinanzas.direction === "asc" ? " ↑" : " ↓") : "";

  const sortedLista = (lista: any[]) => {
    if (!sortConfig) return lista;
    return [...lista].sort((a: any, b: any) => {
      let cmp = 0;
      if (sortConfig.key === "nombre") cmp = String(a.nombre || "").localeCompare(String(b.nombre || ""));
      else if (sortConfig.key === "fecha") cmp = new Date(a.fecha_evento).getTime() - new Date(b.fecha_evento).getTime();
      else if (sortConfig.key === "reservas") cmp = (a.reservas ?? 0) - (b.reservas ?? 0);
      return sortConfig.direction === "asc" ? cmp : -cmp;
    });
  };

  // ── Label helpers ─────────────────────────────────────────────────────────
  const getNombreEstado = (id: number) =>
    (({ 1: "Borrador", 2: "Pendiente", 3: "Publicado", 4: "Finalizado", 5: "Cancelado", 6: "Depurado por Admin" } as Record<number, string>)[id] || `Estado ${id}`);

  const getNombreRol = (id: number) =>
    (({ 1: "Admin", 2: "Supervisor", 3: "Operario", 4: "Cliente" } as Record<number, string>)[id] || `Rol ${id}`);

  const getNombreMes = (mes: number) =>
    ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][mes - 1] || String(mes);

  // ── Gráficos ──────────────────────────────────────────────────────────────

  const renderRankingHorizontal = (data: any[], labelKey: string, valueKey: string) => {
    if (!data?.length) return <p className="no-data">Sin datos de ubicación</p>;
    const sorted = [...data].sort((a: any, b: any) => b[valueKey] - a[valueKey]).slice(0, 10);
    const maxVal = Math.max(...sorted.map((d: any) => d[valueKey]), 1);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
        {sorted.map((item: any, i: number) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", fontSize: "0.9rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
              <span style={{ fontWeight: 500, color: "#e0e0e0" }}>{item[labelKey]}</span>
              <span style={{ fontWeight: "bold", color: "#4ade80" }}>{item[valueKey]}</span>
            </div>
            <div style={{ width: "100%", height: "8px", backgroundColor: "#333", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ width: `${(item[valueKey] / maxVal) * 100}%`, height: "100%", backgroundColor: "#4ade80", borderRadius: "4px" }} />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderGraficoLinea = (data: any[]) => {
    if (!data?.length) return <p className="no-data">Sin datos disponibles</p>;
    const sorted = [...data].sort((a: any, b: any) => a.anio !== b.anio ? a.anio - b.anio : a.mes - b.mes);
    const maxVal = Math.max(...sorted.map((item: any) => item.cantidad), 1);
    return (
      <div className="grafico-linea">
        <div className="grafico-linea__grid">
          {sorted.map((item: any, i: number) => (
            <div key={i} className="grafico-linea__columna">
              <span className="grafico-linea__count">{item.cantidad}</span>
              <div className="grafico-linea__barra" style={{ height: `${(item.cantidad / maxVal) * 80}%` }} />
              <div className="grafico-linea__label">{getNombreMes(item.mes)}<br />{item.anio}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderGraficoPie = (
    data: any[],
    labelKey: string,
    valueKey: string,
    getLabelFn?: (v: any) => string
  ) => {
    if (!data?.length) return <p className="no-data">Sin datos disponibles</p>;
    const total = data.reduce((s: number, item: any) => s + item[valueKey], 0);
    const colores = ["#ff6b35", "#ffa500", "#4caf50", "#2196f3", "#9c27b0"];
    return (
      <div className="grafico-pie">
        {data.map((item: any, i: number) => (
          <div key={i} className="grafico-pie__item">
            <div className="grafico-pie__color" style={{ backgroundColor: colores[i % colores.length] }} />
            <div className="grafico-pie__info">
              <span className="grafico-pie__label">
                {getLabelFn ? getLabelFn(item[labelKey]) : item[labelKey]}
              </span>
              <span className="grafico-pie__valor">
                {item[valueKey]} ({((item[valueKey] / (total || 1)) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderGraficoTorta = (data: any[], labelKey: string, valueKey: string) => {
    if (!data?.length) return <p className="no-data">Sin datos disponibles</p>;
    const total = data.reduce((s: number, item: any) => s + item[valueKey], 0);
    const colores = ["#ff6b35", "#4ade80", "#60a5fa", "#fbbf24", "#a78bfa", "#d63a3a"];
    const size = 180; const center = size / 2; const radius = 80;
    let angle = -90;
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "40px", width: "100%", padding: "20px 0" }}>
        {/* Contenedor del SVG */}
        <div style={{ position: "relative", width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
            {data.map((item: any, i: number) => {
              const val = item[valueKey];
              const arc = (val / total) * 360;
              const sa = angle;
              const ea = angle + arc;
              const mid = sa + arc / 2;
              const x1 = center + radius * Math.cos((Math.PI * sa) / 180);
              const y1 = center + radius * Math.sin((Math.PI * sa) / 180);
              const x2 = center + radius * Math.cos((Math.PI * ea) / 180);
              const y2 = center + radius * Math.sin((Math.PI * ea) / 180);
              const tr = radius * 0.65;
              const tx = center + tr * Math.cos((Math.PI * mid) / 180);
              const ty = center + tr * Math.sin((Math.PI * mid) / 180);
              const laf = arc > 180 ? 1 : 0;
              const d = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${laf} 1 ${x2} ${y2} Z`;
              angle += arc;
              return (
                <g key={i}>
                  <path d={d} fill={colores[i % colores.length]} stroke="#1a1a1a" strokeWidth="1" />
                  <text x={tx} y={ty} fill="white" fontSize="12" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle">
                    {val}
                  </text>
                </g>
              );
            })}
            <circle cx={center} cy={center} r={radius * 0.35} fill="#1a1a1a" />
          </svg>
        </div>

        {/* Contenedor de la Leyenda */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          {data.map((item: any, i: number) => (
            <div key={i} style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ backgroundColor: colores[i % colores.length], width: "12px", height: "12px", borderRadius: "2px", marginRight: "10px" }} />
              <span style={{ fontSize: "0.85rem", color: "#ccc", whiteSpace: "nowrap" }}>
                <strong style={{ color: "#fff" }}>{item[labelKey]}:</strong> {item[valueKey]}
                <span style={{ color: "#888", marginLeft: "5px" }}>
                  ({((item[valueKey] / total) * 100).toFixed(1)}%)
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Componente pequeño para los badges de estado del cliente
  function EstadoBadge({ estado }: { estado: number }) {
    const config: Record<number, { txt: string; bg: string; clr: string }> = {
      1: { txt: "Pendiente", bg: "#fbbf2422", clr: "#fbbf24" },
      2: { txt: "Confirmada", bg: "#4ade8022", clr: "#4ade80" },
      3: { txt: "Cancelada", bg: "#f8717122", clr: "#f87171" },
    };
    const s = config[estado] || { txt: "Desconocido", bg: "#333", clr: "#888" };
    return (
      <span style={{ 
        padding: "4px 10px", borderRadius: "12px", fontSize: "0.7rem", fontWeight: "bold",
        background: s.bg, color: s.clr, border: `1px solid ${s.clr}44`, textTransform: "uppercase" 
      }}>
        {s.txt}
      </span>
    );
  }

  // Card de estadística simple
  function StatCard({ label, value, color }: any) {
    return (
      <div style={{ background: "#1a1a1a", padding: "16px", borderRadius: "12px", border: `1px solid ${color}44` }}>
        <p style={{ margin: 0, fontSize: "0.75rem", color: "#888", textTransform: "uppercase" }}>{label}</p>
        <p style={{ margin: "4px 0 0", fontSize: "1.2rem", fontWeight: "bold", color: "#fff" }}>{value}</p>
      </div>
    );
  }

  //Seccion Cliente

  function SeccionCliente({ data, onExport }: { data: ReporteData; onExport: (tipo: string) => void }) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  const inscripciones = data.mis_inscripciones ?? [];
  const filtradas = inscripciones.filter(i => {
    const mb = i.evento_nombre?.toLowerCase().includes(busqueda.toLowerCase());
    const me = !filtroEstado || i.estado_id === Number(filtroEstado);
    return mb && me;
  });

  const stats = [
    { label: "Total Inscripciones", value: fmt(inscripciones.length), color: "#4ade80" },
    { label: "Confirmadas", value: fmt(inscripciones.filter(i => i.estado_id === 2).length), color: "#60a5fa" },
    { label: "Pendientes", value: fmt(inscripciones.filter(i => i.estado_id === 1).length), color: "#fbbf24" },
    { label: "Total Gastado", value: fmtPeso(inscripciones.reduce((acc, curr) => acc + (curr.costo || 0), 0)), color: "#a78bfa" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "20px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "14px" }}>
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grafico-card grafico-card--wide">
        <div className="grafico-card__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>🎟️ Mis Inscripciones</h3>
          <button className="reportes-alert__retry" onClick={() => onExport("mis_inscripciones")} style={{ padding: "5px 15px", fontSize: "0.8rem" }}>
            Exportar CSV
          </button>
        </div>
        <div className="grafico-card__body">
          <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
            <input 
              className="reportes-input" 
              placeholder="Buscar evento..." 
              value={busqueda} 
              onChange={e => setBusqueda(e.target.value)} 
              style={{ flex: 1, padding: "8px", background: "#0d0d0d", border: "1px solid #333", color: "#fff", borderRadius: "6px" }}
            />
            <select 
              value={filtroEstado} 
              onChange={e => setFiltroEstado(e.target.value)}
              style={{ padding: "8px", background: "#0d0d0d", border: "1px solid #333", color: "#fff", borderRadius: "6px" }}
            >
              <option value="">Todos los estados</option>
              <option value="1">Pendiente</option>
              <option value="2">Confirmada</option>
              <option value="3">Cancelada</option>
            </select>
          </div>
          <div className="table-responsive">
            <table className="tabla-reportes-custom">
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Fecha</th>
                  <th>Costo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((ins, idx) => (
                  <tr key={idx}>
                    <td><strong>{ins.evento_nombre}</strong><br/><small style={{color: "#888"}}>{ins.tipo}</small></td>
                    <td>{fmtFecha(ins.fecha_evento)}</td>
                    <td style={{ color: "#fbbf24" }}>{ins.costo > 0 ? fmtPeso(ins.costo) : "Gratis"}</td>
                    <td><EstadoBadge estado={ins.estado_id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

  // ── Datos derivados ───────────────────────────────────────────────────────

  const detalleRecaudacionFiltrado: DetalleRecaudacion[] = (reporteData?.detalle_recaudacion ?? [])
    .filter((item: DetalleRecaudacion) => {
      const mb = item.nombre_evento.toLowerCase().includes(busquedaEvento.toLowerCase());
      const mt = filtroTipoRecaudacion === "" || item.tipo === filtroTipoRecaudacion;
      if (filtroEstadoRecaudacion === "activos") return mb && mt && item.estado_evento === 3;
      if (filtroEstadoRecaudacion === "pasados") return mb && mt && item.estado_evento === 4;
      return mb && mt;
    })
    .sort((a: DetalleRecaudacion, b: DetalleRecaudacion) => {
      const { key, direction } = sortFinanzas;
      let cmp = 0;
      if (key === "nombre") cmp = a.nombre_evento.localeCompare(b.nombre_evento);
      else if (key === "fecha") cmp = new Date(a.fecha_evento).getTime() - new Date(b.fecha_evento).getTime();
      else if (key === "monto") cmp = a.monto - b.monto;
      else if (key === "unitario") cmp = a.monto_unitario - b.monto_unitario;
      else if (key === "cupo") cmp = (a.inscriptos_count ?? 0) - (b.inscriptos_count ?? 0);
      return direction === "asc" ? cmp : -cmp;
    });

  const totalRecaudacionFiltrado = detalleRecaudacionFiltrado.reduce(
    (s: number, item: DetalleRecaudacion) => s + item.monto, 0
  );

  const tendenciasFiltradas = (reporteData?.tendencias_ubicacion ?? [])
    .map((prov: any) => ({
      ...prov,
      localidades: prov.localidades
        .map((loc: any) => ({
          ...loc,
          eventos: loc.eventos.filter((evt: any) => {
            const me = tabTendencias === "activos" ? evt.estado === 3 : evt.estado === 4;
            const mt = filtroTipoTendencias === "" || evt.tipo === filtroTipoTendencias;
            return me && mt;
          }),
        }))
        .filter((loc: any) => loc.eventos.length > 0),
    }))
    .filter((prov: any) => prov.localidades.length > 0);

  // ── Guards de render ──────────────────────────────────────────────────────
  if (loadingAuth || loading) {
    return (
      <div className="reportes-page">
        <div className="reportes-loading">
          <div className="spinner-large" />
          <p>Cargando panel...</p>
        </div>
      </div>
    );
  }

  if (!getToken()) {
    return (
      <div className="reportes-page">
        <div className="reportes-alert reportes-alert--error">
          <span className="reportes-alert__icon">🔒</span>
          <span className="reportes-alert__message">Debes iniciar sesión para acceder.</span>
          <button
            onClick={() => (window.location.href = "/login")}
            className="reportes-alert__retry"
          >
            Ir al Login
          </button>
        </div>
      </div>
    );
  }

  const pendientesCount =
    reporteData?.eventos_por_estado?.find((e: any) => e.estado === 1)?.cantidad ?? 0;
  
  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="reportes-page">
      <Navbar />

      {eventoDetalle && (
        <EventoDetalleModal evento={eventoDetalle} onClose={() => setEventoDetalle(null)} />
      )}

      {/* ── Barra superior (sin filtros globales) ─────────────────────── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 1000,
        background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
        padding: "16px 40px", borderBottom: "2px solid #4ade80",
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
        display: "flex", justifyContent: "space-between",
        alignItems: "center", flexWrap: "wrap", gap: "15px",
      }}>
        <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#4ade80" }}>
          📊 Panel de Reportes
        </span>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={handleDescargarPDF}
            disabled={exportando === "pdf"}
            style={{
              padding: "10px 20px", background: "#e74c3c", border: "none",
              borderRadius: "8px", color: "#fff", fontWeight: "bold",
              cursor: exportando === "pdf" ? "not-allowed" : "pointer",
              opacity: exportando === "pdf" ? 0.6 : 1,
            }}
          >
            {exportando === "pdf" ? "Generando..." : "📄 Guardar PDF"}
          </button>
          <button
            onClick={() => cargarReportes()}
            style={{
              padding: "10px 20px", background: "#4ade80", border: "none",
              borderRadius: "8px", color: "#000", fontWeight: "bold", cursor: "pointer",
            }}
          >
            ↻ Actualizar
          </button>
        </div>
      </div>

      <div className="reportes-page__container" ref={reporteRef}>

        {/* Header */}
        <div className="reportes-header">
          <div>
            <h1 className="reportes-header__title">Panel de Control y Reportes</h1>
            <p className="reportes-header__subtitle">
              Gestión centralizada de datos para {user?.nombre_y_apellido}
            </p>
          </div>
        </div>

        {error && (
          <div className="reportes-alert reportes-alert--error">⚠️ {error}</div>
        )}

        {usuarioRol <= 2 && pendientesCount > 0 && (
          <div className="reportes-alert reportes-alert--warning">
            🔔 Tienes <strong>{pendientesCount}</strong> eventos pendientes de revisión.
          </div>
        )}

        {/* ── Tarjetas Admin / Supervisor ────────────────────────────────── */}
        {(usuarioRol === 1 || usuarioRol === 2) && (
          <>
            <div className="stat-card stat-card--primary">
              <div className="stat-card__valor">{reporteData?.total_eventos ?? 0}</div>
              <div className="stat-card__label">Total Eventos Sistema</div>
            </div>
            <div className="stat-card stat-card--success">
              <div className="stat-card__valor">{reporteData?.usuarios_total ?? 0}</div>
              <div className="stat-card__label">Usuarios Registrados</div>
            </div>
            <div
              className="stat-card stat-card--info"
              style={{ cursor: "pointer" }}
              onClick={() => document.getElementById("lista_eventos_detallada")?.scrollIntoView({ behavior: "smooth" })}
            >
              <div className="stat-card__valor">{reporteData?.mis_eventos_total ?? 0}</div>
              <div className="stat-card__label">Mis Eventos Creados</div>
            </div>
          </>
        )}
        {/* ════════════════════════════════════════════════════════════════
            ROL 2 — SUPERVISOR (Panel Exclusivo)
        ════════════════════════════════════════════════════════════════ */}
        {usuarioRol === 2 && (
            <div style={{ marginTop: "30px", display: "flex", flexDirection: "column", gap: "24px" }}>
                
                {/* 1. DASHBOARD EVENTOS DEL SISTEMA (Requerido Arriba) */}
                <div className="grafico-card grafico-card--wide">
                    <div className="grafico-card__header">
                        <h3>📊 Dashboard de Eventos del Sistema</h3>
                        <p style={{ fontSize: "0.8rem", color: "#888" }}>Clickeá en las barras o la torta para ver los detalles.</p>
                        <button onClick={() => handleExportarCSV("dashboard_eventos")} className="btn-export">
                            📥 Exportar Todo (CSV)
                        </button>
                    </div>
                    <div className="grafico-card__body" style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
                        
                        {/* Gráfico de Barras Apiladas */}
                        <div style={{ flex: "1 1 400px", height: "300px" }}>
                            <h4 style={{ textAlign: "center", marginBottom: "10px" }}>Propios vs Externos por Estado</h4>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <RechartsTooltip cursor={{fill: 'transparent'}}/>
                                    <Legend />
                                    <Bar dataKey="Propios" stackId="a" fill="#8b5cf6" onClick={(data: any) => handleChartClick(data.name, "Propio")} style={{ cursor: 'pointer' }}/>
                                    <Bar dataKey="Externos" stackId="a" fill="#f59e0b" onClick={(data: any) => handleChartClick(data.name, "Externo")} style={{ cursor: 'pointer' }}/>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Gráfico de Torta */}
                        <div style={{ flex: "1 1 300px", height: "300px" }}>
                            <h4 style={{ textAlign: "center", marginBottom: "10px" }}>Proporción Total</h4>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" onClick={(data) => handleChartClick(data.name)} style={{ cursor: 'pointer' }}>
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Tabla Resumen */}
                        {/* Aumentamos el marginTop de 15px a 40px para separarlo bien de los gráficos */}
                        <div style={{ flex: "1 1 100%", marginTop: "40px" }}>
                            <table className="tabla-reportes-custom">
                                <thead>
                                    <tr>
                                        <th>Estado</th>
                                        <th style={{ textAlign: "center" }}>Propios</th>
                                        <th style={{ textAlign: "center" }}>Externos</th>
                                        <th style={{ textAlign: "right" }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {barData.map(row => (
                                        <tr key={row.name}>
                                            <td style={{ fontWeight: "bold" }}>{row.name}</td>
                                            <td style={{ textAlign: "center" }}>{row.Propios}</td>
                                            <td style={{ textAlign: "center" }}>{row.Externos}</td>
                                            <td style={{ textAlign: "right", fontWeight: "bold" }}>{row.Propios + row.Externos}</td>
                                        </tr>
                                    ))}
                                    {/* Fila Total Sistema: Fondo gris más oscuro, borde superior fuerte y letra casi negra bien gruesa */}
                                    <tr style={{ backgroundColor: "#cbd5e1", borderTop: "3px solid #475569" }}>
                                        <td style={{ fontWeight: "900", color: "#0f172a", fontSize: "1.05rem" }}>TOTAL SISTEMA</td>
                                        <td style={{ textAlign: "center", fontWeight: "900", color: "#0f172a", fontSize: "1.05rem" }}>
                                            {barData.reduce((acc, curr) => acc + curr.Propios, 0)}
                                        </td>
                                        <td style={{ textAlign: "center", fontWeight: "900", color: "#0f172a", fontSize: "1.05rem" }}>
                                            {barData.reduce((acc, curr) => acc + curr.Externos, 0)}
                                        </td>
                                        <td style={{ textAlign: "right", fontWeight: "900", color: "#0f172a", fontSize: "1.2rem" }}>
                                            {evtSist.length}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* 2. Análisis Organizadores Top 10 */}
                <div className="grafico-card grafico-card--wide">
                    <div className="grafico-card__header">
                        <h3>🏆 Análisis Organizadores Top 10</h3>
                        <p style={{ fontSize: "0.8rem", color: "#888" }}>Por recaudación, eventos y estado. Tocá los encabezados para ordenar.</p>
                        <button onClick={() => handleExportarCSV("analisis_organizadores")} className="btn-export">
                            📥 Exportar CSV
                        </button>
                    </div>
                    <div className="grafico-card__body">
                        <div className="table-responsive">
                            <table className="tabla-reportes-custom tabla-sortable">
                                <thead>
                                    <tr>
                                        <th onClick={() => handleSortOrg('organizador')} style={{ cursor: 'pointer' }}>
                                            Organizador {sortConfigOrg.key === 'organizador' ? (sortConfigOrg.direction === 'asc' ? '↑' : '↓') : ''}
                                        </th>
                                        <th>Email</th>
                                        <th>Rol</th>
                                        <th onClick={() => handleSortOrg('total_eventos')} style={{ cursor: 'pointer', textAlign: "center" }}>
                                            Total Eventos {sortConfigOrg.key === 'total_eventos' ? (sortConfigOrg.direction === 'asc' ? '↑' : '↓') : ''}
                                        </th>
                                        <th onClick={() => handleSortOrg('activos')} style={{ cursor: 'pointer', textAlign: "center" }}>
                                            Activos {sortConfigOrg.key === 'activos' ? (sortConfigOrg.direction === 'asc' ? '↑' : '↓') : ''}
                                        </th>
                                        <th onClick={() => handleSortOrg('finalizados')} style={{ cursor: 'pointer', textAlign: "center" }}>
                                            Finalizados {sortConfigOrg.key === 'finalizados' ? (sortConfigOrg.direction === 'asc' ? '↑' : '↓') : ''}
                                        </th>
                                        <th onClick={() => handleSortOrg('recaudacion_total')} style={{ cursor: 'pointer', textAlign: "right" }}>
                                            Recaudación Total {sortConfigOrg.key === 'recaudacion_total' ? (sortConfigOrg.direction === 'asc' ? '↑' : '↓') : ''}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedOrganizadores.map((org: any, i: number) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: "bold" }}>{org.organizador}</td>
                                            <td style={{ fontSize: "0.85rem", color: "#555" }}>{org.email}</td>
                                            <td><span className="badge-tipo">{org.rol}</span></td>
                                            <td style={{ textAlign: "center", fontWeight: "bold" }}>{org.total_eventos}</td>
                                            <td style={{ textAlign: "center", color: "#4ade80" }}>{org.activos}</td>
                                            <td style={{ textAlign: "center", color: "#3b82f6" }}>{org.finalizados}</td>
                                            <td style={{ textAlign: "right", color: "#16a34a", fontWeight: "bold" }}>
                                                ${org.recaudacion_total.toLocaleString("es-AR")}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {sortedOrganizadores.length === 0 && <p className="no-data">Sin datos disponibles.</p>}
                        </div>
                    </div>
                </div>
                {/* 3. Top Eventos por Ocupación (Recuperado) */}
                <div className="grafico-card grafico-card--wide">
                    <div className="grafico-card__header">
                        <h3>🔥 Top 10 Eventos por Tasa de Ocupación</h3>
                        <p style={{ fontSize: "0.8rem", color: "#888" }}>Inscriptos confirmados (Pagos) vs Reservados pendientes (No pagos)</p>
                        <button onClick={() => handleExportarCSV("top_ocupacion")} className="btn-export">
                            📥 Exportar CSV
                        </button>
                    </div>
                    <div className="grafico-card__body">
                        <div className="table-responsive">
                            <table className="tabla-reportes-custom">
                                <thead>
                                    <tr>
                                        <th onClick={() => handleSortOcupacion('nombre_evento')} style={{ cursor: "pointer", userSelect: "none" }}>
                                            Evento {sortConfigOcupacion.key === 'nombre_evento' ? (sortConfigOcupacion.direction === 'asc' ? '🔼' : '🔽') : '↕️'}
                                        </th>
                                        <th style={{ textAlign: "center" }}>Tipo</th>
                                        <th onClick={() => handleSortOcupacion('inscriptos_pagos')} style={{ textAlign: "center", cursor: "pointer", userSelect: "none" }}>
                                            Inscriptos {sortConfigOcupacion.key === 'inscriptos_pagos' ? (sortConfigOcupacion.direction === 'asc' ? '🔼' : '🔽') : '↕️'}
                                        </th>
                                        <th onClick={() => handleSortOcupacion('reservados_no_pagos')} style={{ textAlign: "center", cursor: "pointer", userSelect: "none" }}>
                                            Reservas {sortConfigOcupacion.key === 'reservados_no_pagos' ? (sortConfigOcupacion.direction === 'asc' ? '🔼' : '🔽') : '↕️'}
                                        </th>
                                        <th onClick={() => handleSortOcupacion('cupo_maximo')} style={{ textAlign: "center", cursor: "pointer", userSelect: "none" }}>
                                            Cupo Max {sortConfigOcupacion.key === 'cupo_maximo' ? (sortConfigOcupacion.direction === 'asc' ? '🔼' : '🔽') : '↕️'}
                                        </th>
                                        <th onClick={() => handleSortOcupacion('tasa_ocupacion')} style={{ cursor: "pointer", userSelect: "none" }}>
                                            Ocupación {sortConfigOcupacion.key === 'tasa_ocupacion' ? (sortConfigOcupacion.direction === 'asc' ? '🔼' : '🔽') : '↕️'}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* ATENCIÓN ACÁ: Cambiamos el .map para que use sortedOcupacion */}
                                    {sortedOcupacion.map((evt: any, i: number) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: "bold" }}>{evt.nombre_evento}</td>
                                            <td style={{ textAlign: "center" }}>
                                                <span className="badge-tipo" style={{ backgroundColor: evt.es_pago ? "#3b82f6" : "#64748b" }}>
                                                    {evt.es_pago ? "Pago" : "Gratuito"}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: "center", color: "#4ade80", fontWeight: "bold" }}>{evt.inscriptos_pagos}</td>
                                            <td style={{ textAlign: "center", color: "#fbbf24", fontWeight: "bold" }}>{evt.reservados_no_pagos}</td>
                                            <td style={{ textAlign: "center" }}>{evt.cupo_maximo}</td>
                                            <td style={{ width: "250px" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                    <div style={{ flex: 1, height: "10px", backgroundColor: "#e2e8f0", borderRadius: "5px", overflow: "hidden", display: "flex" }}>
                                                        <div style={{ width: `${(evt.inscriptos_pagos / evt.cupo_maximo) * 100}%`, height: "100%", backgroundColor: "#4ade80" }} />
                                                        <div style={{ width: `${(evt.reservados_no_pagos / evt.cupo_maximo) * 100}%`, height: "100%", backgroundColor: "#fbbf24" }} />
                                                    </div>
                                                    <span style={{ fontSize: "0.85rem", fontWeight: "bold" }}>{evt.tasa_ocupacion}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {!(reporteData?.top_ocupacion?.length) && <p className="no-data">Sin datos disponibles.</p>}
                        </div>
                    </div>
                </div>

            </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            MODAL DEL DASHBOARD SUPERVISOR
        ════════════════════════════════════════════════════════════════ */}
        {modalDashboard.isOpen && (
            <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "center" }}>
                {/* Cambiamos el fondo a un azul noche oscuro (#1e293b) para que la letra clara se lea perfecto */}
                <div style={{ backgroundColor: "#1e293b", padding: "24px", borderRadius: "12px", width: "90%", maxWidth: "800px", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 10px 25px rgba(0,0,0,0.5)", border: "1px solid #334155" }}>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "2px solid #334155", paddingBottom: "10px" }}>
                        {/* Título en color blanco/hielo */}
                        <h3 style={{ margin: 0, color: "#f8fafc" }}>{modalDashboard.title}</h3>
                        {/* Botón de cerrar en gris claro */}
                        <button onClick={() => setModalDashboard({ isOpen: false, title: "", data: [] })} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#94a3b8" }}>✖</button>
                    </div>

                    {modalDashboard.data.length > 0 ? (
                        <table className="tabla-reportes-custom">
                            <thead>
                                <tr>
                                    <th style={{ color: "#f8fafc" }}>Evento</th>
                                    <th style={{ color: "#f8fafc" }}>Fecha</th>
                                    <th style={{ color: "#f8fafc" }}>Responsable</th>
                                    <th style={{ color: "#f8fafc" }}>Pertenencia</th>
                                </tr>
                            </thead>
                            <tbody>
                                {modalDashboard.data.map((evt: any) => (
                                    <tr key={evt.id_evento} style={{ borderBottom: "1px solid #334155" }}>
                                        <td style={{ fontWeight: "bold", color: "#e2e8f0" }}>{evt.nombre_evento}</td>
                                        <td style={{ color: "#cbd5e1" }}>
                                        {evt.fecha_evento && evt.fecha_evento !== "Sin fecha" 
                                            ? evt.fecha_evento.split('-').reverse().join('-') 
                                            : evt.fecha_evento}
                                        </td>
                                        <td style={{ color: "#cbd5e1" }}>{evt.responsable}</td>
                                        <td>
                                          <span className="badge-tipo" style={{ 
                                                backgroundColor: evt.pertenencia === "Propio" ? "#8b5cf6" : "#f59e0b",
                                                color: "#ffffff"
                                            }}>
                                                {evt.pertenencia}
                                          </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p style={{ textAlign: "center", color: "#94a3b8", fontSize: "1.1rem" }}>No hay eventos para mostrar en esta categoría.</p>
                    )}
                </div>
            </div>
        )}
        {/* ════════════════════════════════════════════════════════════════
            ROL 3 — ORGANIZACIÓN EXTERNA
        ════════════════════════════════════════════════════════════════ */}
        {usuarioRol === 3 && (
          <div style={{ marginTop: "20px" }}>

            {/* Acordeón: mis solicitudes por estado */}
            {(reporteData?.lista_eventos_detallada ?? []).length > 0 && (
              <div className="grafico-card grafico-card--wide" id="lista_eventos_detallada">
                <div className="grafico-card__header">
                  <h3>📋 Mis Solicitudes por Estado</h3>
                </div>
                <div className="grafico-card__body">
                  {[2, 3, 4, 5, 6].map((idEstado: number) => {
                    const items = sortedLista(
                      (reporteData?.lista_eventos_detallada ?? []).filter((e: any) => e.estado === idEstado)
                    );
                    if (!items.length) return null;
                    const isOpen = estadoAbierto === idEstado;
                    const bc = idEstado === 3 ? "#4ade80" : idEstado === 2 ? "#fbbf24" : "#e74c3c";

                    return (
                      <div key={idEstado} style={{ marginBottom: "10px", border: "1px solid #333", borderRadius: "8px", overflow: "hidden" }}>
                        <div
                          onClick={() => setEstadoAbierto(isOpen ? null : idEstado)}
                          style={{
                            padding: "15px", backgroundColor: "#252525",
                            display: "flex", justifyContent: "space-between",
                            alignItems: "center", cursor: "pointer",
                            borderLeft: `4px solid ${bc}`,
                          }}
                        >
                          <span style={{ fontWeight: "bold", fontSize: "1rem" }}>
                            {getNombreEstado(idEstado).toUpperCase()} ({items.length})
                          </span>
                          <span style={{ transition: "transform 0.3s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                            ▼
                          </span>
                        </div>

                        {isOpen && (
                          <div style={{ padding: "10px", backgroundColor: "#1a1a1a" }}>
                            <div className="table-responsive">
                              <table className="tabla-reportes-custom">
                                <thead>
                                  <tr>
                                    <th style={{ cursor: "pointer" }} onClick={() => handleSort("nombre")}>
                                      Evento{si("nombre")}
                                    </th>
                                    <th style={{ cursor: "pointer" }} onClick={() => handleSort("fecha")}>
                                      Fecha{si("fecha")}
                                    </th>
                                    <th>Tipo</th>
                                    <th style={{ textAlign: "center", cursor: "pointer" }} onClick={() => handleSort("reservas")}>
                                      Cupo / Reservas{si("reservas")}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map((evt: any) => (
                                    <tr key={evt.id}>
                                      <td style={{ fontWeight: "bold" }}>{evt.nombre}</td>
                                      <td>{evt.fecha}</td>
                                      <td><span className="badge-tipo">{evt.tipo}</span></td>
                                      <td style={{ textAlign: "center" }}>
                                        <div className="reservas-indicator">
                                          {evt.reservas}{evt.cupo_maximo ? ` / ${evt.cupo_maximo}` : ""}
                                        </div>
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
            )}

            {/* ── FILA 1 (100%): Popularidad por Categoría ───────────── */}
            <div className="grafico-card grafico-card--wide" style={{ marginTop: "24px" }}>
              <div className="grafico-card__header">
                <h3>📈 Popularidad por Categoría de Mis Eventos</h3>
                <p style={{ fontSize: "0.8rem", color: "#888" }}>
                  Distribución de inscritos según el tipo de actividad que organizás.
                </p>
                <button
                  data-html2canvas-ignore="true"
                  onClick={() => handleExportarCSV("rendimiento_categorias")}
                  className="btn-export"
                >
                  📥 CSV
                </button>
              </div>
              <div className="grafico-card__body">
                {renderGraficoTorta(reporteData?.rendimiento_por_tipo ?? [], "tipo", "cantidad")}
                <div className="insight-text" style={{ marginTop: "20px" }}>
                  {(reporteData?.rendimiento_por_tipo ?? []).length > 0 ? (
                    <>
                      💡 Tu categoría más buscada es{" "}
                      <strong>
                        {[...(reporteData?.rendimiento_por_tipo ?? [])]
                          .sort((a: any, b: any) => b.cantidad - a.cantidad)[0]?.tipo}
                      </strong>
                    </>
                  ) : (
                    "💡 No hay datos suficientes para determinar una tendencia."
                  )}
                </div>
              </div>
            </div>

            {/* ── FILA 2: Tarjeta filtros + tarjeta totales ───────────── */}
            <div className="reportes-graficos" style={{ marginTop: "24px" }}>

              {/* Tarjeta izquierda: resumen + filtros de recaudación */}
              <div className="grafico-card">
                <div className="grafico-card__header">
                  <h3>💰 Recaudación Total</h3>
                  <p style={{ fontSize: "0.8rem", color: "#888" }}>
                    Todos los eventos — gratuitos muestran $0
                  </p>
                </div>
                <div className="grafico-card__body" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ fontSize: "3.2rem", fontWeight: "bold", color: "#4ade80" }}>
                    ${totalRecaudacionFiltrado.toLocaleString("es-AR")}
                  </span>
                  <p style={{ color: "#ccc", marginTop: "8px" }}>
                    {detalleRecaudacionFiltrado.length} eventos en la vista
                  </p>

                  {/* Búsqueda */}
                  <input
                    type="text"
                    placeholder="🔍 Buscar evento..."
                    value={busquedaEvento}
                    onChange={(e) => setBusquedaEvento(e.target.value)}
                    style={{
                      width: "100%", padding: "10px", marginTop: "16px",
                      background: "#0d0d0d", border: "1px solid #4ade80",
                      borderRadius: "6px", color: "#fff", fontSize: "0.9rem",
                    }}
                  />

                  {/* Filtro estado */}
                  <select
                    value={filtroEstadoRecaudacion}
                    onChange={(e) => setFiltroEstadoRecaudacion(e.target.value as any)}
                    style={{
                      width: "100%", padding: "10px", marginTop: "10px",
                      background: "#0d0d0d", border: "1px solid #4ade80",
                      borderRadius: "6px", color: "#fff", fontSize: "0.9rem", cursor: "pointer",
                    }}
                  >
                    <option value="todos">📊 Todos los Eventos</option>
                    <option value="activos">🟢 Solo Activos (Publicados)</option>
                    <option value="pasados">🔵 Solo Finalizados</option>
                  </select>

                  {/* Filtro tipo */}
                  <select
                    value={filtroTipoRecaudacion}
                    onChange={(e) => setFiltroTipoRecaudacion(e.target.value)}
                    style={{
                      width: "100%", padding: "10px", marginTop: "10px",
                      background: "#0d0d0d", border: "1px solid #4ade80",
                      borderRadius: "6px", color: "#fff", fontSize: "0.9rem", cursor: "pointer",
                    }}
                  >
                    <option value="">🚴 Todos los Tipos</option>
                    {TIPOS_EVENTO.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Tarjeta derecha: métricas globales */}
              <div className="grafico-card" style={{ display: "flex", flexDirection: "column", gap: "16px", justifyContent: "center" }}>
                {[
                  { label: "Recaudación total sistema", value: `$${(reporteData?.recaudacion_total ?? 0).toLocaleString("es-AR")}`, color: "#4ade80" },
                  { label: "Total reservas recibidas", value: String(reporteData?.total_reservas_recibidas ?? 0), color: "#60a5fa" },
                  { label: "Mis eventos creados", value: String(reporteData?.mis_eventos_total ?? 0), color: "#fbbf24" },
                ].map((card) => (
                  <div key={card.label} style={{ background: "#252525", borderRadius: "8px", padding: "20px" }}>
                    <p style={{ margin: 0, color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {card.label}
                    </p>
                    <p style={{ margin: "6px 0 0", color: card.color, fontWeight: "bold", fontSize: "2rem" }}>
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── TABLA DETALLE RECAUDACIÓN PRO ───────────────────────── */}
            <div className="grafico-card grafico-card--wide" style={{ marginTop: "20px" }}>
              <div className="grafico-card__header">
                <h3>📊 Detalle de Recaudación por Evento</h3>
                <button
                  data-html2canvas-ignore="true"
                  onClick={() => handleExportarCSV("detalle_recaudacion")}
                  className="btn-export"
                >
                  📥 Exportar CSV
                </button>
              </div>
              <div className="grafico-card__body">
                {detalleRecaudacionFiltrado.length === 0 ? (
                  <p className="no-data">Sin eventos para mostrar con los filtros actuales.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="tabla-reportes-custom">
                      <thead>
                        <tr>
                          <th style={{ cursor: "pointer" }} onClick={() => handleSortFin("nombre")}>
                            Evento{sif("nombre")}
                          </th>
                          <th style={{ cursor: "pointer" }} onClick={() => handleSortFin("fecha")}>
                            Fecha{sif("fecha")}
                          </th>
                          <th>Tipo</th>
                          <th style={{ textAlign: "center", cursor: "pointer" }} onClick={() => handleSortFin("cupo")}>
                            Cupo{sif("cupo")}
                          </th>
                          <th style={{ textAlign: "right", cursor: "pointer" }} onClick={() => handleSortFin("unitario")}>
                            Valor Unit.{sif("unitario")}
                          </th>
                          <th style={{ textAlign: "right", cursor: "pointer" }} onClick={() => handleSortFin("monto")}>
                            Monto Total{sif("monto")}
                          </th>
                          <th style={{ textAlign: "center" }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalleRecaudacionFiltrado.map((item: DetalleRecaudacion, idx: number) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: "bold" }}>{item.nombre_evento}</td>
                            <td>{new Date(item.fecha_evento).toLocaleDateString("es-AR")}</td>
                            <td><span className="badge-tipo">{item.tipo}</span></td>
                            <td style={{ textAlign: "center" }}>
                              <div className="reservas-indicator">
                                {item.inscriptos_count}
                                {item.cupo_maximo ? ` / ${item.cupo_maximo}` : ""}
                              </div>
                            </td>
                            <td style={{ textAlign: "right", color: "#ccc" }}>
                              {item.monto_unitario === 0
                                ? "Gratis"
                                : `$${item.monto_unitario.toLocaleString("es-AR")}`}
                            </td>
                            <td style={{ textAlign: "right", color: "#4ade80", fontWeight: "bold" }}>
                              ${item.monto.toLocaleString("es-AR")}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <button
                                onClick={() => setEventoDetalle(item)}
                                style={{
                                  padding: "5px 12px", background: "transparent",
                                  border: "1px solid #4ade80", borderRadius: "6px",
                                  color: "#4ade80", cursor: "pointer",
                                  fontSize: "0.8rem", fontWeight: "bold", whiteSpace: "nowrap",
                                }}
                              >
                                Ver más →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: "2px solid #4ade80" }}>
                          <td colSpan={5} style={{ textAlign: "right", fontWeight: "bold", fontSize: "1.1rem" }}>
                            TOTAL FILTRADO:
                          </td>
                          <td style={{ textAlign: "right", color: "#4ade80", fontWeight: "bold", fontSize: "1.2rem" }}>
                            ${totalRecaudacionFiltrado.toLocaleString("es-AR")}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
            </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
             ROL 4 — CLIENTE
        ════════════════════════════════════════════════════════════════ */}
        {usuarioRol === 4 && reporteData && (
          <SeccionCliente 
            data={reporteData} 
            onExport={handleExportarCSV} 
          />
        )}

        {/* ════════════════════════════════════════════════════════════════
            ADMIN / SUPERVISOR — Gráficos del sistema
        ════════════════════════════════════════════════════════════════ */}
        <div className="reportes-graficos">

          {usuarioRol <= 2 && (reporteData?.eventos_por_mes ?? []).length > 0 && (
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
              <div className="grafico-card__body">
                {renderGraficoLinea(reporteData?.eventos_por_mes ?? [])}
              </div>
            </div>
          )}

          {usuarioRol <= 2 && (reporteData?.eventos_por_tipo ?? []).length > 0 && (
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
                {renderGraficoTorta(reporteData?.eventos_por_tipo ?? [], "tipo", "cantidad")}
              </div>
            </div>
          )}

          {usuarioRol <= 2 && (reporteData?.eventos_por_dificultad ?? []).length > 0 && (
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
                {renderGraficoTorta(reporteData?.eventos_por_dificultad ?? [], "dificultad", "cantidad")}
              </div>
            </div>
          )}

          {usuarioRol <= 2 && (reporteData?.eventos_por_ubicacion ?? []).length > 0 && (
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
              <div className="grafico-card__body" style={{ overflowY: "auto", maxHeight: "300px" }}>
                {renderRankingHorizontal(reporteData?.eventos_por_ubicacion ?? [], "ubicacion", "cantidad")}
              </div>
            </div>
          )}

          {usuarioRol === 1 && (reporteData?.usuarios_por_rol ?? []).length > 0 && (
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
              <div className="grafico-card__body">
                {renderGraficoPie(reporteData?.usuarios_por_rol ?? [], "rol", "cantidad", getNombreRol)}
              </div>
            </div>
          )}

          {usuarioRol <= 2 && (
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
                <p style={{ fontSize: "0.9rem", color: "#e0e0e0" }}>
                  Registro de intervenciones administrativas sobre eventos y usuarios.
                </p>
                <div className="audit-badge">Auditoría Activa</div>
              </div>
            </div>
          )}

        </div>
        {/* fin .reportes-graficos */}

        {/* ════════════════════════════════════════════════════════════════
            TENDENCIAS POR UBICACIÓN — visible para todos los roles
        ════════════════════════════════════════════════════════════════ */}
        {tendenciasFiltradas.length > 0 && (
          <div className="grafico-card grafico-card--wide" style={{ marginTop: "30px" }}>
            <div className="grafico-card__header">
              <h3>🗺️ Tendencias por Ubicación — Análisis de Mercado (Top 10)</h3>
              <p style={{ fontSize: "0.8rem", color: "#888", marginTop: "5px" }}>
                Datos globales del sistema para análisis estratégico de zonas con mayor actividad.
              </p>
            </div>

            {/* Tabs Activos / Pasados + filtro Tipo */}
            <div
              style={{
                display: "flex", gap: "10px", padding: "15px 20px",
                borderBottom: "1px solid #333", flexWrap: "wrap", alignItems: "center",
              }}
            >
              {(["activos", "pasados"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTabTendencias(tab)}
                  style={{
                    padding: "8px 16px",
                    background: tabTendencias === tab ? "#4ade80" : "transparent",
                    border: `2px solid ${tabTendencias === tab ? "#4ade80" : "#666"}`,
                    borderRadius: "6px",
                    color: tabTendencias === tab ? "#000" : "#fff",
                    fontWeight: "bold",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {tab === "activos" ? "📈 Eventos Activos" : "📊 Eventos Pasados"}
                </button>
              ))}

              <select
                value={filtroTipoTendencias}
                onChange={(e) => setFiltroTipoTendencias(e.target.value)}
                style={{
                  padding: "8px 14px",
                  background: "#0d0d0d",
                  border: "2px solid #666",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                <option value="">🚴 Todos los Tipos</option>
                {TIPOS_EVENTO.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Lista de provincias */}
            <div className="grafico-card__body" style={{ padding: "20px" }}>
              {tendenciasFiltradas
                .sort((a: any, b: any) => b.total_eventos - a.total_eventos)
                .slice(0, 10)
                .map((prov: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      marginBottom: "15px",
                      border: "1px solid #333",
                      borderRadius: "8px",
                      overflow: "hidden",
                    }}
                  >
                    {/* Fila provincia */}
                    <div
                      onClick={() =>
                        setProvinciaExpandida(
                          provinciaExpandida === prov.provincia ? null : prov.provincia
                        )
                      }
                      style={{
                        padding: "15px",
                        background: "#252525",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        borderLeft: "4px solid #4ade80",
                      }}
                    >
                      <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                        {prov.provincia.toUpperCase()}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                        <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#4ade80" }}>
                          {prov.localidades.reduce(
                            (s: number, loc: any) => s + loc.eventos.length, 0
                          )}{" "}
                          eventos
                        </span>
                        <span
                          style={{
                            transition: "transform 0.3s",
                            transform:
                              provinciaExpandida === prov.provincia
                                ? "rotate(180deg)"
                                : "rotate(0deg)",
                          }}
                        >
                          ▼
                        </span>
                      </div>
                    </div>

                    {/* Panel de localidades */}
                    {provinciaExpandida === prov.provincia && (
                      <div style={{ padding: "10px 20px", background: "#1a1a1a" }}>
                        {prov.localidades.map((loc: any, li: number) => {
                          const locKey = `${prov.provincia}-${loc.localidad}`;
                          return (
                            <div key={li} style={{ marginBottom: "10px" }}>

                              {/* Fila localidad */}
                              <div
                                onClick={() =>
                                  setLocalidadExpandida(
                                    localidadExpandida === locKey ? null : locKey
                                  )
                                }
                                style={{
                                  padding: "12px",
                                  background: "#2d2d2d",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  border: "1px solid #444",
                                }}
                              >
                                <span style={{ fontWeight: 500, color: "#e0e0e0" }}>
                                  {loc.localidad}
                                </span>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <span style={{ color: "#4ade80", fontWeight: "bold" }}>
                                    {loc.eventos.length} eventos
                                  </span>
                                  <span style={{ fontSize: "0.8rem", color: "#888" }}>
                                    {localidadExpandida === locKey ? "▲" : "▼"}
                                  </span>
                                </div>
                              </div>

                              {/* Lista de eventos de la localidad */}
                              {localidadExpandida === locKey && (
                                <div style={{ marginTop: "5px", marginLeft: "20px" }}>
                                  {loc.eventos.map((evt: any, ei: number) => (
                                    <div
                                      key={ei}
                                      style={{
                                        padding: "10px 14px",
                                        background: "#1a1a1a",
                                        marginBottom: "5px",
                                        borderRadius: "6px",
                                        fontSize: "0.85rem",
                                        border: "1px solid #2a2a2a",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                        gap: "8px",
                                      }}
                                    >
                                      <span style={{ color: "#e0e0e0", fontWeight: 500 }}>
                                        {evt.nombre}
                                      </span>
                                      <div
                                        style={{
                                          display: "flex",
                                          gap: "16px",
                                          color: "#888",
                                          flexWrap: "wrap",
                                          fontSize: "0.82rem",
                                        }}
                                      >
                                        <span
                                          style={{
                                            background: "#252525",
                                            padding: "2px 8px",
                                            borderRadius: "4px",
                                            color: "#a78bfa",
                                          }}
                                        >
                                          {evt.tipo}
                                        </span>
                                        <span>🚴 {evt.distancia_km} km</span>
                                        <span>
                                          📅{" "}
                                          {new Date(evt.fecha_evento).toLocaleDateString("es-AR")}
                                        </span>
                                        <span
                                          style={{
                                            color: evt.estado === 3 ? "#4ade80" : "#60a5fa",
                                            fontWeight: "bold",
                                          }}
                                        >
                                          {evt.estado === 3 ? "● Activo" : "● Finalizado"}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}

              {tendenciasFiltradas.length === 0 && (
                <p className="no-data">
                  No hay eventos {tabTendencias === "activos" ? "activos" : "finalizados"} para mostrar
                  {filtroTipoTendencias ? ` del tipo "${filtroTipoTendencias}"` : ""}.
                </p>
              )}
            </div>
          </div>
        )}

      </div>
      {/* fin .reportes-page__container */}

      <Footer />
    </div>
  );
}