import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/inicio.css';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { Footer } from "../components/footer";

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
    costo: number;
}

// --- COMPONENTE CUENTA REGRESIVA ---
const ContadorPago = ({ fechaReserva }: { fechaReserva: string }) => {
    const [tiempoRestante, setTiempoRestante] = useState("");
    const [color, setColor] = useState("#ffbb00");
    const [expiro, setExpiro] = useState(false);
    
    useEffect(() => {
        const calcularTiempo = () => {
            const fechaInicio = new Date(fechaReserva).getTime();
            const fechaLimite = fechaInicio + (72 * 60 * 60 * 1000);
            const ahora = new Date().getTime();
            const diferencia = fechaLimite - ahora;

            if (diferencia <= 0) {
                setTiempoRestante("Tiempo agotado");
                setExpiro(true);
                return;
            }

            const horas = Math.floor(diferencia / (1000 * 60 * 60));
            const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
            const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);

            const hStr = horas < 10 ? `0${horas}` : horas;
            const mStr = minutos < 10 ? `0${minutos}` : minutos;
            const sStr = segundos < 10 ? `0${segundos}` : segundos;

            setTiempoRestante(`${hStr}:${mStr}:${sStr}`);

            if (horas < 1) {
                setColor("#ff4444");
            } else {
                setColor("#ccff00");
            }
        };

        const intervalo = setInterval(calcularTiempo, 1000);
        calcularTiempo(); 

        return () => clearInterval(intervalo);
    }, [fechaReserva]);

    if (expiro) return <div style={{ color: '#ff4444', fontWeight: 'bold', marginTop: '5px', fontSize: '0.9rem' }}>⚠️ Reserva vencida</div>;

    return (
        <div style={{ marginTop: '8px', fontSize: '0.9rem', color: '#ccc', background: 'rgba(255,255,255,0.05)', padding: '5px 10px', borderRadius: '4px', display: 'inline-block' }}>
            Tiempo para pagar: <span style={{ color: color, fontWeight: 'bold', fontFamily: 'monospace', fontSize: '1rem', marginLeft: '5px' }}>{tiempoRestante}</span>
        </div>
    );
};

export default function PerfilPage() {
    // 🔥 DESESTRUCTURACIÓN COMPLETA DEL CONTEXTO
    const { user, logout, getToken } = useAuth();
    
    const [perfil, setPerfil] = useState<UserProfile | null>(null);
    const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    
    const [activeTab, setActiveTab] = useState<'datos' | 'inscripciones'>('datos');
    const [isEditing, setIsEditing] = useState(false); 
    const [isChangingPass, setIsChangingPass] = useState(false); 

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
    const location = useLocation();
    const apiUrl = import.meta.env.VITE_API_URL;
    
    // 🔥 NOMBRE DE USUARIO DINÁMICO (con optional chaining para evitar errores)
    const displayUserName = (perfil?.nombre_y_apellido?.split(' ')[0] || user?.nombre_y_apellido?.split(' ')[0] || "Usuario").toUpperCase();
    
    // 🔥 DETECCIÓN DE ROLES (usa user?.id_rol con optional chaining)
    const esAdmin = user?.id_rol === 1; // Admin total
    const esSupervisor = user?.id_rol === 2; // Supervisor
    const esOperario = user?.id_rol === 3; // Operario
    const esCliente = user?.id_rol === 4; // Cliente
    
    // 🔥 ROLES CON ACCESO TOTAL (Admin + Supervisor)
    const tieneAccesoTotal = esAdmin || esSupervisor;
    
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 1. LEER URL Y CARGAR PERFIL
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('tab') === 'inscripciones') {
            setActiveTab('inscripciones');
        }
        
        fetchPerfil();
    }, [location]);

    // 2. EFECTO: Si cambio a la pestaña inscripciones, cargo los datos
    useEffect(() => {
        if (activeTab === 'inscripciones') {
            fetchInscripciones();
        }
    }, [activeTab]);

    // 🔥 FUNCIÓN CORREGIDA: Usa getToken()
    const fetchPerfil = async () => {
        const token = getToken();
        
        if (!token) { 
            navigate('/login'); 
            return; 
        }

        try {
            const response = await axios.get(`${apiUrl}/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPerfil(response.data);
            setEditForm({
                nombre_y_apellido: response.data.nombre_y_apellido || '',
                email: response.data.email || '',
                telefono: response.data.telefono || '',
                direccion: response.data.direccion || '',
                enlace_redes: response.data.enlace_redes || ''
            });
        } catch (err) {
            console.error(err);
            setError('No se pudo cargar el perfil.');
        } finally {
            setLoading(false);
        }
    };

    const fetchInscripciones = async () => {
        const token = getToken();
        
        try {
            const response = await axios.get(`${apiUrl}/me/inscripciones`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInscripciones(response.data);
        } catch (err) {
            console.error("Error cargando inscripciones:", err);
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
        if (!window.confirm("¿Estás seguro de que deseas cancelar esta reserva?")) {
            return;
        }

        const token = getToken();
        
        try {
            await axios.delete(`${apiUrl}/inscripciones/${id_reserva}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSuccessMsg("Reserva cancelada correctamente.");
            fetchInscripciones(); 
            setTimeout(() => setSuccessMsg(null), 3000);
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (err: any) {
            console.error("Error al cancelar:", err);
            const mensaje = err.response?.data?.detail || "No se pudo cancelar la reserva.";
            setError(mensaje);
            setTimeout(() => setError(null), 4000);
        }
    };

    const getEstadoColor = (estado: string) => {
        switch(estado) {
            case 'Pendiente de Pago': return '#ffbb00';
            case 'Confirmado': return '#ccff00';
            case 'Cancelado': return '#ff4444';
            default: return '#fff';
        }
    };

    if (loading) {
        return (
            <div className="perfil-page-loading-container"> 
                <div className="perfil-loading">
                    <div className="spinner-large"></div>
                    <p style={{ color: '#ccff00', marginTop: '10px', fontWeight: 'bold' }}>CARGANDO PERFIL...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="inicio-container" style={{ minHeight: '100vh', paddingTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '50px' }}>
            
            <div style={{ 
                width: '100%', 
                maxWidth: '800px', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                position: 'relative', 
                marginBottom: '30px',
                padding: '0 20px' 
            }}>
                
                <Link
                  to="/"
                  className="btn-volver-inicio"
                  style={{
                    position: 'fixed',
                    left: '60px',
                    top: '40px'
                  }}
                >
                  <span className="icono-flecha">←</span>
                  <span className="texto-volver">VOLVER AL INICIO</span>
                </Link>

                <h2 className="section-title" style={{ margin: 0, textAlign: 'center' }}>Mi Cuenta</h2>

                <div style={{ position: 'fixed', right: '60px' }}>
                    {user ? (
                        <div className="user-menu-container" ref={dropdownRef} style={{ margin: 0 }}>
                            <button
                                className="user-menu-trigger"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                style={{ whiteSpace: 'nowrap' }}
                            >
                                <span className="user-icon">👤</span>
                                <span className="user-name">{displayUserName}</span>
                                <span className="dropdown-arrow">▼</span>
                            </button>

                            {/* 🔥 MENÚ DESPLEGABLE CONDICIONAL POR ROL */}
                            {isDropdownOpen && (
                                <div className="user-dropdown" style={{ right: 0, left: 'auto' }}>
                                    {/* ========== SECCIÓN: MI CUENTA (TODOS) ========== */}
                                    <div className="dropdown-header" style={{ textAlign: 'center', width: '100%', display: 'block' }}>
                                        MI CUENTA
                                    </div>
                                    
                                    <Link 
                                        to="/perfil" 
                                        className="dropdown-item" 
                                        onClick={() => setIsDropdownOpen(false)}
                                    >
                                        👤 Mi Perfil
                                    </Link>

                                    {/* Mis Reportes: Solo para usuarios estándar (Operario y Cliente) */}
                                    {(esOperario || esCliente) && (
                                        <Link 
                                            to="/reportes" 
                                            className="dropdown-item" 
                                            onClick={() => setIsDropdownOpen(false)}
                                        >
                                            📊 Mis Reportes
                                        </Link>
                                    )}

                                    {/* ========== SECCIÓN: MIS EVENTOS (TODOS) ========== */}
                                    <div className="dropdown-header">MIS EVENTOS</div>

                                    {/* Inscriptos: diferente ruta según rol */}
                                    <Link 
                                        to={tieneAccesoTotal ? "/reporte-inscriptos" : "/perfil?tab=inscripciones"}
                                        className="dropdown-item" 
                                        onClick={() => setIsDropdownOpen(false)}
                                    >
                                        📅 Inscriptos
                                    </Link>

                                    <Link 
                                        to="/mis-eventos" 
                                        className="dropdown-item" 
                                        onClick={() => setIsDropdownOpen(false)}
                                    >
                                        📋 Mis Eventos
                                    </Link>

                                    {/* ========== SECCIÓN: GESTIÓN (SOLO ADMIN Y SUPERVISOR) ========== */}
                                    {tieneAccesoTotal && (
                                        <>
                                            <div className="dropdown-header">GESTIÓN</div>
                                            
                                            <Link 
                                                to="/admin" 
                                                className="dropdown-item" 
                                                onClick={() => setIsDropdownOpen(false)}
                                            >
                                                🏠 Panel General
                                            </Link>

                                            <Link 
                                                to="/registro-evento" 
                                                className="dropdown-item" 
                                                onClick={() => setIsDropdownOpen(false)}
                                            >
                                                ➕ Gestionar Eventos
                                            </Link>

                                            <Link 
                                                to="/admin/usuarios" 
                                                className="dropdown-item" 
                                                onClick={() => setIsDropdownOpen(false)}
                                            >
                                                👥 Usuarios
                                            </Link>
                                        </>
                                    )}
                                    
                                    <div className="dropdown-divider"></div>
                                    
                                    <button
                                        onClick={logout}
                                        className="dropdown-item logout-button"
                                    >
                                        🚪 Cerrar Sesión
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link to="/login" className="hero-login-btn">INICIAR SESIÓN</Link>
                    )}
                </div>
            </div>

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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {inscripciones.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
                                <p>No te has inscripto a ningún evento todavía.</p>
                                <button onClick={() => navigate('/')} style={{ marginTop: '10px', padding: '8px 16px', background: '#ccff00', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                                    EXPLORAR EVENTOS
                                </button>
                            </div>
                        ) : (
                            inscripciones.map((ins) => (
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
                                    
                                    {ins.estado_reserva === 'Pendiente de Pago' && (
                                        <div>
                                            <ContadorPago fechaReserva={ins.fecha_reserva} />
                                        </div>
                                    )}

                                    <div style={{ fontSize: '0.9rem', color: '#aaa', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <div>📅 {ins.fecha_evento} {ins.hora_evento ? `- ${ins.hora_evento}` : ''}</div>
                                        <div>📍 {ins.ubicacion}</div>
                                        <div style={{ color: '#ccff00', fontWeight: 'bold' }}>💲 ${ins.costo}</div>
                                    </div>

                                    <div style={{ marginTop: '5px', borderTop: '1px solid #222', paddingTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                                        {ins.estado_reserva === 'Pendiente de Pago' && (
                                            <button 
                                                onClick={() => handleCancelarReserva(ins.id_reserva)}
                                                style={{ 
                                                    background: '#ff4444', 
                                                    color: 'white', 
                                                    border: 'none', 
                                                    padding: '6px 12px', 
                                                    borderRadius: '4px', 
                                                    fontSize: '0.8rem', 
                                                    cursor: 'pointer',
                                                    fontWeight: 'bold'
                                                }}
                                            >
                                                ✕ CANCELAR RESERVA
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
}