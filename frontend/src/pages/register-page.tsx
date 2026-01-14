import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../services/eventos";
import "../styles/register.css";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    nombre_y_apellido: "",
    email: "",
    contrasenia: "",
    confirmarContrasenia: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const validateForm = () => {
    if (!formData.nombre_y_apellido.trim()) {
      setError("Por favor ingresa tu nombre completo");
      return false;
    }
    if (!formData.email.trim()) {
      setError("Por favor ingresa tu email");
      return false;
    }
    if (formData.contrasenia.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return false;
    }
    if (formData.contrasenia !== formData.confirmarContrasenia) {
      setError("Las contraseñas no coinciden");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { confirmarContrasenia, ...dataToSend } = formData;
      const usuario = await register(dataToSend);
      console.log("Usuario registrado:", usuario);

      setSuccess(true);

      // Esperar 2 segundos y redirigir al login
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      console.error("Error en registro:", err);
      setError(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "No se pudo registrar el usuario. Por favor intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-page__container">
        <div className="register-card">
          <div className="register-card__header">
            <div className="register-logo">
              <div className="register-logo__icon">🚴‍♂️</div>
              <h1 className="register-logo__title">SportEvents</h1>
            </div>
            <p className="register-card__subtitle">
              Únete a nuestra comunidad deportiva
            </p>
          </div>

          {success ? (
            <div className="register-success">
              <div className="register-success__icon">✓</div>
              <h2 className="register-success__title">¡Registro Exitoso!</h2>
              <p className="register-success__message">
                Tu cuenta ha sido creada correctamente.
              </p>
              <p className="register-success__redirect">
                Redirigiendo al inicio de sesión...
              </p>
              <div className="register-success__spinner"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="register-form">
              {error && (
                <div className="register-alert register-alert--error">
                  <span className="register-alert__icon">⚠️</span>
                  <span className="register-alert__message">{error}</span>
                </div>
              )}

              <div className="register-form__group">
                <label htmlFor="nombre_y_apellido" className="register-form__label">
                  Nombre Completo
                </label>
                <div className="register-form__input-wrapper">
                  <input
                    id="nombre_y_apellido"
                    type="text"
                    name="nombre_y_apellido"
                    placeholder="Ej: Juan Pérez"
                    value={formData.nombre_y_apellido}
                    onChange={handleChange}
                    className="register-form__input"
                    required
                    autoComplete="name"
                    disabled={loading}
                  />
                  <span className="register-form__icon">👤</span>
                </div>
              </div>

              <div className="register-form__group">
                <label htmlFor="email" className="register-form__label">
                  Email
                </label>
                <div className="register-form__input-wrapper">
                  <input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="register-form__input"
                    required
                    autoComplete="email"
                    disabled={loading}
                  />
                  <span className="register-form__icon">📧</span>
                </div>
              </div>

              <div className="register-form__group">
                <label htmlFor="contrasenia" className="register-form__label">
                  Contraseña
                </label>
                <div className="register-form__input-wrapper">
                  <input
                    id="contrasenia"
                    type={showPassword ? "text" : "password"}
                    name="contrasenia"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.contrasenia}
                    onChange={handleChange}
                    className="register-form__input"
                    required
                    autoComplete="new-password"
                    disabled={loading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="register-form__toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
              </div>

              <div className="register-form__group">
                <label htmlFor="confirmarContrasenia" className="register-form__label">
                  Confirmar Contraseña
                </label>
                <div className="register-form__input-wrapper">
                  <input
                    id="confirmarContrasenia"
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmarContrasenia"
                    placeholder="Repite tu contraseña"
                    value={formData.confirmarContrasenia}
                    onChange={handleChange}
                    className="register-form__input"
                    required
                    autoComplete="new-password"
                    disabled={loading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="register-form__toggle-password"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
              </div>

              <div className="register-form__terms">
                <label className="register-checkbox">
                  <input
                    type="checkbox"
                    className="register-checkbox__input"
                    required
                  />
                  <span className="register-checkbox__label">
                    Acepto los{" "}
                    <a href="#" className="register-link">
                      términos y condiciones
                    </a>{" "}
                    y la{" "}
                    <a href="#" className="register-link">
                      política de privacidad
                    </a>
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className="register-form__submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="register-spinner"></span>
                    Creando cuenta...
                  </>
                ) : (
                  "Crear Cuenta"
                )}
              </button>
            </form>
          )}

          <div className="register-card__footer">
            <p className="register-footer__text">
              ¿Ya tienes cuenta?{" "}
              <a href="/login" className="register-footer__link">
                Inicia sesión aquí
              </a>
            </p>
          </div>

          {!success && (
            <>
              <div className="register-divider">
                <span className="register-divider__text">o regístrate con</span>
              </div>

              <div className="register-social">
                <button className="register-social__btn register-social__btn--google">
                  <span className="register-social__icon">G</span>
                  Google
                </button>
                <button className="register-social__btn register-social__btn--facebook">
                  <span className="register-social__icon">f</span>
                  Facebook
                </button>
              </div>
            </>
          )}
        </div>

        <div className="register-benefits">
          <h2 className="register-benefits__title">
            ¿Por qué unirte a SportEvents?
          </h2>
          <div className="register-benefit">
            <div className="register-benefit__icon">🏃‍♂️</div>
            <div className="register-benefit__content">
              <h3 className="register-benefit__title">Descubre Eventos</h3>
              <p className="register-benefit__description">
                Accede a una amplia selección de carreras, maratones y eventos deportivos en toda Argentina
              </p>
            </div>
          </div>
          <div className="register-benefit">
            <div className="register-benefit__icon">🗺️</div>
            <div className="register-benefit__content">
              <h3 className="register-benefit__title">Explora el Mapa</h3>
              <p className="register-benefit__description">
                Encuentra eventos cerca de tu ubicación con nuestro mapa interactivo
              </p>
            </div>
          </div>
          <div className="register-benefit">
            <div className="register-benefit__icon">🎯</div>
            <div className="register-benefit__content">
              <h3 className="register-benefit__title">Crea tus Eventos</h3>
              <p className="register-benefit__description">
                Organiza y publica tus propios eventos deportivos fácilmente
              </p>
            </div>
          </div>
          <div className="register-benefit">
            <div className="register-benefit__icon">👥</div>
            <div className="register-benefit__content">
              <h3 className="register-benefit__title">Únete a la Comunidad</h3>
              <p className="register-benefit__description">
                Conecta con otros deportistas y comparte tu pasión por el deporte
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}