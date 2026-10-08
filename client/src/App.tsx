import { useState } from "react";
import { QuoteForm } from "./pricing/QuoteForm";
import { TenantConfigForm } from "./pricing/TenantConfigForm";
import { ResetPasswordPage } from "./pricing/ResetPasswordPage";
import "./App.css";

type Vista = "cliente" | "tatuador";

function App() {
  const [vista, setVista] = useState<Vista>("cliente");

  // El link del mail de "olvidé mi contraseña" abre esta ruta directo (sin
  // react-router, no hace falta más que esto para una sola página standalone).
  if (window.location.pathname === "/reset-password") {
    return <ResetPasswordPage />;
  }

  return (
    <div>
      <header className="topbar">
        <a className="topbar__brand" href="#top">
          capi<span>cotizador</span>
        </a>
        <nav className="vista-switch" aria-label="Cambiar vista">
          <button
            type="button"
            className={vista === "cliente" ? "activo" : ""}
            onClick={() => setVista("cliente")}
          >
            Cliente
          </button>
          <button
            type="button"
            className={vista === "tatuador" ? "activo" : ""}
            onClick={() => setVista("tatuador")}
          >
            Tatuador
          </button>
        </nav>
      </header>

      {/* Se mantienen ambas montadas (nunca desmontadas) para no perder la
          sesión de Configuración (token/config en memoria) ni el progreso
          del formulario de cotización al cambiar de pestaña. */}
      <div className={vista === "cliente" ? undefined : "vista-oculta"}>
        <QuoteForm />
      </div>
      <div className={vista === "tatuador" ? undefined : "vista-oculta"}>
        <TenantConfigForm />
      </div>
    </div>
  );
}

export default App;
