import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import "../styles/register.css"; // 🔥 Reutilizamos tus estilos de registro

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) return;

    setLoading(true);
    
    // SIMULACIÓN: Aquí iría la llamada a tu backend
    setTimeout(() => {
      setSuccess(true);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="register-page">
      <div className="register-page__container">
        
        {/* LADO IZQUIERDO: FORMULARIO */}
        <div className="register-card">
          <div className="register-card__header">
            <div className="register-logo">
              <div className="register-logo__icon">🔐</div>
              <h1 className="register-logo__title">Recuperar Acceso</h1>
            </div>
            <p className="register-card__subtitle">
              Ingresa tu email y te enviaremos las instrucciones.
            </p>
          </div>

          {success ? (
            <div className="register-success">
              <div className="register-success__icon">📩</div>
              <h2 className="register-success__title">¡Correo Enviado!</h2>
              <p className="register-success__message">
                Si el correo <strong>{email}</strong> existe en nuestra base de datos, recibirás un enlace para restaurar tu contraseña.
              </p>
              <br />
              <Link to="/login" className="register-form__submit" style={{textDecoration: 'none', textAlign: 'center', display: 'block'}}>
                Volver a Iniciar Sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="register-form">
              
              <div className="register-form__group">
                <label htmlFor="email" className="register-form__label">
                  Email registrado
                </label>
                <div className="register-form__input-wrapper">
                  <input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="register-form__input"
                    required
                    autoComplete="email"
                    disabled={loading}
                  />
                  <span className="register-form__icon">📧</span>
                </div>
              </div>

              <button
                type="submit"
                className="register-form__submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="register-spinner"></span>
                    Enviando...
                  </>
                ) : (
                  "Enviar enlace de recuperación"
                )}
              </button>
            </form>
          )}

          <div className="register-card__footer">
            <p className="register-footer__text">
              ¿Te acordaste de la clave?{" "}
              <Link to="/login" className="register-footer__link">
                Volver al login
              </Link>
            </p>
          </div>
        </div>

        {/* LADO DERECHO: BENEFICIOS (Reutilizado para mantener estética) */}
        <div className="register-benefits">
          <h2 className="register-benefits__title">
            ¿Necesitas ayuda?
          </h2>
          <div className="register-benefit">
            <div className="register-benefit__icon">🛡️</div>
            <div className="register-benefit__content">
              <h3 className="register-benefit__title">Seguridad Garantizada</h3>
              <p className="register-benefit__description">
                Tus datos están protegidos. Nunca compartiremos tu contraseña con nadie.
              </p>
            </div>
          </div>
          <div className="register-benefit">
            <div className="register-benefit__icon">📧</div>
            <div className="register-benefit__content">
              <h3 className="register-benefit__title">Revisa tu Spam</h3>
              <p className="register-benefit__description">
                Si no recibes el correo en unos minutos, verifica tu carpeta de correo no deseado.
              </p>
            </div>
          </div>
          <div className="register-benefit">
            <div className="register-benefit__icon">🆘</div>
            <div className="register-benefit__content">
              <h3 className="register-benefit__title">Soporte Técnico</h3>
              <p className="register-benefit__description">
                Si sigues teniendo problemas, contáctanos a soporte@sportevents.com
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}