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
  tendencias_ubicacion_completa?: any[];
  top_10_recaudacion?: any[];
  usuarios_nuevos?: any[];
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

  // --- Estados para Admin (Nuevos Reportes) ---
  const [filtroPertenenciaAdmin, setFiltroPertenenciaAdmin] = useState<'Todos' | 'Propio' | 'Externo'>('Todos');
  // Estado para el Modal de Detalles de Gráficos de Torta
  const [modalFiltroTorta, setModalFiltroTorta] = useState<{ titulo: string, filtroKey: string, valor: string } | null>(null);
  const [modalAdminEvento, setModalAdminEvento] = useState<any | null>(null);
  // Estado para el Modal de Análisis Financiero
  const [modalFinanciero, setModalFinanciero] = useState<boolean>(false);
  // Estados para los Modales de Eventos y Participantes
  const [modalEventosGlobal, setModalEventosGlobal] = useState<boolean>(false);
  const [modalParticipantes, setModalParticipantes] = useState<boolean>(false);
  
  
  // Cálculos para las tarjetas

  
  // --- Estados para Usuarios y Mapa de Calor ---
  const [mesExpandido, setMesExpandido] = useState<string | null>(null);
  const [provinciaExpandidaAdmin, setProvinciaExpandidaAdmin] = useState<string | null>(null);

  // 1. Agrupar usuarios nuevos por Mes (MM/YYYY) y por Día
  const usuariosPorMes = (reporteData?.usuarios_nuevos || []).reduce((acc: any, user: any) => {
      const fc = user.fecha_creacion || ""; // Viene como "DD/MM/YYYY"
      const partes = fc.split('/');
      let mesAnio = "Sin Fecha";
      let dia = "";
      
      if (partes.length === 3) {
          mesAnio = `${partes[1]}/${partes[2]}`; // "MM/YYYY"
          dia = partes[0]; // "DD"
      }

      // Si el mes no existe en nuestro objeto, lo creamos
      if (!acc[mesAnio]) {
          acc[mesAnio] = { total: 0, usuarios: [], dias: {} };
      }
      
      acc[mesAnio].total += 1;
      acc[mesAnio].usuarios.push(user);
      
      // Contabilizamos por día
      if (dia) {
          if (!acc[mesAnio].dias[dia]) acc[mesAnio].dias[dia] = { clientes: 0, organizaciones: 0 };
          if (user.rol === 'Cliente') acc[mesAnio].dias[dia].clientes += 1;
          else acc[mesAnio].dias[dia].organizaciones += 1;
      }
      
      return acc;
  }, {});

  // Ordenar los meses de más reciente a más viejo
  const mesesOrdenados = Object.keys(usuariosPorMes).sort((a, b) => {
      if (a === "Sin Fecha") return 1;
      if (b === "Sin Fecha") return -1;
      const [mesA, anioA] = a.split('/');
      const [mesB, anioB] = b.split('/');
      if (anioA !== anioB) return parseInt(anioB) - parseInt(anioA);
      return parseInt(mesB) - parseInt(mesA);
  });

  // 3. Calcular el máximo de eventos en una provincia para dibujar la barra de calor
  const maxEventosProvincia = Math.max(...(reporteData?.tendencias_ubicacion_completa?.map((p: any) => p.total_eventos) || [1]));

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

  // ── Gráficos ──────────────────────────────────────────────────────────────
  const renderGraficoTorta = (datos: any[], keyName: string, valName: string, tituloModal: string) => {
    if (!datos || datos.length === 0) return <p className="no-data">No hay datos</p>;

    const total = datos.reduce((sum, item) => sum + Number(item[valName]), 0);
    let acumulado = 0;
    const colores = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

    return (
      <div style={{ display: "flex", alignItems: "center", gap: "20px", width: "100%", justifyContent: "center" }}>
        {/* Gráfico SVG Interactivo */}
        <svg viewBox="0 0 32 32" style={{ width: "150px", height: "150px", borderRadius: "50%", transform: "rotate(-90deg)" }}>
          {datos.map((item, index) => {
            const valor = Number(item[valName]);
            const porcentaje = valor / total;
            const dasharray = `${porcentaje * 100} 100`;
            const dashoffset = -acumulado * 100;
            acumulado += porcentaje;
            
            return (
              <circle
                key={index}
                r="15.91549431" cx="16" cy="16"
                fill="none"
                stroke={colores[index % colores.length]}
                strokeWidth="32"
                strokeDasharray={dasharray}
                strokeDashoffset={dashoffset}
                style={{ cursor: "pointer", transition: "opacity 0.2s" }}
                onMouseOver={(e) => e.currentTarget.style.opacity = "0.8"}
                onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
                onClick={() => setModalFiltroTorta({ titulo: tituloModal, filtroKey: keyName, valor: item[keyName] })}
              >
                {/* TOOLTIP NATIVO (Aparece al apoyar el mouse) */}
                <title>{item[keyName]}: {valor} eventos ({(porcentaje * 100).toFixed(1)}%)</title>
              </circle>
            );
          })}
        </svg>

        {/* Leyenda Interactiva */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {datos.map((item, index) => (
            <div 
                key={index} 
                style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem", color: "#cbd5e1", cursor: "pointer" }}
                onClick={() => setModalFiltroTorta({ titulo: tituloModal, filtroKey: keyName, valor: item[keyName] })}
                title={`Ver detalles de ${item[keyName]}`}
            >
              <div style={{ width: "14px", height: "14px", backgroundColor: colores[index % colores.length], borderRadius: "3px" }}></div>
              <span style={{ fontWeight: "bold", color: "#f8fafc" }}>{item[keyName]}</span> 
              <span style={{ color: "#94a3b8" }}>({item[valName]})</span>
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

  // 💰 CÁLCULOS FINANCIEROS GLOBALES
  const eventosDetalle = reporteData?.lista_eventos_detallada || [];
  const totalRecaudadoGlobal = eventosDetalle.reduce((acc, ev) => acc + (Number(ev.monto_recaudado) || 0), 0);
  const recaudadoPropios = eventosDetalle.filter((ev) => ev.pertenencia === "Propio").reduce((acc, ev) => acc + (Number(ev.monto_recaudado) || 0), 0);
  const recaudadoExternos = eventosDetalle.filter((ev) => ev.pertenencia === "Externo").reduce((acc, ev) => acc + (Number(ev.monto_recaudado) || 0), 0);
  const cantidadGratuitos = eventosDetalle.filter((ev) => Number(ev.costo_participacion) === 0).length;
  const cantidadPagos = eventosDetalle.length - cantidadGratuitos;
  // 📅 CÁLCULOS: EVENTOS GLOBALES
  const totalEventosGlobal = eventosDetalle.length;
  const hoyStr = new Date().toISOString().split('T')[0];
  const eventosFuturos = eventosDetalle.filter((ev: any) => ev.fecha_evento >= hoyStr && ev.fecha_evento !== "Sin fecha").length;
  const eventosPasados = totalEventosGlobal - eventosFuturos;
  const eventosPropiosCount = eventosDetalle.filter((ev: any) => ev.pertenencia === "Propio").length;
  const eventosExternosCount = eventosDetalle.filter((ev: any) => ev.pertenencia === "Externo").length;

  // 👥 CÁLCULOS: PARTICIPANTES Y AUDIENCIA
  const totalConfirmadas = eventosDetalle.reduce((acc: number, ev: any) => acc + (Number(ev.inscripciones_confirmadas) || 0), 0);
  const totalReservas = eventosDetalle.reduce((acc: number, ev: any) => acc + (Number(ev.reservas_totales) || 0), 0);
  const totalPendientes = Math.max(0, totalReservas - totalConfirmadas); // Los que reservaron pero no pagaron/confirmaron
  const promedioParticipantes = totalEventosGlobal > 0 ? Math.round(totalConfirmadas / totalEventosGlobal) : 0;
  const cupoTotalSistema = eventosDetalle.reduce((acc: number, ev: any) => acc + (Number(ev.cupo_maximo) || 0), 0);
  const ocupacionGlobal = cupoTotalSistema > 0 ? ((totalConfirmadas / cupoTotalSistema) * 100).toFixed(1) : "0";
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
        {(usuarioRol === 1 ) && (
          <>
            <div style={{ display: "flex", gap: "20px", marginBottom: "40px", flexWrap: "wrap" }}>
                
                {/* ════════════════════════════════════════════════════════════════
              NUEVAS TARJETAS: EVENTOS Y PARTICIPANTES (ESTILO FINANCIERO)
          ════════════════════════════════════════════════════════════════ */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "20px", width: "100%", marginBottom: "20px" }}>
            
            {/* TARJETA 1: GESTIÓN DE EVENTOS */}
            <div className="grafico-card" style={{ margin: 0 }}>
              <div className="grafico-card__header">
                <h3>📅 Total Eventos del Sistema</h3>
                <button onClick={() => setModalEventosGlobal(true)} className="btn-export" style={{ backgroundColor: "#3b82f6", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
                  Ver Directorio
                </button>
              </div>
              <div className="grafico-card__body" style={{ flexDirection: "column", gap: "15px", display: "flex", padding: "20px" }}>
                
                <div style={{ textAlign: "center", padding: "15px", backgroundColor: "#1e293b", borderRadius: "8px", border: "1px solid #334155" }}>
                    <p style={{ margin: 0, color: "#94a3b8", fontSize: "1rem", textTransform: "uppercase" }}>Eventos Creados</p>
                    <h2 style={{ margin: "5px 0 0 0", color: "#f8fafc", fontSize: "3rem", textShadow: "0 2px 10px rgba(255,255,255,0.1)" }}>
                      {totalEventosGlobal}
                    </h2>
                    <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginTop: "15px", fontSize: "0.9rem" }}>
                      <span style={{ color: "#3b82f6", backgroundColor: "rgba(59, 130, 246, 0.1)", padding: "5px 10px", borderRadius: "20px" }}>
                        🚀 {eventosFuturos} Próximos
                      </span>
                      <span style={{ color: "#94a3b8", backgroundColor: "rgba(148, 163, 184, 0.1)", padding: "5px 10px", borderRadius: "20px" }}>
                        ✅ {eventosPasados} Finalizados
                      </span>
                    </div>
                </div>

                <details style={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "1px solid #334155", padding: "15px", cursor: "pointer" }}>
                    <summary style={{ fontWeight: "bold", color: "#f8fafc", outline: "none", fontSize: "1rem" }}>
                      📊 Origen de los Eventos <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: "normal" }}>(Clic para expandir)</span>
                    </summary>
                    <div style={{ display: "flex", justifyContent: "space-around", marginTop: "15px", paddingTop: "15px", borderTop: "1px solid #334155" }}>
                      <div style={{ textAlign: "center" }}>
                          <h3 style={{ margin: 0, color: "#8b5cf6", fontSize: "1.5rem" }}>{eventosPropiosCount}</h3>
                          <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.9rem" }}>Propios</p>
                      </div>
                      <div style={{ width: "1px", backgroundColor: "#334155" }}></div>
                      <div style={{ textAlign: "center" }}>
                          <h3 style={{ margin: 0, color: "#eab308", fontSize: "1.5rem" }}>{eventosExternosCount}</h3>
                          <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.9rem" }}>Externos</p>
                      </div>
                    </div>
                </details>
              </div>
            </div>

            {/* TARJETA 2: PARTICIPANTES Y AUDIENCIA */}
            <div className="grafico-card" style={{ margin: 0 }}>
              <div className="grafico-card__header">
                <h3>👥 Impacto y Participación</h3>
                <button onClick={() => setModalParticipantes(true)} className="btn-export" style={{ backgroundColor: "#8b5cf6", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
                  Ver Ocupación
                </button>
              </div>
              <div className="grafico-card__body" style={{ flexDirection: "column", gap: "15px", display: "flex", padding: "20px" }}>
                
                <div style={{ textAlign: "center", padding: "15px", backgroundColor: "#1e293b", borderRadius: "8px", border: "1px solid #334155" }}>
                    <p style={{ margin: 0, color: "#94a3b8", fontSize: "1rem", textTransform: "uppercase" }}>Inscripciones Confirmadas</p>
                    <h2 style={{ margin: "5px 0 0 0", color: "#4ade80", fontSize: "3rem", textShadow: "0 2px 10px rgba(74, 222, 128, 0.2)" }}>
                      {totalConfirmadas}
                    </h2>
                    <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginTop: "15px", fontSize: "0.9rem" }}>
                      <span style={{ color: "#f97316", backgroundColor: "rgba(249, 115, 22, 0.1)", padding: "5px 10px", borderRadius: "20px" }}>
                        ⏳ {totalPendientes} Reservas sin pagar
                      </span>
                    </div>
                </div>

                <details style={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "1px solid #334155", padding: "15px", cursor: "pointer" }}>
                    <summary style={{ fontWeight: "bold", color: "#f8fafc", outline: "none", fontSize: "1rem" }}>
                      📈 Métricas de Ocupación <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: "normal" }}>(Clic para expandir)</span>
                    </summary>
                    <div style={{ display: "flex", justifyContent: "space-around", marginTop: "15px", paddingTop: "15px", borderTop: "1px solid #334155" }}>
                      <div style={{ textAlign: "center" }}>
                          <h3 style={{ margin: 0, color: "#38bdf8", fontSize: "1.5rem" }}>{promedioParticipantes}</h3>
                          <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.85rem" }}>Promedio de Participantes</p>
                      </div>
                      <div style={{ width: "1px", backgroundColor: "#334155" }}></div>
                      <div style={{ textAlign: "center" }}>
                          <h3 style={{ margin: 0, color: "#ec4899", fontSize: "1.5rem" }}>{ocupacionGlobal}%</h3>
                          <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.85rem" }}>% de Ocupación Global</p>
                      </div>
                    </div>
                </details>
              </div>
            </div>

          </div>

                {/* ════════════════════════════════════════════════════════════════
              NUEVA TARJETA: ANÁLISIS FINANCIERO GLOBAL
          ════════════════════════════════════════════════════════════════ */}
          {usuarioRol <= 2 && (
            <div className="grafico-card" style={{ gridColumn: "1 / -1" }}> {/* Ocupa todo el ancho si querés, o sacale el gridColumn */}
              <div className="grafico-card__header">
                <h3>💰 Análisis Financiero Global</h3>
                <button 
                  onClick={() => setModalFinanciero(true)} 
                  className="btn-export" 
                  style={{ backgroundColor: "#10b981", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
                >
                  Ver Detalles de Ingresos
                </button>
              </div>
              
              <div className="grafico-card__body" style={{ flexDirection: "column", gap: "15px", display: "flex" }}>
                
                {/* Indicador Principal: Total Global */}
                <div style={{ textAlign: "center", padding: "20px", backgroundColor: "#1e293b", borderRadius: "8px", border: "1px solid #334155" }}>
                    <p style={{ margin: 0, color: "#94a3b8", fontSize: "1.1rem", textTransform: "uppercase", letterSpacing: "1px" }}>Recaudación Total del Sistema</p>
                    <h2 style={{ margin: "5px 0 0 0", color: "#fbbf24", fontSize: "3rem", textShadow: "0 2px 10px rgba(251, 191, 36, 0.2)" }}>
                      ${totalRecaudadoGlobal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </h2>
                    <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "15px", fontSize: "1rem" }}>
                      <span style={{ color: "#4ade80", backgroundColor: "rgba(74, 222, 128, 0.1)", padding: "5px 10px", borderRadius: "20px" }}>
                        🎟️ {cantidadGratuitos} Eventos Gratuitos
                      </span>
                      <span style={{ color: "#f87171", backgroundColor: "rgba(248, 113, 113, 0.1)", padding: "5px 10px", borderRadius: "20px" }}>
                        💳 {cantidadPagos} Eventos Pagos
                      </span>
                    </div>
                </div>

                {/* Desplegable Nativo: Propios vs Externos */}
                <details style={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "1px solid #334155", padding: "15px", cursor: "pointer" }}>
                    <summary style={{ fontWeight: "bold", color: "#f8fafc", outline: "none", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "10px" }}>
                      📊 Desglose: Propios vs Externos <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: "normal" }}>(Clic para expandir)</span>
                    </summary>
                    
                    <div style={{ display: "flex", justifyContent: "space-around", marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #334155" }}>
                      <div style={{ textAlign: "center" }}>
                          <p style={{ margin: 0, color: "#94a3b8", fontSize: "1rem" }}>Eventos Propios</p>
                          <h3 style={{ margin: "5px 0 0 0", color: "#8b5cf6", fontSize: "1.8rem" }}>
                            ${recaudadoPropios.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </h3>
                      </div>
                      <div style={{ width: "1px", backgroundColor: "#334155" }}></div> {/* Divisor vertical */}
                      <div style={{ textAlign: "center" }}>
                          <p style={{ margin: 0, color: "#94a3b8", fontSize: "1rem" }}>Eventos Externos</p>
                          <h3 style={{ margin: "5px 0 0 0", color: "#3b82f6", fontSize: "1.8rem" }}>
                            ${recaudadoExternos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </h3>
                      </div>
                    </div>
                </details>

              </div>
            </div>
          )}

            </div>

            {/* ═════════════════════════════════════════════════════════════════════
                TOP 10 DE EVENTOS POR RECAUDACIÓN (Actualizado)
            ═════════════════════════════════════════════════════════════════════ */}
            <div className="reportes-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h3>🏆 Top 10 Eventos por Recaudación</h3>
                    <select 
                        value={filtroPertenenciaAdmin} 
                        onChange={(e) => setFiltroPertenenciaAdmin(e.target.value as any)}
                        style={{ padding: "6px", borderRadius: "5px", backgroundColor: "#1e293b", color: "#fff", border: "1px solid #334155" }}
                    >
                        <option value="Todos">Mostrar Todos</option>
                        <option value="Propio">Solo Propios</option>
                        <option value="Externo">Solo Externos</option>
                    </select>
                </div>
                
                <div style={{ overflowX: "auto" }}>
                    <table className="tabla-reportes-custom">
                        <thead>
                            <tr>
                                <th style={{ textAlign: "center" }}>Posición</th>
                                <th>Evento</th>
                                <th>Pertenencia</th>
                                <th style={{ textAlign: "center" }}>Valor Unitario</th>
                                {/* Le sacamos lo de Pagos / Max para dejarlo más limpio */}
                                <th style={{ textAlign: "center" }}>Cupo</th>
                                <th style={{ textAlign: "right" }}>Recaudación</th>
                                <th style={{ textAlign: "center" }}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(reporteData?.top_10_recaudacion || [])
                                .filter((e: any) => filtroPertenenciaAdmin === 'Todos' || e.pertenencia === filtroPertenenciaAdmin)
                                .slice(0, 10)
                                .map((evt: any, index: number) => (
                                <tr key={evt.id}>
                                    <td style={{ textAlign: "center", fontWeight: "900", color: index < 3 ? "#fbbf24" : "#cbd5e1", fontSize: "1.1rem" }}>
                                        #{index + 1}
                                    </td>
                                    <td style={{ fontWeight: "bold" }}>{evt.nombre}</td>
                                    <td>
                                        <span className="badge-tipo" style={{ backgroundColor: evt.pertenencia === "Propio" ? "#8b5cf6" : "#4b5563" }}>
                                            {evt.pertenencia}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                        ${evt.costo_participacion.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                    </td>
                                    {/* Acá mostramos Reservas Totales / Max */}
                                    <td style={{ textAlign: "center", fontWeight: "bold" }}>
                                        <span style={{ color: "#3b82f6" }}>{evt.reservas_totales}</span> 
                                        <span style={{ color: "#64748b" }}> / {evt.cupo_maximo || "∞"}</span>
                                    </td>
                                    <td style={{ textAlign: "right", fontWeight: "bold", color: "#4ade80" }}>
                                        ${evt.monto_recaudado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                        <button 
                                            onClick={() => setModalAdminEvento(evt)}
                                            style={{ padding: "6px 12px", backgroundColor: "#3b82f6", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold", transition: "0.2s" }}
                                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#2563eb"}
                                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#3b82f6"}
                                        >
                                            Ver más
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* ═════════════════════════════════════════════════════════════════════
                NUEVO REPORTE: REGISTRO DE USUARIOS NUEVOS (CONECTADO)
            ═════════════════════════════════════════════════════════════════════ */}
            <div style={{ display: "flex", gap: "20px", marginTop: "40px", flexWrap: "wrap", alignItems: "stretch" }}>
                
                {/* LADO IZQUIERDO: Tabla Detallada Conectada */}
                <div style={{ flex: "1 1 55%", backgroundColor: "#0f172a", padding: "20px", borderRadius: "10px", border: "1px solid #334155", minHeight: "450px", display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                        <h3 style={{ margin: 0 }}>👥 Registro de Usuarios Nuevos</h3>
                        {mesExpandido && (
                            <span className="badge-tipo" style={{ backgroundColor: "#3b82f6" }}>Mes: {mesExpandido}</span>
                        )}
                    </div>

                    {!mesExpandido ? (
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", color: "#64748b", textAlign: "center" }}>
                            <span style={{ fontSize: "3rem", marginBottom: "15px" }}>👉</span>
                            <h4 style={{ margin: 0, color: "#94a3b8" }}>Seleccioná un mes</h4>
                            <p style={{ maxWidth: "300px", marginTop: "10px" }}>Hacé clic en algún mes del panel derecho para ver el listado completo de usuarios registrados.</p>
                        </div>
                    ) : (
                        <div style={{ overflowY: "auto", flex: 1, paddingRight: "5px" }}>
                            <table className="tabla-reportes-custom">
                                <thead>
                                    <tr>
                                        <th>Usuario / Email</th>
                                        <th>Rol</th>
                                        <th style={{ textAlign: "center" }}>Día</th>
                                        <th style={{ textAlign: "center" }}>Actividad</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usuariosPorMes[mesExpandido].usuarios.map((u: any, idx: number) => (
                                        <tr key={idx}>
                                            <td>
                                                <div style={{ fontWeight: "bold", color: "#f8fafc" }}>{u.nombre}</div>
                                                <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>{u.email}</div>
                                            </td>
                                            <td>
                                                <span className="badge-tipo" style={{ backgroundColor: u.rol === "Organización Externa" ? "#f97316" : "#0ea5e9" }}>
                                                    {u.rol}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: "center", fontWeight: "bold", color: "#cbd5e1" }}>
                                                {u.fecha_creacion ? u.fecha_creacion.split('/')[0] : "-"}
                                            </td>
                                            <td style={{ textAlign: "center", fontSize: "0.85rem", color: "#94a3b8" }}>
                                                {u.rol === "Cliente" ? (
                                                    <span><strong style={{ color: "#4ade80" }}>{u.cantidad_inscripciones}</strong> inscrip.</span>
                                                ) : (
                                                    <span><strong style={{ color: "#8b5cf6" }}>{u.cantidad_eventos_creados}</strong> eventos</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* LADO DERECHO: Acordeón por Mes y Día */}
                <div style={{ flex: "1 1 40%", backgroundColor: "#0f172a", padding: "20px", borderRadius: "10px", border: "1px solid #334155", minHeight: "450px", display: "flex", flexDirection: "column" }}>
                    <h3 style={{ margin: "0 0 20px 0" }}>📈 Nuevos Registros por Mes</h3>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto", flex: 1, paddingRight: "5px" }}>
                        {mesesOrdenados.map((mes, index) => (
                            <div key={index} style={{ backgroundColor: "#1e293b", borderRadius: "8px", overflow: "hidden", border: mesExpandido === mes ? "1px solid #3b82f6" : "1px solid transparent", transition: "0.2s" }}>
                                
                                {/* Botón del Mes */}
                                <div 
                                    onClick={() => setMesExpandido(mesExpandido === mes ? null : mes)}
                                    style={{ padding: "12px 15px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", borderBottom: mesExpandido === mes ? "1px solid #334155" : "none" }}
                                >
                                    <strong style={{ color: "#f8fafc", fontSize: "1.1rem" }}>{mes}</strong>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>{usuariosPorMes[mes].total} total</span>
                                        <span style={{ color: "#94a3b8" }}>{mesExpandido === mes ? "▲" : "▼"}</span>
                                    </div>
                                </div>
                                
                                {/* Desplegable de los Días */}
                                {mesExpandido === mes && (
                                    <div style={{ padding: "10px 15px", backgroundColor: "#0f172a" }}>
                                        {/* Ordenamos los días del 1 al 31 */}
                                        {Object.keys(usuariosPorMes[mes].dias).sort((a,b) => parseInt(a)-parseInt(b)).map(dia => {
                                            const stats = usuariosPorMes[mes].dias[dia];
                                            return (
                                                <div key={dia} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #1e293b", fontSize: "0.9rem" }}>
                                                    <span style={{ color: "#cbd5e1", fontWeight: "bold" }}>Día {dia}</span>
                                                    <div style={{ textAlign: "right", display: "flex", gap: "10px" }}>
                                                        {stats.clientes > 0 && (
                                                            <span style={{ color: "#0ea5e9" }}><strong>{stats.clientes}</strong> Clientes</span>
                                                        )}
                                                        {stats.organizaciones > 0 && (
                                                            <span style={{ color: "#f97316" }}><strong>{stats.organizaciones}</strong> Org.</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* ═════════════════════════════════════════════════════════════════════
                NUEVO MAPA DE CALOR: DENSIDAD POR PROVINCIA (Unificado y Visual)
            ═════════════════════════════════════════════════════════════════════ */}
            <div className="reportes-card" style={{ marginTop: "40px", marginBottom: "40px" }}>
                <div style={{ marginBottom: "20px" }}>
                    <h3>📍 Mapa de Densidad por Provincia</h3>
                    <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: 0 }}>
                        Medidor de concentración de eventos. Hacé clic en un evento para ver sus detalles completos.
                    </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                    {reporteData?.tendencias_ubicacion_completa?.map((prov: any, index: number) => {
                        // Calculamos qué tan "caliente" es la provincia para llenar la barra roja/naranja
                        const porcentajeCalor = (prov.total_eventos / maxEventosProvincia) * 100;
                        
                        // Unificamos TODOS los eventos de todas las localidades de esa provincia en un solo array
                        const todosEventosProvincia = prov.localidades.flatMap((loc: any) => loc.eventos);

                        return (
                            <div key={index} style={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px", overflow: "hidden" }}>
                                
                                {/* Fila clickeable principal con la BARRA DE CALOR de fondo */}
                                <div 
                                    onClick={() => setProvinciaExpandidaAdmin(provinciaExpandidaAdmin === prov.provincia ? null : prov.provincia)}
                                    style={{ position: "relative", padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", zIndex: 1 }}
                                >
                                    {/* La barra de densidad (Fondo de color) */}
                                    <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${porcentajeCalor}%`, backgroundColor: porcentajeCalor > 70 ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)", zIndex: -1, transition: "width 1s" }}></div>
                                    
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <span style={{ fontSize: "1.2rem" }}>{porcentajeCalor > 70 ? "🔥" : "🗺️"}</span>
                                        <h4 style={{ margin: 0, color: "#f8fafc", fontSize: "1.1rem" }}>{prov.provincia}</h4>
                                    </div>
                                    
                                    <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                                        <strong style={{ color: porcentajeCalor > 70 ? "#ef4444" : "#fbbf24" }}>{prov.total_eventos} Eventos</strong>
                                        <span style={{ color: "#94a3b8" }}>{provinciaExpandidaAdmin === prov.provincia ? "▲" : "▼"}</span>
                                    </div>
                                </div>

                                {/* Desplegable con los eventos (AHORA CLICKEABLES) */}
                                {provinciaExpandidaAdmin === prov.provincia && (
                                    <div style={{ padding: "15px 20px", borderTop: "1px solid #334155", backgroundColor: "#1e293b" }}>
                                        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                                            {todosEventosProvincia.map((evento: any, i: number) => (
                                                <li 
                                                    key={i} 
                                                    onClick={() => setModalAdminEvento(evento)} // ¡ACÁ ABRIMOS EL MODAL!
                                                    style={{ backgroundColor: "#0f172a", padding: "10px", borderRadius: "6px", display: "flex", justifyContent: "space-between", cursor: "pointer", border: "1px solid #334155" }}
                                                    onMouseOver={(e) => e.currentTarget.style.borderColor = "#3b82f6"}
                                                    onMouseOut={(e) => e.currentTarget.style.borderColor = "#334155"}
                                                >
                                                    <div>
                                                        <strong style={{ color: "#e2e8f0" }}>{evento.nombre}</strong>
                                                        <span style={{ color: "#94a3b8", fontSize: "0.85rem", marginLeft: "10px" }}>{evento.tipo}</span>
                                                    </div>
                                                    <span style={{ color: evento.pertenencia === "Propio" ? "#8b5cf6" : "#4b5563", fontSize: "0.85rem", fontWeight: "bold" }}>
                                                        {evento.pertenencia}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
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
                {renderGraficoTorta(reporteData?.rendimiento_por_tipo ?? [], "tipo", "cantidad", "Detalle")}
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

          {usuarioRol <= 2 && (reporteData?.eventos_por_tipo ?? []).length > 0 && (
            <div className="grafico-card">
              <div className="grafico-card__header">
                <h3>🏃‍♂️ Eventos por Tipo</h3>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={() => setModalFiltroTorta({ titulo: "Todos los Tipos", filtroKey: "tipo", valor: "TODOS" })} className="btn-export" style={{ backgroundColor: "#3b82f6", color: "#fff" }}>
                        Ver Detalles
                    </button>
                    <button data-html2canvas-ignore="true" disabled={exportando === "eventos_por_tipo"} onClick={() => handleExportarCSV("eventos_por_tipo")} className="btn-export">
                        {exportando === "eventos_por_tipo" ? "..." : "📥 CSV"}
                    </button>
                </div>
              </div>
              <div className="grafico-card__body">
                {/* Ahora le pasamos el "Título" que va a usar el modal al hacer clic */}
                {renderGraficoTorta(reporteData?.eventos_por_tipo ?? [], "tipo", "cantidad", "Detalle por Tipo")}
              </div>
            </div>
          )}

          {usuarioRol <= 2 && (reporteData?.eventos_por_dificultad ?? []).length > 0 && (
            <div className="grafico-card">
              <div className="grafico-card__header">
                <h3>🧗 Eventos por Dificultad</h3>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={() => setModalFiltroTorta({ titulo: "Todas las Dificultades", filtroKey: "dificultad", valor: "TODOS" })} className="btn-export" style={{ backgroundColor: "#3b82f6", color: "#fff" }}>
                        Ver Detalles
                    </button>
                    <button data-html2canvas-ignore="true" disabled={exportando === "eventos_por_dificultad"} onClick={() => handleExportarCSV("eventos_por_dificultad")} className="btn-export">
                        {exportando === "eventos_por_dificultad" ? "..." : "📥 CSV"}
                    </button>
                </div>
              </div>
              <div className="grafico-card__body">
                {renderGraficoTorta(reporteData?.eventos_por_dificultad ?? [], "dificultad", "cantidad", "Detalle por Dificultad")}
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
      {/* ════════════════════════════════════════════════════════════════
            MODAL DETALLE EVENTO ADMIN (BOTÓN VER MÁS)
        ════════════════════════════════════════════════════════════════ */}
        {modalAdminEvento && (
            <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "center" }}>
                <div style={{ backgroundColor: "#1e293b", padding: "24px", borderRadius: "12px", width: "90%", maxWidth: "600px", border: "1px solid #334155", color: "#f8fafc", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #334155", paddingBottom: "10px" }}>
                        <h3 style={{ margin: 0, color: "#fff" }}>Detalles del Evento</h3>
                        <button onClick={() => setModalAdminEvento(null)} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#94a3b8" }}>✖</button>
                    </div>
                    
                    {/* Grilla de información */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", fontSize: "0.95rem" }}>
                        <p style={{ margin: 0 }}><strong style={{ color: "#94a3b8" }}>Evento:</strong> <br/>{modalAdminEvento.nombre}</p>
                        <p style={{ margin: 0 }}><strong style={{ color: "#94a3b8" }}>Organizador:</strong> <br/>{modalAdminEvento.organizador}</p>
                        <p style={{ margin: 0 }}><strong style={{ color: "#94a3b8" }}>Fecha:</strong> <br/>{modalAdminEvento.fecha_evento.split('-').reverse().join('-')}</p>
                        <p style={{ margin: 0 }}><strong style={{ color: "#94a3b8" }}>Tipo:</strong> <br/>{modalAdminEvento.tipo}</p>
                        <p style={{ margin: 0 }}><strong style={{ color: "#94a3b8" }}>Ubicación:</strong> <br/>{modalAdminEvento.ubicacion || "Sin ubicación"}</p>
                        <p style={{ margin: 0 }}><strong style={{ color: "#94a3b8" }}>Distancia:</strong> <br/>{modalAdminEvento.distancia_km} km</p>
                    </div>

                    <h4 style={{ marginTop: "25px", marginBottom: "10px", color: "#cbd5e1" }}>Desglose de Inscripciones</h4>
                    
                    {/* Tarjetitas de estado de reservas */}
                    <div style={{ display: "flex", justifyContent: "space-between", backgroundColor: "#0f172a", padding: "15px", borderRadius: "8px", border: "1px solid #334155" }}>
                        <div style={{ textAlign: "center", flex: 1 }}>
                            <span style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#fff" }}>{modalAdminEvento.cupo_maximo || "∞"}</span>
                            <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.8rem", marginTop: "5px" }}>Cupo Máximo</p>
                        </div>
                        <div style={{ textAlign: "center", flex: 1, borderLeft: "1px solid #334155", borderRight: "1px solid #334155" }}>
                            <span style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#4ade80" }}>{modalAdminEvento.inscripciones_confirmadas}</span>
                            <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.8rem", marginTop: "5px" }}>Pagos Confirmados</p>
                        </div>
                        <div style={{ textAlign: "center", flex: 1 }}>
                            <span style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#fbbf24" }}>{modalAdminEvento.reservas_totales - modalAdminEvento.inscripciones_confirmadas}</span>
                            <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.8rem", marginTop: "5px" }}>Reservas Pendientes</p>
                        </div>
                    </div>

                </div>
            </div>
        )}
        {/* ════════════════════════════════════════════════════════════════
            MODAL DETALLE DE GRÁFICOS (POR TIPO Y DIFICULTAD)
        ════════════════════════════════════════════════════════════════ */}
        {modalFiltroTorta && (
            <div style={{ 
                position: "fixed", top: 0, left: 0, width: "100%", height: "100%", 
                backgroundColor: "rgba(0,0,0,0.8)", zIndex: 999999, 
                display: "flex", justifyContent: "center", 
                alignItems: "flex-start", /* <--- CLAVE: Que arranque desde arriba, no del centro */
                paddingTop: "80px", /* <--- CLAVE: Espacio para que el Navbar no lo tape */
                paddingBottom: "20px" 
            }}>
                <div style={{ 
                    backgroundColor: "#0f172a", padding: "25px", borderRadius: "12px", 
                    width: "95%", maxWidth: "900px", border: "1px solid #334155", 
                    color: "#f8fafc", boxShadow: "0 10px 25px rgba(0,0,0,0.5)", 
                    maxHeight: "calc(100vh - 120px)", /* <--- CLAVE: Nunca va a ser más alto que tu pantalla */
                    display: "flex", flexDirection: "column" 
                }}>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #334155", paddingBottom: "15px", flexShrink: 0 }}>
                        <div>
                            <h2 style={{ margin: 0, color: "#fff" }}>{modalFiltroTorta.titulo}</h2>
                            <span className="badge-tipo" style={{ backgroundColor: "#3b82f6", marginTop: "10px", display: "inline-block" }}>
                                Filtro: {modalFiltroTorta.valor === "TODOS" ? "Todos los eventos" : modalFiltroTorta.valor}
                            </span>
                        </div>
                        <button onClick={() => setModalFiltroTorta(null)} style={{ background: "none", border: "none", fontSize: "2rem", cursor: "pointer", color: "#94a3b8" }}>✖</button>
                    </div>

                    {/* Contenedor de la tabla con SCROLL FORZADO */}
                    <div style={{ overflowY: "auto", flex: 1, minHeight: 0, paddingRight: "10px" }}>
                        <table className="tabla-reportes-custom">
                            <thead style={{ position: "sticky", top: 0, backgroundColor: "#0f172a", zIndex: 10 }}>
                                <tr>
                                    <th>Evento</th>
                                    <th>Fecha</th>
                                    <th>Pertenencia</th>
                                    <th>{modalFiltroTorta.filtroKey === "tipo" ? "Tipo" : modalFiltroTorta.filtroKey === "dificultad" ? "Dificultad" : "Organizador"}</th>
                                    <th style={{ textAlign: "center" }}>Participantes</th>
                                    <th style={{ textAlign: "right" }}>Recaudación</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(reporteData?.lista_eventos_detallada || [])
                                    .filter((e: any) => modalFiltroTorta.valor === "TODOS" || e[modalFiltroTorta.filtroKey] === modalFiltroTorta.valor)
                                    .map((evt: any, idx: number) => (
                                    <tr key={idx}>
                                        <td style={{ fontWeight: "bold", color: "#fff" }}>{evt.nombre}</td>
                                        <td>{evt.fecha_evento ? evt.fecha_evento.split('-').reverse().join('-') : "-"}</td>
                                        <td>
                                            <span style={{ color: evt.pertenencia === "Propio" ? "#8b5cf6" : "#4b5563", fontWeight: "bold", fontSize: "0.85rem" }}>
                                                {evt.pertenencia}
                                            </span>
                                        </td>
                                        <td>{modalFiltroTorta.filtroKey === "tipo" ? evt.tipo : modalFiltroTorta.filtroKey === "dificultad" ? evt.dificultad : evt.organizador}</td>
                                        <td style={{ textAlign: "center" }}>
                                            <span style={{ color: "#4ade80", fontWeight: "bold" }}>{evt.inscripciones_confirmadas}</span> / {evt.cupo_maximo || "∞"}
                                        </td>
                                        <td style={{ textAlign: "right", fontWeight: "bold", color: "#fbbf24" }}>
                                            ${evt.monto_recaudado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        {(reporteData?.lista_eventos_detallada || []).filter((e: any) => modalFiltroTorta.valor === "TODOS" || e[modalFiltroTorta.filtroKey] === modalFiltroTorta.valor).length === 0 && (
                            <div style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                                No hay eventos detallados que coincidan con este filtro.
                            </div>
                        )}
                    </div>

                </div>
            </div>
        )}
        {/* ════════════════════════════════════════════════════════════════
            MODAL DETALLE FINANCIERO (TODOS LOS EVENTOS)
        ════════════════════════════════════════════════════════════════ */}
        {modalFinanciero && (
            <div style={{ 
                position: "fixed", top: 0, left: 0, width: "100%", height: "100%", 
                backgroundColor: "rgba(0,0,0,0.85)", zIndex: 999999, 
                display: "flex", justifyContent: "center", alignItems: "flex-start", 
                paddingTop: "60px", paddingBottom: "20px" 
            }}>
                <div style={{ 
                    backgroundColor: "#0f172a", padding: "25px", borderRadius: "12px", 
                    width: "95%", maxWidth: "1000px", border: "1px solid #10b981", 
                    color: "#f8fafc", boxShadow: "0 10px 30px rgba(16, 185, 129, 0.2)", 
                    maxHeight: "calc(100vh - 100px)", display: "flex", flexDirection: "column" 
                }}>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #334155", paddingBottom: "15px", flexShrink: 0 }}>
                        <div>
                            <h2 style={{ margin: 0, color: "#10b981", display: "flex", alignItems: "center", gap: "10px" }}>
                              💰 Reporte Detallado de Ingresos
                            </h2>
                            <p style={{ margin: "5px 0 0 0", color: "#94a3b8" }}>Desglose financiero de todos los eventos registrados.</p>
                        </div>
                        <button onClick={() => setModalFinanciero(false)} style={{ background: "none", border: "none", fontSize: "2rem", cursor: "pointer", color: "#94a3b8" }}>✖</button>
                    </div>

                    <div style={{ overflowY: "auto", flex: 1, minHeight: 0, paddingRight: "10px" }}>
                        <table className="tabla-reportes-custom">
                            <thead style={{ position: "sticky", top: 0, backgroundColor: "#0f172a", zIndex: 10 }}>
                                <tr>
                                    <th>Evento</th>
                                    <th>Organizador</th>
                                    <th>Origen</th>
                                    <th style={{ textAlign: "center" }}>Ticket ($)</th>
                                    <th style={{ textAlign: "center" }}>Pagantes</th>
                                    <th style={{ textAlign: "right", color: "#fbbf24" }}>Total Recaudado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Ordenamos los eventos para que los que más recaudaron salgan primero */}
                                {[...eventosDetalle]
                                    .sort((a, b) => Number(b.monto_recaudado) - Number(a.monto_recaudado))
                                    .map((evt: any, idx: number) => (
                                    <tr key={idx} style={{ backgroundColor: Number(evt.monto_recaudado) > 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                                        <td style={{ fontWeight: "bold", color: "#fff" }}>{evt.nombre}</td>
                                        <td>{evt.organizador}</td>
                                        <td>
                                            <span style={{ 
                                              color: evt.pertenencia === "Propio" ? "#8b5cf6" : "#3b82f6", 
                                              border: `1px solid ${evt.pertenencia === "Propio" ? "#8b5cf6" : "#3b82f6"}`,
                                              padding: "2px 8px", borderRadius: "12px", fontSize: "0.8rem" 
                                            }}>
                                                {evt.pertenencia}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: "center" }}>
                                            {Number(evt.costo_participacion) === 0 ? 
                                              <span style={{ color: "#94a3b8" }}>Gratis</span> : 
                                              `$${Number(evt.costo_participacion).toLocaleString('es-AR')}`}
                                        </td>
                                        <td style={{ textAlign: "center", color: "#4ade80" }}>
                                            {evt.inscripciones_confirmadas}
                                        </td>
                                        <td style={{ textAlign: "right", fontWeight: "bold", color: Number(evt.monto_recaudado) > 0 ? "#fbbf24" : "#64748b", fontSize: "1.1rem" }}>
                                            ${Number(evt.monto_recaudado).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        {eventosDetalle.length === 0 && (
                            <div style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                                No hay datos financieros registrados en el sistema.
                            </div>
                        )}
                    </div>

                </div>
            </div>
        )}{/* ════════════════════════════════════════════════════════════════
            MODAL 1: DIRECTORIO GLOBAL DE EVENTOS
        ════════════════════════════════════════════════════════════════ */}
        {modalEventosGlobal && (
            <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.85)", zIndex: 999999, display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: "60px", paddingBottom: "20px" }}>
                <div style={{ backgroundColor: "#0f172a", padding: "25px", borderRadius: "12px", width: "95%", maxWidth: "1000px", border: "1px solid #3b82f6", color: "#f8fafc", boxShadow: "0 10px 30px rgba(59, 130, 246, 0.2)", maxHeight: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #334155", paddingBottom: "15px", flexShrink: 0 }}>
                        <div>
                            <h2 style={{ margin: 0, color: "#3b82f6", display: "flex", alignItems: "center", gap: "10px" }}>📅 Directorio Global de Eventos</h2>
                            <p style={{ margin: "5px 0 0 0", color: "#94a3b8" }}>Listado completo de todas las actividades registradas en el sistema.</p>
                        </div>
                        <button onClick={() => setModalEventosGlobal(false)} style={{ background: "none", border: "none", fontSize: "2rem", cursor: "pointer", color: "#94a3b8" }}>✖</button>
                    </div>

                    <div style={{ overflowY: "auto", flex: 1, minHeight: 0, paddingRight: "10px" }}>
                        <table className="tabla-reportes-custom">
                            <thead style={{ position: "sticky", top: 0, backgroundColor: "#0f172a", zIndex: 10 }}>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Evento</th>
                                    <th>Organizador</th>
                                    <th>Modalidad</th>
                                    <th style={{ textAlign: "center" }}>Origen</th>
                                    <th style={{ textAlign: "center" }}>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...eventosDetalle].sort((a, b) => new Date(b.fecha_evento).getTime() - new Date(a.fecha_evento).getTime()).map((evt: any, idx: number) => {
                                    const esFuturo = evt.fecha_evento >= hoyStr;
                                    return (
                                        <tr key={idx}>
                                            <td style={{ color: "#cbd5e1", whiteSpace: "nowrap" }}>{evt.fecha_evento ? evt.fecha_evento.split('-').reverse().join('-') : "-"}</td>
                                            <td style={{ fontWeight: "bold", color: "#fff" }}>{evt.nombre}</td>
                                            <td>{evt.organizador}</td>
                                            <td><span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{evt.tipo} - {evt.dificultad}</span></td>
                                            <td style={{ textAlign: "center" }}>
                                                <span style={{ backgroundColor: evt.pertenencia === "Propio" ? "rgba(139, 92, 246, 0.2)" : "rgba(234, 179, 8, 0.2)", color: evt.pertenencia === "Propio" ? "#8b5cf6" : "#eab308", padding: "3px 8px", borderRadius: "4px", fontSize: "0.8rem", fontWeight: "bold" }}>
                                                    {evt.pertenencia}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: "center" }}>
                                                {esFuturo ? <span style={{ color: "#3b82f6" }}>🚀 Próximo</span> : <span style={{ color: "#64748b" }}>✅ Finalizado</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            MODAL 2: DETALLE DE OCUPACIÓN Y PARTICIPANTES
        ════════════════════════════════════════════════════════════════ */}
        {modalParticipantes && (
            <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.85)", zIndex: 999999, display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: "60px", paddingBottom: "20px" }}>
                <div style={{ backgroundColor: "#0f172a", padding: "25px", borderRadius: "12px", width: "95%", maxWidth: "1000px", border: "1px solid #8b5cf6", color: "#f8fafc", boxShadow: "0 10px 30px rgba(139, 92, 246, 0.2)", maxHeight: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #334155", paddingBottom: "15px", flexShrink: 0 }}>
                        <div>
                            <h2 style={{ margin: 0, color: "#a78bfa", display: "flex", alignItems: "center", gap: "10px" }}>👥 Radar de Ocupación por Evento</h2>
                            <p style={{ margin: "5px 0 0 0", color: "#94a3b8" }}>Métricas de inscripciones confirmadas vs cupo máximo disponible.</p>
                        </div>
                        <button onClick={() => setModalParticipantes(false)} style={{ background: "none", border: "none", fontSize: "2rem", cursor: "pointer", color: "#94a3b8" }}>✖</button>
                    </div>

                    <div style={{ overflowY: "auto", flex: 1, minHeight: 0, paddingRight: "10px" }}>
                        <table className="tabla-reportes-custom">
                            <thead style={{ position: "sticky", top: 0, backgroundColor: "#0f172a", zIndex: 10 }}>
                                <tr>
                                    <th>Evento</th>
                                    <th style={{ textAlign: "center" }}>Reservas sin pago</th>
                                    <th style={{ textAlign: "center" }}>Confirmados</th>
                                    <th style={{ textAlign: "center" }}>Cupo Max</th>
                                    <th style={{ textAlign: "right" }}>Nivel de Ocupación</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...eventosDetalle].sort((a, b) => Number(b.inscripciones_confirmadas) - Number(a.inscripciones_confirmadas)).map((evt: any, idx: number) => {
                                    const confirmados = Number(evt.inscripciones_confirmadas) || 0;
                                    const reservas = Number(evt.reservas_totales) || 0;
                                    const pendientes = Math.max(0, reservas - confirmados);
                                    const cupo = Number(evt.cupo_maximo) || 0;
                                    const porcentaje = cupo > 0 ? ((confirmados / cupo) * 100).toFixed(0) : "100";
                                    
                                    return (
                                        <tr key={idx}>
                                            <td style={{ fontWeight: "bold", color: "#fff" }}>{evt.nombre}</td>
                                            <td style={{ textAlign: "center", color: "#f97316" }}>{pendientes > 0 ? `${pendientes} pend.` : "-"}</td>
                                            <td style={{ textAlign: "center", color: "#4ade80", fontWeight: "bold", fontSize: "1.1rem" }}>{confirmados}</td>
                                            <td style={{ textAlign: "center", color: "#94a3b8" }}>{cupo > 0 ? cupo : "Ilimitado"}</td>
                                            <td style={{ textAlign: "right", minWidth: "150px" }}>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px" }}>
                                                    <span style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>{porcentaje}%</span>
                                                    <div style={{ width: "80px", height: "8px", backgroundColor: "#1e293b", borderRadius: "4px", overflow: "hidden" }}>
                                                        <div style={{ width: `${Math.min(100, Number(porcentaje))}%`, height: "100%", backgroundColor: Number(porcentaje) >= 90 ? "#ef4444" : "#8b5cf6" }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}
      </div>
      {/* fin .reportes-page__container */}

      <Footer />
    </div>
  );
}