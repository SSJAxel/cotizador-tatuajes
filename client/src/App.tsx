import { useState } from "react";
import { QuoteForm } from "./pricing/QuoteForm";
import { TenantConfigForm } from "./pricing/TenantConfigForm";
import "./App.css";

type Vista = "cliente" | "tatuador";

function App() {
  const [vista, setVista] = useState<Vista>("cliente");

  return (
    <div>
      <nav className="vista-switch">
        <button
          type="button"
          className={vista === "cliente" ? "activo" : ""}
          onClick={() => setVista("cliente")}
        >
          Cotizador (cliente)
        </button>
        <button
          type="button"
          className={vista === "tatuador" ? "activo" : ""}
          onClick={() => setVista("tatuador")}
        >
          Configuración (tatuador)
        </button>
      </nav>

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
