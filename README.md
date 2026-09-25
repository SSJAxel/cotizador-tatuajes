# Cotizador (tatuadores)

Herramienta web para que cada tatuador tenga **su propio cotizador de precio**,
configurable a su fórmula y su mercado, más (en una fase posterior) una
**vista previa 3D** del diseño puesto sobre un cuerpo con peso y altura
ajustables, para mostrarle al cliente cómo quedaría antes de agendar.

No es un formulario de contacto genérico ni "otra calculadora de tatuajes" —
el diferencial es la combinación de un motor de precio con variables finas
que hoy nadie ofrece, más (a futuro) un preview 3D paramétrico que tampoco
existe integrado en ningún producto del mercado.

## Relación con otros proyectos (decidido 2026-09-20)

**Standalone**, sin depender de booking-saas ni capimenu — repo, base de
datos, autenticación y suscripción propios. Se descartó integrarlo como
módulo/tier dentro de booking-saas: ya existía una decisión cerrada de
no portar módulos a la carta ahí (evaluado como no rentable), y meter el
Cotizador como feature paga solo-para-tatuadores es el mismo patrón.
Verticalizar precio funciona mejor con marca y posicionamiento propios
("herramienta hecha para tatuadores") que como casilla en un SaaS genérico
de turnos. Cross-sell/integración liviana con booking-saas (API o embed)
queda como opción futura, sin fusionar backend ni facturación.

## Motor de precio (v1 — en definición, SUPERADO 2026-09-25)

> **Esta sección quedó superada.** El modelo de abajo (precio por cm, cantidad
> de tintas/agujas como variables de cotización) resultó estar construido
> sobre un supuesto que la industria misma considera un error de principiante
> — ver "Rediseño del motor de precio (2026-09-25)" más abajo para el modelo
> vigente (horas estimadas × tarifa horaria). Se deja esta sección como
> registro histórico de cómo se llegó hasta acá, no como referencia de
> implementación actual.

Precio **aproximado** en base a variables configurables por tatuador. El
precio final puede o no variar respecto al estimado (queda a criterio del
tatuador, no es un compromiso vinculante).

Variables previstas:

1. Tamaño
2. Zona del cuerpo (excluye zonas íntimas: pene, ano, paladar/interior de
   boca, esclerótica — párpados sí se incluyen)
3. Diseño (no es un input propio — se resuelve con las variables 4, 5, 6
   y 10: cantidad de insumos + técnica)
4. Cantidad de tintas
5. Cantidad de agujas
6. Técnica del diseño
7. Cantidad de gente capacitada para realizar ese mismo trabajo
8. Precio de oferta en la localidad
9. Horario en el que se concreta el turno
10. Calidad de los productos usados (o a usar)

De estas 10, la investigación de competencia (ver abajo) confirmó que
**tintas, agujas, gente capacitada, calidad de producto y horario** no
aparecen en ningún cotizador existente — son el terreno diferenciador más
claro dentro del propio motor de precio, además del preview 3D.

### Fórmula (decidida 2026-09-20, ajustada 2026-09-20)

Modelo híbrido: multiplicadores para lo que escala con tamaño/dificultad,
montos fijos para lo que es costo de insumo, recargo % final para horario.

```
base      = tamaño_cm × precio_por_cm[zona]
subtotal  = base × mult_técnica × mult_especialización
extras    = costo_insumo_tintas[técnica] + costo_agujas_extra + costo_calidad_producto
precio_final = (subtotal + extras) × (1 + recargo_%_horario)
```

- **Tamaño × zona** → precio base (precio por cm, distinto por zona; ahí
  vive la dificultad/tiempo de cada parte del cuerpo).
- **Técnica, nivel de especialización** → multiplicadores (escalan
  proporcional al tamaño).
- **Costo de insumo de tintas, agujas extra, calidad de producto** →
  montos fijos (costo de insumos, no de trabajo).
- **Horario del turno** → recargo/descuento % aplicado al final (fuera de
  horario, urgencia, etc.).
- **Zonas íntimas** (pene, ano, paladar/interior de boca, esclerótica)
  excluidas de forma dura, no seleccionables. Párpados sí se incluyen.

### Qué ve el TATUADOR vs. qué ve el CLIENTE (decidido 2026-09-20)

El formulario público de cotización no debe mostrar todo el modelo — solo
lo que el cliente final razonablemente elige. El resto es configuración
interna del tenant (`TenantPricingConfig`), invisible para el cliente.

| Campo | ¿Quién lo define? |
| --- | --- |
| Tamaño, zona, técnica, horario del turno | **Cliente** (obvio, describen lo que pide) |
| Calidad de producto, nivel de especialización, cantidad de agujas | **Cliente** (confirmado explícitamente — el cliente sí los elige en el formulario) |
| Cantidad de tintas | **Tatuador**, no el cliente — se deriva automáticamente de la técnica elegida (`costoInsumoTintas` por técnica en `TenantPricingConfig`), sin campo propio en `QuoteInput` |
| Precio por cm de cada zona, multiplicadores de técnica/especialización, costo de insumo de tintas por técnica, precio por aguja extra, costo de cada nivel de calidad, recargo por franja horaria | **Tatuador**, vía `TenantPricingConfig` (todavía sin pantalla propia — ver Próximos pasos) |

**Confirmado** — "diseño" (variable 3): no es un input ni un multiplicador
independiente. Se resuelve por completo con las variables que ya existen
en el modelo — cantidad de insumos (tintas, agujas, calidad de producto) +
técnica. No hay campo "estilo/diseño" separado en el formulario de
cotización.

**Confirmado** — "cantidad de gente capacitada": carga manual, no fórmula
automática (no hay conteo de gente). Es el dato que el tatuador usa para
cargar a mano el multiplicador de "nivel de especialización" (ej. "solo yo
hago esta técnica acá" → multiplicador más alto), porque cuantificar
"competidores reales" en la zona es un criterio subjetivo del propio
tatuador, no algo que el sistema pueda inferir solo.

**Confirmado** — "precio de oferta en la localidad": precarga el
`precio_por_cm` de cada zona como sugerencia inicial editable por el
tatuador, no es un valor fijo impuesto por el sistema.

### Modelo de datos (borrador)

Configuración por tenant (tatuador/estudio):

```
TenantPricingConfig {
  moneda: string                     // ej. "ARS"
  precioPorCmPorZona: [
    { zona: string, precioPorCm: number }   // precargado desde "precio de oferta en la localidad", editable
  ]
  zonasExcluidas: [pene, ano, paladar, esclerótica]   // hardcoded, no editable
  tecnicas:       [ { nombre: string, multiplicador: number, costoInsumoTintas: number } ]
  especializacion:[ { nivel: string, multiplicador: number } ]  // carga manual del tatuador
  agujas:         { incluidas: number, precioPorAgujaExtra: number }
  calidadProducto:[ { nivel: string, costoFijo: number } ]
  horarios:       [ { franja: string, recargoPorcentual: number } ]
}
```

Input de una cotización puntual (lo que completa el CLIENTE del tenant —
ver tabla de arriba, ya no incluye cantidad de tintas):

```
QuoteInput {
  tamanoCm: number
  zona: string              // enum, excluye zonas íntimas
  tecnica: string
  especializacion: string
  cantidadAgujas: number
  calidadProducto: string
  horario: string
}
```

## Rediseño del motor de precio (2026-09-25): horas × tarifa, no por tamaño

El usuario frenó el trabajo de cargar la config real de LusiTattoo con una
observación de fondo: el modelo de arriba (precio por cm) no refleja cómo
cotizan los tatuadores de verdad. Investigación de mercado antes de tocar
código.

### Cómo cotizan los tatuadores en la práctica

- **La unidad real es el TIEMPO, no el tamaño.** Casi ningún tatuador serio
  cobra por cm² — varias fuentes lo marcan explícitamente como el error más
  común de quien recién arranca en el negocio. La lógica real:
  `precio = tarifa_horaria × horas_estimadas`, con un **mínimo de estudio**
  (shop minimum) como piso aunque el trabajo sea de 15 minutos.
- **Por qué "por cm" está mal**: dos tatuajes del mismo tamaño pueden costar
  muy distinto. Ejemplo real citado en la investigación: una pieza de letras
  simples de 5" ronda USD 200, y un diseño botánico con sombreado fino y 3
  colores del mismo tamaño ronda USD 500 — más del doble, mismo tamaño. Lo
  que cambia el precio es la **densidad de detalle/complejidad**, que
  determina cuántas horas lleva — el tamaño es un input de esa estimación,
  no la variable directa de precio.
- **La tarifa horaria ya incluye reputación/demanda/experiencia.** Un
  tatuador muy solicitado no aplica un multiplicador sobre una base
  compartida — directamente cobra más por hora. Rangos reales 2026: artistas
  nuevos USD 100-150/h, mid-career USD 150-250/h, top artists USD 250-400+/h.
- **Cantidad de tintas y cantidad de agujas no aparecen en ninguna fuente**
  como variables que el cliente ve o que mueven el precio — son costo de
  insumos del artista (marginal, ya diluido en la tarifa horaria), no un
  ítem de cotización. Esto invalida dos de las 10 "variables diferenciadoras"
  originales del proyecto (ver sección superada arriba).
- **Zona del cuerpo importa por dificultad/tiempo** (curvas, movimiento de la
  piel) **y por dolor** (que puede forzar sesiones más cortas → más
  sesiones) — no por un precio fijo por cm de esa zona.
- **Piezas grandes se cobran por sesión** (medio día / día completo, ej.
  USD 600-800 la sesión de ~4h), no extendiendo linealmente un cálculo por
  cm. Señas de USD 100-300+ aplicadas al total son práctica estándar
  (confirmado también en Argentina).
- **Argentina**: mismo patrón — los tatuadores calculan horas de trabajo →
  costo; con la inflación de insumos algunos ya migraron a cobrar "por
  sesión" directamente porque el costo por cm dejó de tener sentido.

### Modelo vigente

```
horas_estimadas  = (tamaño_cm / cm_por_hora) × dificultad[zona] × mult_horas[técnica]
                    // redondeado hacia arriba en pasos de media hora
tarifa_efectiva  = tarifa_horaria × mult_tarifa[especialización]
precio_base      = max(mínimo_estudio, tarifa_efectiva × horas_estimadas)
precio_con_extras = precio_base + costo_fijo[calidad_producto]
precio_final     = precio_con_extras × (1 + recargo_%[horario])
```

Diferencias clave respecto al modelo superado:

- **Tamaño, zona y técnica ya no fijan un precio** — ajustan la ESTIMACIÓN DE
  HORAS. Zona pesa por dificultad (curvas/movimiento, no por precio de
  venta); técnica pesa por densidad de detalle/sombreado/color.
- **Especialización multiplica la TARIFA, no un subtotal** — un nivel más
  solicitado/único cobra más por hora, coherente con cómo funciona en la
  realidad (no es un extra fijo bolted-on).
- **Mínimo de estudio nuevo**: piso de precio real que no existía antes.
- **Cantidad de tintas y cantidad de agujas se sacaron por completo** como
  variables de cotización — ni el cliente las elige ni el tatuador las
  configura acá. `TenantConfigForm` y `QuoteForm` ya no tienen esos campos.
- **Calidad de producto se mantuvo** como único extra fijo opcional — es un
  upsell real (ej. tinta premium/vegana), no un costo de insumo disfrazado.
- Redondeo de horas a pasos de media hora (`Math.ceil(horas*2)/2`) porque los
  estudios bloquean turnos en franjas de media hora, no minutos exactos.

### Modelo de datos vigente

```
TenantPricingConfig {
  nombre: string
  moneda: string
  tarifaHoraria: number        // $/hora base del estudio
  minimoEstudio: number        // piso de precio (shop minimum)
  cmPorHora: number            // velocidad de referencia, no un precio
  dificultadPorZona: [ { zona: string, multiplicador: number } ]   // >1 = más lento/difícil
  tecnicas:          [ { nombre: string, multiplicadorHoras: number } ]  // >1 = más horas
  especializacion:   [ { nivel: string, multiplicadorTarifa: number } ]  // multiplica la tarifa
  calidadProducto:   [ { nivel: string, costoFijo: number } ]      // extra opcional real
  horarios:          [ { franja: string, recargoPorcentual: number } ]
}

QuoteInput {   // lo completa el CLIENTE — ya no incluye cantidadAgujas
  tamanoCm: number
  zona: string
  tecnica: string
  especializacion: string
  calidadProducto: string
  horario: string
}
```

Implementado en `server/src/pricing/{types,calculate,validateConfig,tenantConfig}.ts`,
`server/prisma/schema.prisma` (modelo `ZonaDificultad` reemplaza a
`ZonaPrecio`, se sacaron las columnas de agujas de `Tenant`), y espejado a
mano en `client/src/pricing/types.ts` + los formularios (`QuoteForm.tsx`,
`TenantConfigForm.tsx`). 8 tests de `calculate.test.ts` cubren el caso base,
el ajuste de especialización sobre la tarifa (no el subtotal), el redondeo
de horas, el piso de mínimo de estudio, el extra de calidad, el recargo de
horario y el rechazo de zonas inválidas.

**Gotcha encontrado al probar el formulario de configuración con números
reales** (no enteros redondos): los inputs de multiplicador tenían
`step={0.1}` o `step={0.05}` — un valor como `1.15` con `step={0.1}` viola la
validación HTML5 nativa (`1.15` no es múltiplo exacto de `0.1`) y el
navegador bloquea el submit **sin ningún error visible ni request de red**,
nada en consola. Se cambiaron todos los inputs de multiplicador/tarifa a
`step="any"`. El bug no se había notado antes porque los valores de ejemplo
originales (1.0, 1.1, 1.4, 1.3) coincidían por casualidad con múltiplos
limpios de 0.1.

**Verificado de punta a punta en navegador real con Playwright** (instalado
y desinstalado temporalmente, mismo patrón de siempre): cotización del
tenant `demo` con la fórmula nueva (10cm, brazo, líneas finas → 2.5h → ARS
62.500, coincide con el cálculo a mano), y el flujo completo de onboarding
de un tenant nuevo (`lusitattoo`) desde cero por la pantalla de
autoconfiguración: crear cuenta → completar las 6 categorías → guardar →
cerrar sesión → volver a entrar → los datos persistieron. Confirmado también
por API que `lusitattoo` cotiza igual que `demo` con los mismos inputs
(mismo estándar de números, ver Vault para el detalle de por qué se usó el
mismo estándar para ambos tenants).

## Vista 3D (v2 — investigada, no iniciada)

Modelo humano 3D con peso y altura ajustables, sobre el que se superpone el
diseño elegido. Pensado como capa posterior al motor de precio, no como
parte del v1.

**Stack técnico recomendado** (ver investigación completa más abajo):

- **MakeHuman** para el body base — gratis, export CC0, uso comercial libre,
  sliders nativos de peso/altura/musculatura.
- Export a **glTF/GLB** con solo 2-3 morph targets activos (peso, altura,
  opcionalmente musculatura).
- **React Three Fiber** (wrapper de Three.js) para el render en la web.
- **`@react-three/drei` Decal** para pegar el diseño sobre la piel — el
  usuario arrastra/rota/escala una "caja proyectora" y la imagen se adapta a
  la superficie que toca.

Se descartó Ready Player Me (sin slider continuo de peso/altura hoy, solo 4
presets) y SMPL-X quedó como alternativa más realista pero con fricción de
licencia comercial.

**Limitación conocida, sin solución perfecta**: el decal se distorsiona en
curvas fuertes del cuerpo (antebrazo, pantorrilla). Tolerable para una
preview, no serviría para manufactura.

**Esfuerzo estimado**: un v1 funcional (1 cuerpo con 2-3 morph targets +
decal en 2-3 zonas) es viable en 2-4 semanas para un dev con algo de 3D.
Pulir (piel realista, sin distorsión en toda curva, múltiples tonos de piel,
performance mobile fina) escala a meses.

**Validación barata sugerida antes de invertir en peso/altura**: mock con
UN cuerpo fijo de MakeHuman + solo drag/rotate/scale del diseño sobre 2-3
zonas. Si engancha a tatuadores reales, recién ahí se justifica la capa
paramétrica.

### Mock v1 implementado (2026-09-24)

Primera versión: cuerpo armado con primitivas de Three.js (cápsulas +
esfera), sin depender todavía de MakeHuman, para validar la mecánica de
drag/rotate/scale antes de invertir en un modelo realista.

### Cuerpo real de MakeHuman integrado (2026-09-24)

Se instaló MakeHuman Community 1.2.0 (instalador oficial, portable, bajado
de `download.tuxfamily.org/makehuman`) y se exportó un cuerpo en formato
**Wavefront OBJ** (el único formato nativo de MakeHuman sin pasar por
Blender/plugins) — reemplaza las cápsulas del mock v1 por una malla humana
real (~14.400 caras, piel + ojos como materiales separados).

- Export copiado a `client/public/models/human-body.{obj,mtl}` +
  `client/public/models/textures/brown_eye.png`. Cargado con los
  `OBJLoader`/`MTLLoader` que ya trae el paquete `three`
  (`three/examples/jsm/loaders/`), sin dependencias nuevas.
- `client/src/preview3d/useHumanoidModel.ts`: hook que carga el OBJ+MTL,
  separa la malla de piel (material `DefaultSkin`, único target de
  drag/decal) de la de ojos (material `Eye_brown`, no interactiva), calcula
  el bounding box crudo y normaliza el modelo a 1.75 unidades de alto,
  centrado en el origen con los pies en `y=0`.
- **Cambio de arquitectura de zonas**: al ser ahora UNA sola malla continua
  (no 5 mallas separadas como en el mock v1), la zona ("torso"/"brazo"/
  "pierna") ya no se deriva de qué mesh se tocó, sino de la posición del
  punto de click normalizada contra el bounding box (`clasificarZona` en
  `types.ts`) — corte simple por altura relativa + distancia al eje central.
  Verificado en navegador real: torso, pierna y brazo clasifican bien.
- **Gotcha de escala del `Decal`**: la geometría del decal se calcula en el
  espacio local CRUDO del OBJ (donde el cuerpo mide ~19.5 unidades de alto,
  no las 1.75 normalizadas) — el valor de tamaño del slider (pensado en la
  escala normalizada) hay que dividirlo por `modelo.escala` antes de
  pasarlo a `<Decal scale={...}>`, si no el diseño queda invisible de tan
  chico.
- **El export viene en T-pose** (brazos extendidos horizontalmente — pose
  de rigging estándar, no una pose relajada) porque Wavefront OBJ no tiene
  huesos: lo que se exporta es la malla ya deformada, en la pose que se
  ve en la pantalla de MakeHuman al momento de exportar. Para una pose más
  natural (brazos a los costados), se puede volver a exportar aplicando una
  pose desde la pestaña Pose/Animate de MakeHuman antes de exportar — no
  hecho todavía, la clasificación de zona por X asume brazos separados del
  torso (como en T-pose) y habría que revisar el umbral si se cambia la
  pose.
- Probado en navegador real con Playwright (instalado y desinstalado
  temporalmente, mismo patrón de siempre): drag sobre torso, pierna y
  brazo, cada uno clasificó la zona correcta y el decal se proyectó bien
  sobre la curvatura real de la malla — mejor wrap que con las cápsulas del
  mock v1. Sin errores de consola propios.
- Sigue pendiente: sin peso/altura ajustable (deliberado, próxima fase si
  el mock engancha), sin reposar el modelo a una postura natural.

### Conectado al flujo real del cotizador (2026-09-24)

Dejó de ser una pestaña "Vista 3D (beta)" aparte en `App.tsx` — ahora vive
dentro de `QuoteForm.tsx` (la página del cliente), debajo del
formulario/resultado de precio, detrás de un toggle "Mostrar vista previa
3D" que la monta recién al abrirla (evita cargar Three.js + el modelo de
1.3MB en cada visita de quien solo quiere el precio). Es puramente una
ayuda visual — no afecta ni se conecta al cálculo.

### Diseño persistido en el navegador (2026-09-24)

El diseño subido (imagen + zona + posición + rotación + tamaño) se guarda en
`localStorage`, namespaced por tenant (`cotizador3d:<slug>`) —
`client/src/preview3d/persistencia.ts`. Alcance elegido a propósito por el
usuario: **solo local al navegador**, no viaja al servidor ni es
compartible entre dispositivos (no hay todavía concepto de "pedido"/turno
guardado en este proyecto — es puramente un cotizador, no un sistema de
reservas).

- La imagen se comprime a máx. 900px de lado y se guarda como PNG en base64
  (`comprimirImagenADataUrl`) — PNG y no JPEG para no perder transparencia
  en diseños tipo stencil/línea con fondo transparente, a costa de un
  payload más grande que JPEG (aceptable para una sola imagen dentro del
  límite de `localStorage`, ~5-10MB por origen).
- Botón "Quitar diseño" junto al aviso "Guardado en este navegador" —
  limpia el estado y el `localStorage`, y resetea el `<input type="file">`
  (que si no, sigue mostrando el nombre del archivo viejo aunque el estado
  ya esté vacío).
- Verificado en navegador real con Playwright: subir diseño → ubicarlo →
  mover sliders → reload de la página → todo se restaura igual (zona,
  posición, rotación, tamaño) → "Quitar diseño" → reload → no queda nada.

## Investigación de competencia

- **Cotizadores de precio genéricos ya existen**: Tattoo Studio Pro,
  TattoosCalculator, y sobre todo **Formts.com**, que ya cubre 6/10 de las
  variables (tamaño, zona con dificultad, estilo, técnica, nivel del
  artista, extras) y es personalizable por tatuador. El cotizador solo, sin
  diferenciación, no es un océano azul.
- **Preview 3D/AR revisadas**: Tattoo Preview 3D&AR, Tatship, Inkjin, Try
  Tattoo 3D, Tatspark, INKHUNTER. Ninguna combina modelo 3D paramétrico de
  peso/altura continuo + overlay de diseño + precio integrado — es el gap
  de mercado real.
- **Cómo cotizan hoy los tatuadores sin herramienta**: Instagram DM,
  WhatsApp, o forms de booking genéricos (Vagaro, Paperform) que piden
  zona/tamaño/referencias, pero el precio lo pone el artista a mano.
- **Modelo de negocio de mercado**: suscripción mensual por tenant/estudio
  (~$30-70/mes), no por artista individual (cobrar por artista genera
  quejas, ej. en Vagaro).
- **Referencia directa señalada por el usuario**:
  [diaveltattoo.com/calculadora-tattoos](https://www.diaveltattoo.com/calculadora-tattoos/) —
  cotizador simple de 4 campos (estilo, tamaño en cm, zona, blanco/negro o
  color) → botón "Calcular Precio" → resultado numérico. Sirve como piso de
  referencia del v1.

## Stack (decidido 2026-09-20)

- **Backend**: Node.js + Express + TypeScript.
- **Frontend**: React + Vite + TypeScript.
- **Hosting**: Render (Web Service pago para evitar el cold start de ~30-50s
  del free tier tras 15 min sin tráfico, + Postgres — atención a que el
  free tier de Postgres expira a los 90 días).

Se descartaron Python (sin ventaja real hoy; solo pesaría a favor si más
adelante se suma IA/ML) y Java/Spring Boot (más pesado, sin sinergia ahora
que el proyecto es standalone y no se integra a booking-saas). Razón
principal de Node/TS: la capa 3D de v2 corre en el navegador con React
Three Fiber (JS/TS) sí o sí — mismo ecosistema evita mantener dos lenguajes
y permite compartir la forma de `TenantPricingConfig`/`QuoteInput` entre
cliente y servidor sin duplicarla. Mismo patrón que ya se usó en
`ai-site-auditor` (server/ + client/).

## Base de datos (decidido 2026-09-20)

Postgres + Prisma. **Local y separado del Postgres de booking-saas**
(ese corre en `:5432`; este proyecto usa `:5433` vía `docker-compose.yml`
propio en la raíz).

- `server/prisma/schema.prisma` — un modelo `Tenant` con relaciones 1-N a
  `ZonaDificultad`, `Tecnica`, `NivelEspecializacion`, `CalidadProducto` y
  `Horario` (cada uno = una fila de las listas de `TenantPricingConfig`).
  `tarifaHoraria`/`minimoEstudio`/`cmPorHora` viven como columnas planas en
  `Tenant` (son un único valor, no una lista) — ver "Rediseño del motor de
  precio" más abajo, reemplazaron a `agujasIncluidas`/`agujasPrecioExtra`
  (2026-09-25). Las zonas íntimas excluidas siguen hardcodeadas en código
  (`ZONAS_EXCLUIDAS`), no en la DB.
- `server/prisma/seed.ts` — crea un tenant `demo` con los mismos valores
  que antes vivían en `fixtures.ts`.
- **Nota de Prisma**: se usa la v6.19.3, no la v7 (última estable). Prisma
  7 cambió el `datasource url` del schema por un `prisma.config.ts` +
  adapter — para no sumar esa complejidad todavía, se pisó a 6.19.3. Esa
  versión (y las 7.x probadas) traen una vulnerabilidad conocida en
  `deepmerge-ts` (solo afecta al CLI de Prisma en dev, no al cliente en
  runtime) — se resuelve con un `overrides` en `package.json` forzando
  `deepmerge-ts@^8.0.2`.

## Cómo correrlo

```bash
# levantar el Postgres del proyecto (una sola vez / cuando lo necesites)
docker compose up -d

# terminal 1
cd server
npm install
cp .env.example .env          # si no existe ya
npx prisma migrate dev        # aplica el schema a la DB local
npx tsx prisma/seed.ts        # crea el tenant "demo"
npm run dev                   # http://localhost:4000

# terminal 2
cd client
npm install
npm run dev                   # http://localhost:5173

# tests del motor de precio (no tocan la DB, usan un fixture en memoria)
cd server
npx vitest run
```

## Estado actual

Esqueleto funcional de punta a punta con persistencia real, probado en
navegador real (Playwright):

- `server/` — Express + TypeScript + Prisma/Postgres.
  - `GET /tenants/:slug/options` — devuelve `TenantPublicOptions`: solo
    nombres de zonas/técnicas/especialización/calidad/horarios, sin
    ningún precio ni multiplicador. Sin auth — es lo que consume el
    formulario público del cliente final (`QuoteForm.tsx`).
  - `POST /tenants/:slug/register` — crea la CUENTA de un tenant nuevo
    (`{ password }`, mínimo 8 caracteres). No recibe config de precio
    todavía (eso se completa después, ya autenticado, vía `PUT /config`
    — así la validación de "listas no vacías" no bloquea la creación de
    la cuenta). Devuelve `{ token }`. Falla 400 si el slug ya existe.
  - `POST /tenants/:slug/login` — `{ password }` → `{ token }` (JWT,
    vence a las 12h) si la contraseña coincide con el hash (bcrypt)
    guardado. Error genérico "Slug o contraseña incorrectos" tanto si el
    tenant no existe como si la contraseña es incorrecta, para no
    facilitar enumerar slugs.
  - `GET /tenants/:slug/config` y `PUT /tenants/:slug/config` — devuelven
    o reemplazan la `TenantPricingConfig` completa (con precios y
    multiplicadores). **Requieren `Authorization: Bearer <token>`**
    emitido para ese mismo slug (middleware `requireAuthDeTenant` en
    `src/auth.ts`) — un token de otro tenant da 401. `PUT` sigue
    validando con `src/pricing/validateConfig.ts` (listas no vacías, sin
    duplicados, números no negativos, zonas íntimas rechazadas).
  - `POST /tenants/:slug/quote` — sin auth (es el flujo del cliente
    final): recibe `QuoteInput`, busca la config del tenant en la DB y
    calcula (`src/pricing/calculate.ts`).
  - Contraseñas hasheadas con bcrypt (`bcryptjs`, 10 salt rounds).
    Tokens firmados con `JWT_SECRET` (ver `.env.example`) — generar uno
    propio y no versionarlo.
  - 6 tests con Vitest cubren la fórmula pura (multiplicadores, extras,
    recargo de horario, rechazo de zonas íntimas) sin tocar la DB ni el
    login.
- `client/` — React + Vite + TypeScript, con dos pantallas (switch arriba
  de todo, sin router — `App.tsx`):
  - **Cotizador (cliente)** — `src/pricing/QuoteForm.tsx`, carga sus
    opciones desde `GET /tenants/:slug/options` (público). Debajo del
    formulario/resultado tiene un toggle "Mostrar vista previa 3D" que monta
    `src/preview3d/Preview3D.tsx` (ver sección "Cuerpo real de MakeHuman
    integrado" más abajo) — no forma parte del cálculo de precio, es solo
    una ayuda visual para el cliente.
  - **Configuración (tatuador)** — `src/pricing/TenantConfigForm.tsx`.
    Flujo: escribís un slug → el cliente chequea contra `/options`
    (público) si ya existe → si no existe, mostrás "Crear tenant" con
    una contraseña nueva y arrancás de una config vacía para completar; si
    ya existe, mostrás "Iniciar sesión" con la contraseña → con el token
    obtenido, `GET`/`PUT /config` para editar y guardar. Botón "Cerrar
    sesión" descarta el token (solo vive en memoria del componente, no en
    localStorage — hay que loguearse de nuevo si se recarga la página).
    **Gotcha corregido (2026-09-25):** `App.tsx` desmontaba por completo
    `TenantConfigForm`/`QuoteForm` al cambiar de pestaña (`{vista === "x" &&
    <Componente/>}`), perdiendo la sesión (token, config cargada) con solo
    cambiar de pestaña, sin ni siquiera recargar la página. Ahora ambas
    quedan siempre montadas y se ocultan con `display: none` (clase
    `.vista-oculta`) — cambiar de pestaña ya no destruye el estado. Sigue
    perdiéndose al recargar la página de verdad (eso es el límite conocido
    de arriba, sin resolver todavía).
  - Probado de punta a punta en navegador real con Playwright (instalado
    y desinstalado temporalmente): crear tenant nuevo → cargar precios →
    guardar → cerrar sesión → login con password incorrecta (rechazado)
    → login correcto → config recuperada intacta.
  - **Pasada de diseño visual** (`index.css` + `App.css`): tema oscuro fijo
    (no sigue `prefers-color-scheme`, es una decisión de identidad tipo
    "estudio de tatuajes" — igual que la referencia de manus.im evaluada
    antes), tipografía Syne (headings) + Manrope (body) vía Google Fonts,
    paleta violeta/verde generada con la skill `ui-ux-pro-max`.
    `QuoteForm.tsx` pasó a layout de dos columnas: formulario a la
    izquierda, panel de resultado sticky a la derecha (en desktop; apilado
    en mobile) — inspirado en el patrón de UX de "Tinta & Aguja" que se
    había descartado como base de código. El cálculo sigue siendo por
    click en "Calcular precio" (round-trip al server), no recálculo en
    vivo — eso sería un cambio de comportamiento, no de diseño visual, y
    quedó fuera de esta pasada a propósito. Probado en desktop (1440px) y
    mobile (390px) con Playwright, sin errores de consola.

## Próximos pasos

1. ~~Autenticación/cuentas por tenant~~ — resuelto: password + JWT por
   tenant, ver "Estado actual" arriba. Pendiente real que queda de esto:
   no hay recuperación de contraseña ni cambio de contraseña todavía (si
   alguien la pierde, hoy no hay forma de recuperar el tenant).
2. ~~Mock de la vista 3D~~ — resuelto (2026-09-24), ver detalle arriba.
3. ~~Conectar el 3D al flujo real de `QuoteForm.tsx`~~ — resuelto
   (2026-09-24): ya no es una pestaña aparte, vive dentro de la página del
   cotizador cliente detrás de un toggle "Mostrar vista previa 3D" (se monta
   recién al abrirlo, para no cargar Three.js/el modelo en cada visita).
4. ~~Persistir el diseño subido~~ — resuelto (2026-09-24), **solo en el
   navegador** (`localStorage`, ver detalle abajo). Sigue sin viajar al
   servidor ni ser compartible entre dispositivos — decisión explícita del
   usuario para mantener el alcance chico (no hay todavía concepto de
   "pedido"/turno guardado en este proyecto, es puramente un cotizador).
5. ~~Motor de precio grounded en cómo cotiza la industria realmente~~ —
   resuelto (2026-09-25), ver "Rediseño del motor de precio" arriba.
6. Tenant `lusitattoo` creado (2026-09-25) con un **estándar de números
   acordado entre usuario y asistente** (no los precios reales de
   LusiTattoo todavía — ver Vault para la distinción). Sirvió también para
   probar de punta a punta la experiencia de autoconfiguración de un tenant
   nuevo, que encontró y corrigió el bug de `step` de los inputs numéricos
   (ver arriba).
7. Reemplazar los números de `lusitattoo` por su tarifa horaria, mínimo de
   estudio y dificultades/técnicas reales — pendiente, requiere que ella (o
   el usuario en su nombre) los defina.
8. Validar el v1 (motor de precio + vista 3D embebida) con LusiTattoo en
   uso real — recién con esa señal decidir si se invierte en la capa
   paramétrica de peso/altura, en persistencia real del lado del servidor
   (con link compartible), o en reposar el modelo (hoy en T-pose).
