import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useLocation} from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { Footer } from "../components/footer";
import { Navbar } from '../components/navbar';
import { HashLink } from 'react-router-hash-link';
import ConfirmModal from '../components/modals/ConfirmModal';

// --- INTERFACES ---
interface UserProfile {
    id_usuario?: number;
    email: string;
    nombre_y_apellido: string;
    id_rol?: number;
    telefono?: string;
    direccion?: string;
    enlace_redes?: string;
}

interface Inscripcion {
    id_reserva: number;
    fecha_reserva: string;
    estado_reserva: string;
    id_evento: number;
    nombre_evento: string;
    ubicacion: string;
    fecha_evento: string;
    hora_evento: string | null;
    monto: number;
    costo: number;
    detalle_baja: string | null;
}

// --- HELPER TIMEZONE (mismo fix que en AlertaPagosPendientes) ---
function parsearFechaUTC(fechaStr: string): Date {
    if (!fechaStr) return new Date(0);
    const yaTimezone = /[Z+]/.test(fechaStr.slice(-6));
    return new Date(yaTimezone ? fechaStr : fechaStr + 'Z');
}

// --- COMPONENTE CUENTA REGRESIVA ---
const ContadorPago = ({ fechaReserva }: { fechaReserva: string }) => {
    const [tiempoRestante, setTiempoRestante] = useState("");
    const [color, setColor] = useState("#ffbb00");
    const [expiro, setExpiro] = useState(false);
    
    useEffect(() => {
        const calcularTiempo = () => {
            const fechaInicio = parsearFechaUTC(fechaReserva).getTime();
            const fechaLimite = fechaInicio + (72 * 60 * 60 * 1000);
            const ahora = Date.now();
            const diferencia = fechaLimite - ahora;

            if (diferencia <= 0) {
                setTiempoRestante("Tiempo agotado");
                setExpiro(true);
                return;
            }

            const horas = Math.floor(diferencia / (1000 * 60 * 60));
            const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
            const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);

            const hStr = String(horas).padStart(2, '0');
            const mStr = String(minutos).padStart(2, '0');
            const sStr = String(segundos).padStart(2, '0');

            setTiempoRestante(`${hStr}:${mStr}:${sStr}`);
            setColor(horas < 1 ? "#ff4444" : "#ccff00");
        };

        const intervalo = setInterval(calcularTiempo, 1000);
        calcularTiempo();
        return () => clearInterval(intervalo);
    }, [fechaReserva]);

    if (expiro) return (
        <div style={{ color: '#ff4444', fontWeight: 'bold', marginTop: '5px', fontSize: '0.9rem' }}>
            ⚠️ Reserva vencida
        </div>
    );

    return (
        <div style={{ marginTop: '8px', fontSize: '0.9rem', color: '#ccc', background: 'rgba(255,255,255,0.05)', padding: '5px 10px', borderRadius: '4px', display: 'inline-block' }}>
            Tiempo para pagar: <span style={{ color: color, fontWeight: 'bold', fontFamily: 'monospace', fontSize: '1rem', marginLeft: '5px' }}>{tiempoRestante}</span>
        </div>
    );
};

export default function PerfilPage() {
    const { getToken } = useAuth();
    const location = useLocation();
    
    const [perfil, setPerfil] = useState<UserProfile | null>(null);
    const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
    const [confirmModal, setConfirmModal] = useState<{ show: boolean; id_reserva: number | null }>({ show: false, id_reserva: null });

    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    
    const [activeTab, setActiveTab] = useState<'datos' | 'inscripciones'>('datos');
    const [isEditing, setIsEditing] = useState(false); 
    const [isChangingPass, setIsChangingPass] = useState(false); 
    const [isLoading, setIsLoading] = useState(true); // <-- Agrega este
    // Agregá esto arriba junto con tus otros useState
    const [busqueda, setBusqueda] = useState("");
    const [filtroEstado, setFiltroEstado] = useState("");

    // Helpers para formatear números
    const fmt = (val:any) => new Intl.NumberFormat("es-AR").format(val);
    const fmtPeso = (val:any) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(val);

    // Lógica de filtrado adaptada a tu objeto (nombre_evento y estado_reserva)
    const filtradas = inscripciones.filter((ins) => {
        const coincideBusqueda = ins.nombre_evento?.toLowerCase().includes(busqueda.toLowerCase());
        const coincideEstado = !filtroEstado || ins.estado_reserva === filtroEstado;
        return coincideBusqueda && coincideEstado;
    });

    // Estadísticas adaptadas a tus datos
    const stats = [
        { label: "Total Inscripciones", value: fmt(inscripciones.length), color: "#4ade80" },
        { label: "Confirmadas", value: fmt(inscripciones.filter(i => i.estado_reserva === 'Confirmada').length), color: "#60a5fa" },
        { label: "Pendientes", value: fmt(inscripciones.filter(i => i.estado_reserva === 'Pendiente').length), color: "#fbbf24" },
        { label: "Total Gastado", value: fmtPeso(inscripciones.filter(i => i.estado_reserva === 'Confirmada') .reduce((acc, curr: any) => acc + (Number(curr.monto) || Number(curr.costo) || 0), 0)), color: "#a78bfa" },
    ];

    const [editForm, setEditForm] = useState({
        nombre_y_apellido: '',
        email: '',
        telefono: '',
        direccion: '',
        enlace_redes: ''
    });

    const [passForm, setPassForm] = useState({
        password_actual: '',
        password_nueva: ''
    });

    const navigate = useNavigate();
    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');

        if (tab === 'inscripciones') {
            setActiveTab('inscripciones');
        } else if (tab === 'datos') {
            setActiveTab('datos');
        }
    }, [location]);
    
useEffect(() => {
    const cargarDatosIniciales = async () => {
        const token = getToken();
        if (!token) {
            navigate('/login');
            return;
        }

        try {
            // 1. Cargamos datos del perfil del usuario logueado
            const resPerfil = await axios.get(`${apiUrl}/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPerfil(resPerfil.data);
            
            // Llenamos el formulario de edición con lo que trajo el server
            setEditForm({
                nombre_y_apellido: resPerfil.data.nombre_y_apellido || '',
                email: resPerfil.data.email || '',
                telefono: resPerfil.data.telefono || '',
                direccion: resPerfil.data.direccion || '',
                enlace_redes: resPerfil.data.enlace_redes || ''
            });

            // 2. Cargamos sus inscripciones
            await fetchInscripciones();

        } catch (err: any) {
            console.error("Error al cargar datos iniciales:", err);
            setError("No se pudo cargar la información del perfil.");
        }
    };

    cargarDatosIniciales();
}, [apiUrl, getToken, navigate]);

    const fetchInscripciones = async () => {
    const token = getToken();
    setIsLoading(true); // Empezamos a cargar
        try {
            const response = await axios.get(`${apiUrl}/me/inscripciones`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInscripciones(response.data);
        } catch (err) {
            console.error("Error cargando inscripciones:", err);
        } finally {
            setIsLoading(false); // Terminamos de cargar (sea éxito o error)
        }
    };

    const handleSaveDatos = async () => {
        const token = getToken();
        
        try {
            const response = await axios.put(`${apiUrl}/me`, editForm, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const usuarioActualizado = response.data;
            setPerfil(usuarioActualizado);
            setIsEditing(false);
            
            const datosParaGuardar = {
                ...usuarioActualizado,
                nombre: usuarioActualizado.nombre_y_apellido 
            };
            localStorage.setItem('user', JSON.stringify(datosParaGuardar));
            
            setSuccessMsg("Datos actualizados correctamente.");
            setTimeout(() => setSuccessMsg(null), 3000);

        } catch (err: any) {
            console.error("Error al guardar datos:", err);
            const mensaje = err.response?.data?.detail || "Error al conectar con el servidor";
            setError(mensaje);
            setTimeout(() => setError(null), 4000);
        }
    };

    const handleSavePassword = async () => {
        setSuccessMsg(null);
        setError(null);

        if (!passForm.password_actual || !passForm.password_nueva) {
            setError("Por favor completa ambos campos.");
            return;
        }

        const token = getToken();
        
        try {
            await axios.post(`${apiUrl}/me/password`, passForm, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            setSuccessMsg("¡Contraseña actualizada correctamente!");
            setPassForm({ password_actual: '', password_nueva: '' }); 
            setTimeout(() => {
                setSuccessMsg(null);
                setIsChangingPass(false);
            }, 2000);

        } catch (err: any) {
            console.error("Error al cambiar password:", err);
            const mensaje = err.response?.data?.detail || "Error al cambiar la contraseña.";
            setError(mensaje);
        }
    };

    const handleCancelarReserva = async (id_reserva: number) => {
        setConfirmModal({ show: true, id_reserva });
    };

    const confirmarCancelacion = async () => {
        const id_reserva = confirmModal.id_reserva!;
        setConfirmModal({ show: false, id_reserva: null });

        const token = getToken();
        const inscripcionesPrevias = [...inscripciones];

        try {
            // 1. ACTUALIZACIÓN OPTIMISTA: 
            // En lugar de .filter (que la borra), usamos .map para cambiarle el estado visualmente
            setInscripciones(prev => prev.map(ins => 
                ins.id_reserva === id_reserva 
                    ? { ...ins, estado_reserva: 'Cancelada', detalle_baja: 'Cancelada por el usuario' } 
                    : ins
            ));
            
            setSuccessMsg("Procesando cancelación...");

            // 2. CAMBIO DE MÉTODO: 
            // Usamos PATCH o PUT en lugar de DELETE para que la fila no desaparezca de la DB
            await axios.patch(`${apiUrl}/inscripciones/${id_reserva}`, 
                { estado_reserva: 'Cancelada',
                    motivo_cancelacion: "Cancelada por el usuario"
                 }, // Le mandamos el nuevo estado al servidor
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setSuccessMsg("Reserva cancelada correctamente.");
            setTimeout(() => setSuccessMsg(null), 3000);

        } catch (err: any) {
            console.error("Error al cancelar:", err);
            
            // 3. REVERSIÓN: Si falla, volvemos al estado anterior
            setInscripciones(inscripcionesPrevias);
            
            const mensaje = err.response?.data?.detail || "No se pudo cancelar la reserva.";
            setError(mensaje);
            setSuccessMsg(null);
            setTimeout(() => setError(null), 4000);
        }
    };

    const handlePagar = async (ins: Inscripcion) => {
    const token = getToken();
    
    // 1. Verificamos en consola qué valores trae realmente 'ins'
    console.log("Datos de la inscripción al pagar:", ins);

    // 2. Preparamos el envío asegurando que el precio no sea null
    const payload = {
        id_reserva: Number(ins.id_reserva),
        nombre_evento: String(ins.nombre_evento),
        // Usamos monto, si es null usamos costo, si no 0
        precio: Number(ins.monto || ins.costo || 0) 
    };

    try {
        const response = await axios.post(`${apiUrl}/pagos/crear_preferencia`, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.init_point) {
            window.location.href = response.data.init_point;
        }
    } catch (err: any) {
        if (err.response?.status === 422) {
            console.error("Detalle del error 422:", err.response.data.detail);
            alert("Error de datos: El servidor no recibió un precio válido.");
        }
        setError("Error al conectar con Mercado Pago.");
    }
};

    const getEstadoColor = (estado: string) => {
        switch(estado) {
            case 'Pendiente': return '#ffbb00';
            case 'Confirmada': return '#2ead39';
            case 'Cancelada': return '#ff4444';
            default: return '#fff';
        }
    };

    function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
    return (
        <div
        style={{
            background: "#1a1a1a",
            padding: "16px",
            borderRadius: "12px",
            border: `1px solid ${color}44`,
            flex: "1 1 200px",
        }}
        >
        <p style={{ margin: 0, fontSize: "0.75rem", color: "#888", textTransform: "uppercase" }}>
            {label}
        </p>
        <p style={{ margin: "4px 0 0", fontSize: "1.2rem", fontWeight: "bold", color: "#fff" }}>
            {value}
        </p>
        </div>
    );
    }

    return (
        <div>
            <Navbar /> 
        <div className="inicio-container" style={{ paddingTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* ========== PESTAÑAS ========== */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                <button 
                    onClick={() => setActiveTab('datos')}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'datos' ? '2px solid #ccff00' : '2px solid transparent',
                        color: activeTab === 'datos' ? '#ccff00' : '#888',
                        padding: '10px 20px',
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                    }}
                >
                    MIS DATOS
                </button>
                <button 
                    onClick={() => setActiveTab('inscripciones')}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'inscripciones' ? '2px solid #ccff00' : '2px solid transparent',
                        color: activeTab === 'inscripciones' ? '#ccff00' : '#888',
                        padding: '10px 20px',
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                    }}
                >
                    INSCRIPCIONES
                </button>
            </div>

            {/* ========== CONTENIDO DE LAS PESTAÑAS ========== */}
            <div style={{ 
                width: '100%',
                maxWidth: '600px',
                background: '#1a1a1a', 
                padding: '40px', 
                borderRadius: '12px', 
                border: '1px solid #333',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
            }}>
                {error && (
                    <div style={{ padding: '10px', background: 'rgba(255, 68, 68, 0.1)', border: '1px solid #ff4444', color: '#ff4444', borderRadius: '4px', textAlign: 'center', marginBottom: '20px' }}>
                        {error}
                    </div>
                )}
                
                {successMsg && (
                    <div style={{ padding: '10px', background: 'rgba(204, 255, 0, 0.1)', border: '1px solid #ccff00', color: '#ccff00', borderRadius: '4px', textAlign: 'center', marginBottom: '20px', fontWeight: 'bold' }}>
                        {successMsg}
                    </div>
                )}

                {/* PESTAÑA: MIS DATOS */}
                {activeTab === 'datos' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {isChangingPass ? (
                            <>
                                <h3 style={{color: 'white', textAlign: 'center', margin: 0}}>Seguridad</h3>
                                <div className="form-group">
                                    <label style={{ color: '#ccff00', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '5px', display: 'block' }}>CONTRASEÑA ACTUAL</label>
                                    <input 
                                        type="password" 
                                        value={passForm.password_actual}
                                        onChange={(e) => setPassForm({...passForm, password_actual: e.target.value})}
                                        style={{ width: '100%', padding: '12px', background: '#333', border: '1px solid #ccff00', color: 'white', borderRadius: '6px' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ color: '#ccff00', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '5px', display: 'block' }}>NUEVA CONTRASEÑA</label>
                                    <input 
                                        type="password" 
                                        value={passForm.password_nueva}
                                        onChange={(e) => setPassForm({...passForm, password_nueva: e.target.value})}
                                        style={{ width: '100%', padding: '12px', background: '#333', border: '1px solid #ccff00', color: 'white', borderRadius: '6px' }}
                                    />
                                </div>

                                <div style={{ borderTop: '1px solid #333', marginTop: '20px', paddingTop: '20px', display: 'flex', gap: '15px' }}>
                                    <button onClick={() => { setIsChangingPass(false); setPassForm({password_actual: '', password_nueva: ''}); setError(null); }} style={{ padding: '12px 20px', background: 'transparent', border: '1px solid #ff4444', color: '#ff4444', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}>CANCELAR</button>
                                    <button onClick={handleSavePassword} style={{ padding: '12px 20px', background: '#ccff00', border: 'none', color: '#000', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold', flex: 1 }}>ACTUALIZAR CLAVE</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="form-group">
                                    <label style={{ color: '#ccff00', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '5px', display: 'block' }}>EMAIL</label>
                                    {isEditing ? (
                                        <input 
                                            type="email" 
                                            value={editForm.email}
                                            onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                                            style={{ width: '100%', padding: '12px', background: '#333', border: '1px solid #ccff00', color: 'white', borderRadius: '6px' }}
                                        />
                                    ) : (
                                        <div style={{ background: '#0d0d0d', padding: '12px', borderRadius: '6px', color: '#888', border: '1px solid #333' }}>
                                            {perfil?.email}
                                        </div>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label style={{ color: '#ccff00', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '5px', display: 'block' }}>NOMBRE Y APELLIDO</label>
                                    {isEditing ? (
                                        <input 
                                            type="text" 
                                            value={editForm.nombre_y_apellido}
                                            onChange={(e) => setEditForm({...editForm, nombre_y_apellido: e.target.value})}
                                            style={{ width: '100%', padding: '12px', background: '#333', border: '1px solid #ccff00', color: 'white', borderRadius: '6px' }}
                                        />
                                    ) : (
                                        <div style={{ background: '#0d0d0d', padding: '12px', borderRadius: '6px', color: '#fff', border: '1px solid #444' }}>
                                            {perfil?.nombre_y_apellido}
                                        </div>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label style={{ color: '#ccff00', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '5px', display: 'block' }}>TELÉFONO</label>
                                    {isEditing ? (
                                        <input 
                                            type="text" 
                                            value={editForm.telefono}
                                            onChange={(e) => setEditForm({...editForm, telefono: e.target.value})}
                                            style={{ width: '100%', padding: '12px', background: '#333', border: '1px solid #ccff00', color: 'white', borderRadius: '6px' }}
                                        />
                                    ) : (
                                        <div style={{ background: '#0d0d0d', padding: '12px', borderRadius: '6px', color: '#fff', border: '1px solid #444' }}>
                                            {perfil?.telefono || <span style={{color: '#666', fontStyle: 'italic'}}>Sin datos</span>}
                                        </div>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label style={{ color: '#ccff00', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '5px', display: 'block' }}>DIRECCIÓN</label>
                                    {isEditing ? (
                                        <input 
                                            type="text" 
                                            value={editForm.direccion}
                                            onChange={(e) => setEditForm({...editForm, direccion: e.target.value})}
                                            style={{ width: '100%', padding: '12px', background: '#333', border: '1px solid #ccff00', color: 'white', borderRadius: '6px' }}
                                        />
                                    ) : (
                                        <div style={{ background: '#0d0d0d', padding: '12px', borderRadius: '6px', color: '#fff', border: '1px solid #444' }}>
                                            {perfil?.direccion || <span style={{color: '#666', fontStyle: 'italic'}}>Sin datos</span>}
                                        </div>
                                    )}
                                </div>

                                <div style={{ borderTop: '1px solid #333', marginTop: '20px', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {!isEditing ? (
                                        <>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button onClick={() => { setIsEditing(true); setError(null); }} style={{ padding: '12px', background: '#ccff00', border: 'none', color: '#000', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold', flex: 1 }}>
                                                    EDITAR DATOS
                                                </button>
                                                <button onClick={() => { setIsChangingPass(true); setError(null); }} style={{ padding: '12px', background: '#333', border: '1px solid #ccff00', color: 'white', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold', flex: 1 }}>
                                                    CAMBIAR CONTRASEÑA
                                                </button>
                                            </div>
                                            <button onClick={() => navigate('/')} style={{ padding: '12px', background: 'transparent', border: '1px solid #666', color: '#fff', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold', width: '100%' }}>
                                                VOLVER AL INICIO
                                            </button>
                                        </>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '15px' }}>
                                            <button onClick={() => { setIsEditing(false); setError(null); }} style={{ padding: '12px', background: 'transparent', border: '1px solid #ff4444', color: '#ff4444', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold', flex: 1 }}>
                                                CANCELAR
                                            </button>
                                            <button onClick={handleSaveDatos} style={{ padding: '12px', background: '#ccff00', border: 'none', color: '#000', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold', flex: 1 }}>
                                                GUARDAR CAMBIOS
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* PESTAÑA: INSCRIPCIONES */}
{activeTab === 'inscripciones' && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* 1. MIENTRAS CARGA: Mostramos el spinner */}
        {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ 
                    border: '4px solid rgba(255,255,255,0.1)', 
                    borderTop: '4px solid #ccff00', 
                    borderRadius: '50%', 
                    width: '40px', 
                    height: '40px', 
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 15px'
                }}></div>
                <p style={{ color: '#ccff00', fontWeight: 'bold', fontSize: '1rem' }}>Cargando inscripciones...</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        ) : (
            /* 2. CUANDO TERMINA DE CARGAR: Evaluamos si hay datos o no */
            <>
                {inscripciones.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
                        <p>No te has inscripto a ningún evento todavía.</p>
                        <HashLink 
                            smooth 
                            to="/#eventos" 
                            style={{ 
                                display: 'inline-block',
                                marginTop: '10px', 
                                padding: '8px 16px', 
                                background: '#ccff00', 
                                color: '#000',
                                textDecoration: 'none',
                                border: 'none', 
                                borderRadius: '4px', 
                                fontWeight: 'bold', 
                                cursor: 'pointer' 
                            }}
                        >
                            EXPLORAR EVENTOS
                        </HashLink>
                    </div>
                ) : (
                    <>
                        {/* ─── Tarjetas de Resumen ─── */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
                            {stats.map(s => <StatCard key={s.label} {...s} />)}
                        </div>

                        {/* ─── Contenedor Principal con Filtros ─── */}
                        <div className="grafico-card grafico-card--wide" style={{ background: "#1a1a1a", borderRadius: "16px", border: "1px solid #333", padding: "24px" }}>
                            
                            <div className="grafico-card__header" style={{ marginBottom: "16px" }}>
                                <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#fff" }}>🎟️ Mis Inscripciones</h3>
                            </div>
                            
                            <div className="grafico-card__body">
                                {/* Filtros */}
                                <div style={{ display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
                                    <input 
                                        type="text" 
                                        className="reportes-input" 
                                        placeholder="🔍 Buscar evento..." 
                                        value={busqueda} 
                                        onChange={e => setBusqueda(e.target.value)} 
                                        style={{ padding: "10px", borderRadius: "8px", border: "1px solid #444", background: "#252525", color: "#fff", flex: "1 1 200px" }}
                                    />
                                    <select 
                                        value={filtroEstado} 
                                        onChange={e => setFiltroEstado(e.target.value)}
                                        style={{ padding: "10px", borderRadius: "8px", border: "1px solid #444", background: "#252525", color: "#fff" }}
                                    >
                                        <option value="">Todos los estados</option>
                                        <option value="Pendiente">Pendiente de Pago</option>
                                        <option value="Confirmada">Confirmada</option>
                                        <option value="Cancelada">Cancelada</option>
                                    </select>
                                </div>

                                {/* Contenedores Originales mapeando 'filtradas' en lugar de 'inscripciones' */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {filtradas.length > 0 ? (
                                        filtradas.map((ins) => (
                                            <div key={ins.id_reserva} style={{ 
                                                background: '#0d0d0d', 
                                                border: '1px solid #333', 
                                                borderRadius: '8px', 
                                                padding: '15px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '10px'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>    
                                                    <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>{ins.nombre_evento}</h3>
                                                    <span style={{ 
                                                        background: 'rgba(255,255,255,0.1)', 
                                                        color: getEstadoColor(ins.estado_reserva), 
                                                        padding: '4px 8px', 
                                                        borderRadius: '4px', 
                                                        fontSize: '0.8rem',
                                                        fontWeight: 'bold',
                                                        border: `1px solid ${getEstadoColor(ins.estado_reserva)}`
                                                    }}>
                                                        {ins.estado_reserva}
                                                    </span>
                                                </div>

                                                {/* ✅ MOTIVO DE CANCELACIÓN */}
                                                {ins.estado_reserva === 'Cancelada' && ins.detalle_baja && (
                                                    <div style={{
                                                        padding: '8px 12px',
                                                        background: 'rgba(255, 68, 68, 0.08)',
                                                        border: '1px solid rgba(255, 68, 68, 0.25)',
                                                        borderRadius: '6px',
                                                        fontSize: '0.8rem',
                                                        color: '#ff8888',
                                                        display: 'flex',
                                                        gap: '6px',
                                                        alignItems: 'flex-start'
                                                    }}>
                                                        <span>ℹ️</span>
                                                        <span>{ins.detalle_baja}</span>
                                                    </div>
                                                )}
                                                
                                                {ins.estado_reserva === 'Pendiente' && (
                                                    <div style={{ marginBottom: '10px' }}>
                                                        <ContadorPago fechaReserva={ins.fecha_reserva} />
                                                    </div>
                                                )}

                                                <div style={{ fontSize: '0.9rem', color: '#aaa', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                    <div>📅 {ins.fecha_evento}</div>
                                                    <div>📍 {ins.ubicacion}</div>
                                                    <div style={{ color: '#ccff00', fontWeight: 'bold' }}>💲 ${ins.costo}</div>
                                                </div>

                                                <div style={{ marginTop: '5px', borderTop: '1px solid #222', paddingTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                                    {ins.estado_reserva === 'Pendiente' && (
                                                        <>
                                                            {ins.costo > 0 && (
                                                                <button 
                                                                    onClick={() => handlePagar(ins)}
                                                                    style={{ background: '#009ee3', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold' }}
                                                                >
                                                                    💳 PAGAR AHORA
                                                                </button>
                                                            )}
                                                            <button 
                                                                onClick={() => handleCancelarReserva(ins.id_reserva)}
                                                                style={{ background: 'transparent', color: '#ff4444', border: '1px solid #ff4444', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold' }}
                                                            >
                                                                ✕ CANCELAR RESERVA
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                                <p style={{ color: "#888", textAlign: "center", padding: "20px" }}>
                                                    No se encontraron inscripciones con esos filtros.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                            )}
                        </>
                    )}
                </div>
            )}
            </div> {/* Cierre del contenedor blanco/gris principal */}
            <Footer />
        </div> 
        <ConfirmModal
            show={confirmModal.show}
            title="Cancelar Reserva"
            message="¿Estás seguro de que deseas cancelar esta reserva? Esta acción no se puede deshacer."
            confirmText="Sí, cancelar"
            cancelText="Volver"
            type="danger"
            onConfirm={confirmarCancelacion}
            onCancel={() => setConfirmModal({ show: false, id_reserva: null })}
        />
       </div> 
    );
}