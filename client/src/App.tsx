import { useState } from "react";
import { QuoteForm } from "./pricing/QuoteForm";
import { TenantConfigForm } from "./pricing/TenantConfigForm";
import { Preview3D } from "./preview3d/Preview3D";
import "./App.css";

type Vista = "cliente" | "tatuador" | "vista3d";

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
        <button
          type="button"
          className={vista === "vista3d" ? "activo" : ""}
          onClick={() => setVista("vista3d")}
        >
          Vista 3D (beta)
        </button>
      </nav>

      {vista === "cliente" && <QuoteForm />}
      {vista === "tatuador" && <TenantConfigForm />}
      {vista === "vista3d" && <Preview3D />}
    </div>
  );
}

export default App;
