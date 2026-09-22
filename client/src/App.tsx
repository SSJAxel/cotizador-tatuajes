import { useState } from "react";
import { QuoteForm } from "./pricing/QuoteForm";
import { TenantConfigForm } from "./pricing/TenantConfigForm";
import "./App.css";

function App() {
  const [vista, setVista] = useState<"cliente" | "tatuador">("cliente");

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

      {vista === "cliente" ? <QuoteForm /> : <TenantConfigForm />}
    </div>
  );
}

export default App;
