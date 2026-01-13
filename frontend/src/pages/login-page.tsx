import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { login, getCurrentUser } from "../services/eventos";
import "../styles/login.css";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    contrasenia: "",
  });
  const [loading, setLoading] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const showAuthNotice = location.state?.reason === "auth"; 
  const showRoleDeniedNotice = location.state?.reason === "role-denied";

  // Chequear si ya hay token 
  const token = localStorage.getItem("token");

  // Si ya está logueado, mostrar mensaje y botón de logout
  if (token) {
    return (
      <div className="login-page">
        <h2>Ya estás logueado ✅</h2>
        <button
          onClick={() => {
            localStorage.removeItem("token");
            navigate("/login"); // refrescar login
          }}
        >
          Cerrar sesión
        </button>
      </div>
    );
  }

  // Si no hay token, mostrar el formulario normal
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.contrasenia) {
      setError("Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await login(formData.email, formData.contrasenia);

      if (response.access_token) {
        localStorage.setItem("token", response.access_token);
        // Si querés guardar también el tipo de token
        localStorage.setItem("token_type", response.token_type);

        // pedir usuario actual 
        const usuario = await getCurrentUser(response.access_token);
        localStorage.setItem("rol", usuario.id_rol.toString());

        // Redirigir al inicio o a los eventos
        navigate("/");
      } else {
        setError("Error en la autenticación");
      }
    } catch (err: any) {
      console.error("Error en login:", err);
      setError(
        err.response?.data?.detail || // FastAPI suele devolver "detail"
        "Email o contraseña incorrectos"
      );
    } finally {
      setLoading(false);
    }

  };

  return (
    <div className="login-page">
      <div className="login-page__container">
        <div className="login-card">
          <div className="login-card__header">
            <div className="login-logo">
              <div className="login-logo__icon">🏃‍♂️</div>
              <h1 className="login-logo__title">SportEvents</h1>
            </div>
            <p className="login-card__subtitle">
              Inicia sesión para descubrir eventos deportivos
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
          {showAuthNotice && (
          <div className="login-alert login-alert--error">
            <span className="login-alert__icon">⚠️</span>
            <span className="login-alert__message">Debes iniciar sesión primero</span>
          </div>
        )}

        {showRoleDeniedNotice && (
          <div className="login-alert login-alert--error">
            <span className="login-alert__icon">⚠️</span>
            <span className="login-alert__message">
              No tienes permisos para crear eventos
            </span>
          </div>
        )}



            <div className="login-form__group">
              <label htmlFor="email" className="login-form__label">
                Email
              </label>
              <div className="login-form__input-wrapper">
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="login-form__input"
                  required
                  autoComplete="email"
                  disabled={loading}
                />
                <span className="login-form__icon">📧</span>
              </div>
            </div>

            <div className="login-form__group">
              <label htmlFor="contrasenia" className="login-form__label">
                Contraseña
              </label>
              <div className="login-form__input-wrapper">
                <input
                  id="contrasenia"
                  type={showPassword ? "text" : "password"}
                  name="contrasenia"
                  placeholder="••••••••"
                  value={formData.contrasenia}
                  onChange={handleChange}
                  className="login-form__input"
                  required
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="login-form__toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            <div className="login-form__options">
              <label className="login-checkbox">
                <input type="checkbox" className="login-checkbox__input" />
                <span className="login-checkbox__label">Recordarme</span>
              </label>
              <a href="#" className="login-link">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <button
              type="submit"
              className="login-form__submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="login-spinner"></span>
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar Sesión"
              )}
            </button>
          </form>

          <div className="login-card__footer">
            <p className="login-footer__text">
              ¿No tienes cuenta?{" "}
              <a href="/register" className="login-footer__link">
                Regístrate aquí
              </a>
            </p>
          </div>

          <div className="login-divider">
            <span className="login-divider__text">o continúa con</span>
          </div>

          <div className="login-social">
            <button className="login-social__btn login-social__btn--google">
              <span className="login-social__icon">G</span>
              Google
            </button>
            <button className="login-social__btn login-social__btn--facebook">
              <span className="login-social__icon">f</span>
              Facebook
            </button>
          </div>
        </div>

        <div className="login-features">
          <div className="login-feature"
            onClick={() => navigate("/eventos")}
          >
            <div className="login-feature__icon">🏆</div>
            <h3 className="login-feature__title">Descubre Eventos</h3>
            <p className="login-feature__description">
              Encuentra carreras, maratones y eventos deportivos cerca de ti
            </p>
          </div>
          <div className="login-feature" 
            onClick={() => navigate("/mapa")} 
          >
            <div className="login-feature__icon">🗺️</div>
            <h3 className="login-feature__title">Explora el Mapa</h3>
            <p className="login-feature__description">
              Visualiza todos los eventos en un mapa interactivo
            </p>
          </div>
          <div
            className="login-feature"
            onClick={() => {
              const token = localStorage.getItem("token");
              const rol = localStorage.getItem("rol");

              const allowedRoles = [1, 2]; // IDs de admin y supervisor

              if (!token) {
                navigate("/login", { state: { reason: "auth" } });
                return;
              }

              if (!rol || !allowedRoles.includes(Number(rol))) {
                navigate("/login", { state: { reason: "role-denied" } });
                return;
              }

              navigate("/registro-evento");
            }}
          >
            <div className="login-feature__icon">🎯</div>
            <h3 className="login-feature__title">Crea tus Eventos</h3>
            <p className="login-feature__description">
              Organiza y publica tus propios eventos deportivos
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}