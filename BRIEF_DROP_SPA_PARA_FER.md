# DROP. — Brief para conversar Jaime + Fer

**Fecha:** 2 de junio de 2026
**Para:** Fernanda Poblete + Jaime Portugueis
**De qué se trata:** dónde está DROP. hoy, qué decidimos para constituir DROP. SpA, y qué hay que conversar entre los dos antes de avanzar.

---

## Dónde estamos hoy con DROP.

DROP. es una plataforma para DJs en Chile (CRM, press kit público, calendario, integración con Gmail, etc.). Hoy:

- ✅ La app está **funcionando en producción** en [dropgigs.com](https://dropgigs.com)
- ✅ Hay **~12 DJs en beta cerrada** usándola gratis
- ✅ El sistema de **suscripción ya está codeado** (paywall, checkout MercadoPago, gestión de plan), pero **no se cobra todavía** — se activa cuando lancemos la versión pública
- ✅ Toda la parte legal pública lista (`/privacy`, `/terms`, rate limiting, hardening de seguridad)

**Cuándo se empieza a cobrar:** cuando termine la beta cerrada y se abra al público. Antes de eso necesitamos tener **DROP. SpA constituida** para poder emitir boletas/facturas y cobrar legalmente vía MercadoPago.

---

## Decisiones que ya tomamos (Jaime, durante el research del último día)

### 1. Precio: **$9.990 CLP / mes, IVA incluido**

- El usuario paga $9.990 en el checkout
- DROP. SpA recibe neto **$8.395** (después del 19% de IVA que va al SII)
- Después de la comisión de MercadoPago (~3,4%), neto final **~$8.100 por DJ por mes**

### 2. Trial: **15 días gratis** + reembolso completo si cancela en los 10 días posteriores

- Más generoso que la ley chilena (Ley 19.496 exige solo retracto de 10 días)
- Mensaje al usuario: "prueba 15 días, después $9.990/mes, cancelas cuando quieras"

### 3. Forma legal: **SpA (Sociedad por Acciones)**

- Es la forma recomendada para startups tech con plan de crecer
- Permite que entremos más socios en el futuro (inversionistas, empleados con equity)
- Se crea online en **Empresa en un Día** ([registrodeempresasysociedades.cl](https://www.registrodeempresasysociedades.cl)) en ~30 min con ClaveÚnica
- Costo: gratis si firmamos con FEA propia (~$2-12k/año), o $10k si firmamos ante notario

### 4. Razón social: **DROP SpA** (sin punto — RES no acepta caracteres especiales)

- El "DROP." con punto queda para el branding (logo, web, marketing)
- Para temas legales/SII somos "DROP SpA"
- Backup por si está tomado: `Drop Gigs SpA`, `Drop Music SpA`

### 5. Accionariado: **50/50**

- Jaime: 5.000 acciones (50%)
- Fer: 5.000 acciones (50%)
- 10.000 acciones nominativas, serie única, sin valor nominal
- Capital social: **$1.000.000 CLP** (simbólico, suscrito y pagado al acto — no hay que desembolsar plata real)

### 6. Domicilio: **Ricardo Lyon 1717, depto 902, Providencia**

- Es donde queda registrada legalmente la SpA
- Las notificaciones del SII / oficiales llegan a esa dirección

### 7. Giros (lo que la SpA puede hacer comercialmente):

- **620100** — Actividades de programación informática (la app)
- **631100** — Procesamiento de datos / hosting / portales web (los press kits públicos, el directorio /dj)

Ambos son **Primera Categoría afectos a IVA** (por eso cobramos 19% IVA en la suscripción).

### 8. Administración: **ambos somos administradores, pero con un límite**

- **Cosas chicas (≤ $5.000.000 CLP):** cualquiera firma solo
  - Ejemplos: pagar hosting, contratar a un freelancer, autorizar un gasto de marketing, abrir cuenta de banco
- **Cosas grandes (> $5.000.000 CLP) + decisiones críticas:** firma conjunta obligatoria
  - Ejemplos: vender la empresa, levantar deuda grande, emitir/transferir acciones a alguien nuevo, cambiar el giro, garantizar a un tercero

**Por qué este diseño:** balance entre rapidez (no tenernos que coordinar para cada gasto) y protección mutua (decisiones importantes las tomamos los dos).

### 9. Régimen tributario: **Pro Pyme General (14D N°3)** — a confirmar con contador

- Permite reinvertir utilidades en crecimiento sin gatillar impuestos personales
- Tasa de Impuesto de Primera Categoría: 12,5% en 2025-2027, sube a 15% en 2028
- Hasta $2.925 millones de ingresos anuales tenemos espacio (DROP. está muy lejos)

### 10. Contabilidad: **la llevamos nosotros por ahora**

- A futuro contratamos contador externo (~$50-150k/mes)
- Mientras tanto: usar facturación electrónica gratuita del SII + correr F29 mensual e F22 anual nosotros

---

## Lo que TODAVÍA hay que hablar entre los dos

Estas son las preguntas que no resolvemos solos — necesitan los dos. **NO bloquean constituir la SpA**, pero conviene conversarlas antes de que pase mucho tiempo.

### Conversación 1 — Vesting (qué pasa si uno se va antes de 4 años)

**El tema:** hoy si firmamos 50/50 sin vesting, los dos somos dueños del 50% para siempre desde el día 1. Eso significa que **si por cualquier razón uno se va al mes 6** (oferta de trabajo, problema familiar, lo que sea), se queda con el 50% intacto aunque haya trabajado solo medio año.

**El estándar mundial** (Y Combinator, Stripe Atlas) es **vesting de 4 años con cliff de 1 año:**
- Año 0-1: si te vas en este período, recuperas **0%**
- Año 1: ganas el 25% de golpe (el "cliff")
- Año 1-4: ganas el resto mes a mes hasta llegar al 100% en el año 4

**Ejemplo concreto:**
- Si Fer se va al mes 6 → pierde su 50% (vuelve a la SpA)
- Si Fer se va al mes 18 → se queda con 37,5% (lo proporcional a 18 de 48 meses)
- Si Fer se va al mes 48+ → se queda con su 50% completo

**Por qué importa para los dos:** te protege a ti si Fer se va y viceversa. **NO** es una falta de confianza, es lo que hacen todas las startups del mundo. Sin esto, si uno se va, el otro queda con un socio que ya no trabaja pero tiene 50% de la empresa.

**Pregunta para conversar:** ¿ponen vesting de 4 años + 1 cliff, o se confían y constituyen sin vesting?

### Conversación 2 — Qué pasa si uno quiere vender / salirse

Jaime dijo "lo más simple es vender su parte". Pero ahí hay 3 preguntas:
1. **¿A quién?** Si Fer vende a su tío o a un inversor random, Jaime queda con socio nuevo sin pedirlo. El estándar es **derecho de primera oferta**: si Fer se quiere ir, primero le ofrece a Jaime comprar su 50%. Si Jaime no quiere, ahí puede vender a otro.
2. **¿A qué precio?** Sin fórmula = pelea. El estándar SaaS es **ARR × múltiplo** (ej. 4 veces los ingresos anuales recurrentes). Si DROP. factura $50MM al año, el 50% vale $100MM. Si todavía no factura, vale el capital invertido.
3. **¿Hay obligación de vender juntos?** Si llega un comprador para el 100% de DROP. y uno quiere vender y el otro no, sin reglas escritas el que no quiere puede bloquear la venta total. El estándar es **drag-along**: si un comprador serio aparece, ambos están obligados a vender en las mismas condiciones.

**Pregunta para conversar:** ¿quieren acordar esto por escrito en un "pacto de accionistas" (documento aparte del estatuto SpA), o se confían y lo resuelven si pasa?

### Conversación 3 — Espacio para futuros empleados con equity

Cuando crezcamos y queramos contratar a alguien clave (un CTO, una persona de marketing senior), tal vez le queramos dar equity (acciones) además de sueldo. **¿De dónde sale ese equity?**

- **Opción A** (más simple): cuando llegue el momento, los dos diluimos proporcionalmente. Si le damos 10% a un empleado, Fer y Jaime pasan de 50/50 a 45/45.
- **Opción B** (más planificado): desde el día 1 dejamos reservado un **pool del 10-15%** para futuros empleados (ESOP). Eso significa que constituimos con 8.500-9.000 acciones para Jaime+Fer y 1.000-1.500 reservadas para empleados. Cuando se contrata a alguien, se le asignan acciones del pool sin que ninguno de los dos se diluya.

**Pregunta para conversar:** ¿reservan un pool para empleados ahora (B) o lo dejan para cuando pase (A)?

---

## El pacto de accionistas (qué es y por qué se menciona)

Las 3 conversaciones de arriba **no van en el estatuto** de la SpA (lo que se firma en RES). Van en un **documento aparte** llamado **pacto de accionistas** que firman entre los dos y que blinda todas las "qué pasa si…".

El research que hizo Jaime los últimos días mostró:
- **No existe template chileno gratuito y completo** (los blogs son funnels a servicios pagos)
- Hay templates internacionales en español ([Capboard](https://www.capboard.io/en/captable/shareholder-agreement-clauses) + [Airtree](https://www.airtree.vc/open-source-vc/shareholders-agreement-template)) que sirven de base
- La opción razonable: bajar templates gratis → generar borrador en [Wonder.Legal CL](https://www.wonder.legal/cl/modele/pacto-socios-cl) (~$15-20k CLP) → llevar a abogado por 1-2 horas para validar (**$100-200k CLP**)
- **Costo total realista: $130-250k CLP** (dentro del presupuesto razonable para algo legal serio)

**No es obligatorio para constituir la SpA**, pero sí es el riesgo legal más grande si no se hace y pasa cualquier cosa entre los dos.

---

## Próximos pasos sugeridos (en orden)

1. **Lean este brief juntos** (~15 min) y conversen las 3 preguntas pendientes.
2. **Decidan vesting sí/no, pacto sí/no, ESOP sí/no.** Manden a Jaime las respuestas.
3. **Cuando estén alineados, agendar 30 min juntos** con ClaveÚnica para entrar a [registrodeempresasysociedades.cl](https://www.registrodeempresasysociedades.cl) y constituir DROP. SpA con la ficha que ya está pre-decidida (Jaime te guía paso a paso por el wizard).
4. **Post-constitución:** elegir régimen tributario en SII (Pro Pyme General recomendado), abrir cuenta corriente de la SpA, transferir MercadoPago de persona natural → SpA, activar suscripción.
5. (Cuando se quiera) Avanzar al pacto de accionistas con la ruta de $130-250k.

---

## En 3 líneas

- DROP. SpA queda **lista para constituir** apenas Fer y Jaime se sienten 30 min juntos con ClaveÚnica.
- Hay **3 conversaciones pendientes entre los dos**: vesting, salida (pacto de accionistas), pool para empleados. Ninguna bloquea constituir, pero conviene resolverlas en los próximos 1-3 meses.
- El cobro **no empieza hasta que la SpA exista** y se active el plan público (hoy beta gratis).

---

*Cualquier duda → me preguntan a mí (Jaime). Si quieren entender algún detalle técnico, está todo guardado en el repo:*
- *[DROP_SPA_RESEARCH_2026-06-01.md](DROP_SPA_RESEARCH_2026-06-01.md) — research general SpA Chile 2026*
- *[DROP_PACTO_ACCIONISTAS_RESEARCH_2026-06-02.md](DROP_PACTO_ACCIONISTAS_RESEARCH_2026-06-02.md) — templates pacto de accionistas*
- *[DROP_ESTATUTO_SPA_RESEARCH_2026-06-02.md](DROP_ESTATUTO_SPA_RESEARCH_2026-06-02.md) — estatuto SpA paso a paso*
