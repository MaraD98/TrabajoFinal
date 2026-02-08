import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import logoWakeUp from '../assets/wakeup-logo.png';
import '../styles/navbar.css'; 
import axios from 'axios';
import { getMisNotificaciones, marcarNotificacionLeida } from "../services/notificacion-service";

export const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    // --- ESTADOS ---
    const [isDropdownOpen, setIsDropdownOpen] = useState(false); // Menú usuario
    const [notifOpen, setNotifOpen] = useState(false); // Menú notificaciones
    const [localUserName, setLocalUserName] = useState<string>("Usuario");
    const [miniNotificaciones, setMiniNotificaciones] = useState<any[]>([]);
    
    // --- REFS ---
    const dropdownRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    const showBackButton = location.pathname !== '/';

    // ---------------------------------------------------------
    // 1. EFECTO: Clic fuera para cerrar menús
    // ---------------------------------------------------------
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Cerrar menú de usuario
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            // Cerrar menú de notificaciones
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setNotifOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ---------------------------------------------------------
    // 2. EFECTO: Obtener nombre de usuario
    // ---------------------------------------------------------
    useEffect(() => {
        const storedUser = localStorage.getItem('user') || localStorage.getItem('usuario');
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                const nombreReal = parsed.nombre_y_apellido || parsed.nombre;
                if (nombreReal && nombreReal !== "Usuario") {
                    setLocalUserName(nombreReal);
                }
            } catch (e) {
                console.error("Error leyendo datos locales", e);
            }
        }

        const token = localStorage.getItem('token');
        if (token) {
            axios.get(`${import.meta.env.VITE_API_URL}/me`, {
                headers: { Authorization: `Bearer ${token}` }
            }).then(res => {
                const nombreDelServer = res.data.nombre_y_apellido || res.data.nombre;
                if (nombreDelServer) {
                    setLocalUserName(nombreDelServer);
                }
            }).catch(err => console.log("No se pudo refrescar el nombre", err));
        }
    }, []);

    // ---------------------------------------------------------
    // 3. EFECTO: Cargar Notificaciones (Solo si hay usuario)
    // ---------------------------------------------------------
    useEffect(() => {
        if (user) {
            cargarMiniNotificaciones();
            // Polling cada 60 seg
            const interval = setInterval(cargarMiniNotificaciones, 60000);
            return () => clearInterval(interval);
        }
    }, [user]);

    // --- FUNCIONES DE NOTIFICACIONES ---
    const cargarMiniNotificaciones = async () => {
        try {
            const data = await getMisNotificaciones();
            setMiniNotificaciones(data);
        } catch (error) {
            console.error("Error loading notifications");
        }
    };

    const handleVerTodas = () => {
        setNotifOpen(false);
        navigate("/notificaciones");
    };

    const marcarYRedirigir = async (id: number) => {
        // Evitamos propagación para que no cierre el menú antes de tiempo (opcional)
        await marcarNotificacionLeida(id);
        cargarMiniNotificaciones();
        // Aquí podrías navegar a algún lado si quisieras
    };

    // Cálculos para la UI
    const noLeidasCount = miniNotificaciones.filter(n => !n.leida).length;
    const ultimasNotificaciones = miniNotificaciones.slice(0, 5);

    return (
        <nav className="main-navbar">
            <div className="nav-left">
                {showBackButton && (
                    <button className="btn-back-nav" onClick={() => navigate('/')}>
                        ← <span className="hide-mobile">Inicio</span>
                    </button>
                )}
            </div>

            <div className="nav-center">
                <Link to="/">
                    <img src={logoWakeUp} alt="Wake Up Bikes" className="nav-logo" />
                </Link>
            </div>

            <div className="nav-right">
                {user ? (
                    // ---------------------------------------
                    // SOLO SI ESTÁ LOGUEADO: Campana + Perfil
                    // ---------------------------------------
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        
                        {/* --- WIDGET NOTIFICACIONES --- */}
                        <div className="notif-widget" ref={notifRef}>
                            <button 
                                className="notif-bell-btn" 
                                onClick={() => setNotifOpen(!notifOpen)}
                            >
                                🔔
                                {noLeidasCount > 0 && <span className="badge-rojo">{noLeidasCount}</span>}
                            </button>

                            {notifOpen && (
                                <div className="notif-dropdown">
                                    <div className="notif-dropdown-header">
                                        <strong>Notificaciones</strong>
                                    </div>
                                    
                                    <div className="notif-dropdown-list">
                                        {ultimasNotificaciones.length === 0 ? (
                                            <p className="sin-notif">Sin novedades</p>
                                        ) : (
                                            ultimasNotificaciones.map((notif) => (
                                                <div 
                                                    key={notif.id_notificacion} 
                                                    className={`notif-item-mini ${!notif.leida ? 'unread' : ''}`}
                                                    onClick={() => marcarYRedirigir(notif.id_notificacion)}
                                                >
                                                    <p>{notif.mensaje}</p>
                                                    <span>{new Date(notif.fecha_creacion).toLocaleDateString()}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <div className="notif-dropdown-footer">
                                        <button onClick={handleVerTodas} className="btn-ver-todas">
                                            Ver todas las notificaciones
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* --- FIN NOTIFICACIONES --- */}

                        {/* --- MENU USUARIO --- */}
                        <div className="user-menu-container" ref={dropdownRef}>
                            <button 
                                className="user-menu-trigger" 
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            >
                                <span className="user-icon">👤</span>
                                <span className="user-name">{localUserName}</span>
                                <span className="dropdown-arrow">▼</span>
                            </button>

                            {isDropdownOpen && (
                                <div className="user-dropdown">
                                    <div className="dropdown-header">MI CUENTA</div>
                                    <Link to="/perfil" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>👤 Mi Perfil</Link>
                                    <Link to="/reportes" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>📊 Mis Reportes</Link>
                                    
                                    <div className="dropdown-header">EVENTOS</div>
                                    <Link to="/mis-eventos/inscriptos" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>Inscriptos</Link>
                                    <Link to="/mis-eventos/creados" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>Creados</Link>
                                    
                                    <div className="dropdown-divider"></div>
                                    <button onClick={logout} className="dropdown-item logout-button">Cerrar Sesión</button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    // ---------------------------------------
                    // SI NO ESTÁ LOGUEADO: Botón Login
                    // ---------------------------------------
                    <Link to="/login" className="hero-login-btn">INICIAR SESIÓN</Link>
                )}
            </div>
        </nav>
    );
};