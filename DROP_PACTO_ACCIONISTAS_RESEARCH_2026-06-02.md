# DROP. SpA — Pacto de accionistas: research focused (2026-06-02)

> Research enfocado tras el deep-research general del 2026-06-01. Pregunta concreta: **¿hay templates gratuitos confiables de pacto de accionistas para 2 cofundadores 50/50 en SpA chilena?**

---

## TL;DR

**No existe un template chileno gratuito completo y confiable.** Los blogs de NSS, Lofwork, Conexión Legal, etc. son funnels a sus servicios pagos. Los modelos sueltos en Scribd/Studocu tienen autoría no verificable y riesgo legal.

Lo más cercano a "gratis confiable" son **templates internacionales en español** (Capboard, Airtree) que requieren adaptación a derecho chileno. Combinados con **Wonder.Legal Chile** (~$15-20k CLP) y **una revisión legal corta** (~$100-200k CLP), sale un pacto razonable por **~$130-250k CLP total**.

---

## 1. Templates gratuitos — veredicto por fuente

| Fuente | Resultado |
|---|---|
| **Start-Up Chile, CORFO, ChileAtiende** | ❌ No publican templates legales |
| **Registro de Empresas (RES)** | ⚠️ Sí publica `.docx` de "Junta Extraordinaria de Accionistas" — útil como **vehículo** para formalizar el pacto, pero **no es el pacto** |
| **Broota** | ⚠️ Gestiona pacto solo si captas plata por su plataforma — no publican template |
| **Universidad de Chile (u-cursos)** | ⚠️ Material docente "PACTO DE ACCIONISTAS" — referencia conceptual, no template limpio |
| **NSS, Lofwork, Conexión Legal, Brokering, Vectra, HubLegal, AIJ** | ❌ Blogs informativos, sin descarga. Son funnels a servicios pagos |
| **Scribd, Studocu** | ❌ Modelos anónimos, sin autoría auditable. **Riesgo legal alto.** |
| **GitHub** | ❌ No hay repos chilenos relevantes |

---

## 2. Templates internacionales en español/inglés adaptables

| Template | URL | Adaptación a Chile |
|---|---|---|
| **Capboard SHA** ⭐ | https://www.capboard.io/en/captable/shareholder-agreement-clauses | 🟡 Medio. Español, europeo, cubre vesting con good/bad leaver, drag-along, tag-along. Mejor balance gratis para Chile |
| **Airtree Open Source VC** ⭐ | https://www.airtree.vc/open-source-vc/shareholders-agreement-template | 🟡 Medio. Australiano, cubre deadlock + reserved matters, lenguaje simple |
| **Promise Legal Founder Agreement** | https://promise.legal/templates/founder-agreement | 🟡 Medio-alto. US-céntrico, vesting 4y/1y cliff + IP assignment |
| **Y Combinator SAFE** | https://www.ycombinator.com/documents | ❌ NO aplica — es instrumento de inversión, no pacto entre cofundadores |
| **NVCA Model Documents** | https://nvca.org/model-legal-documents/ | 🔴 Alto esfuerzo. Delaware-céntrico, mejor como biblioteca de cláusulas |
| **Cooley GO** | https://www.cooleygo.com/documents/ | 🔴 Alto. Delaware. Útil para extraer cláusulas individuales |
| **Stripe Atlas** | https://stripe.com/atlas | ❌ Solo si la SpA fuera Delaware C-Corp. No es el caso |

---

## 3. Servicios low-cost chilenos

| Servicio | Precio publicado | Veredicto |
|---|---|---|
| **Wonder.Legal Chile — Pacto de Socios** | ~€16 (≈ $16k CLP) — precio EU, precio CLP exacto NO publicado, hay que llegar al checkout | ✅ Mejor opción autoservicio. Cláusulas básicas + sale en Word/PDF. Cobertura de deadlock 50/50 ambigua |
| **Lofwork** | No publicado, cotización custom | 🔴 Probable >$200k |
| **NSS Abogados** | No publicado | 🔴 Probable $300k-800k+ |
| **Legal Fácil** | "2 UF/mes" (~$80k/mes) plan general | 🔴 Plan mensual NO incluye pacto custom |
| **HubLegal, Vectra Legal** | No publicado | 🔴 Cotización a medida |
| **Lawgo, LawAndGo, Doconto** | No verificable | ⚠️ Hay que consultar directamente |

---

## 4. Ruta recomendada por el research

### Paso 1 — Base conceptual (GRATIS)
- Descargar **Capboard SHA template** como esqueleto principal
- Complementar con **Airtree template** para deadlock + reserved matters
- Leer **Brokering Abogados** y **Legal Prisma** (blogs chilenos) para validar terminología local de deadlock

### Paso 2 — Documento autoguiado (~$15-20k CLP)
- Generar el **Pacto de Socios en Wonder.Legal Chile** ([wonder.legal/cl/modele/pacto-socios-cl](https://www.wonder.legal/cl/modele/pacto-socios-cl))
- Usar el borrador del Paso 1 como referencia de qué responder + qué añadir manual

### Paso 3 — Revisión legal corta ($100-200k CLP) ⚠️ NO NEGOCIABLE
- 1-2 horas con abogado corporativo chileno (Vectra Legal, HubLegal, AIJ — cotizan por hora)
- Pedir validación específica de:
  1. **Reverse vesting** (en Chile el vesting se implementa como opción de compra recíproca — debe estar bien redactado)
  2. **Cláusula de deadlock 50/50** (russian roulette / texas shootout / mediación previa)
  3. **Fórmula de valoración** (estándar SaaS: ARR × múltiplo, o EBITDA × múltiplo)
  4. Que el pacto pueda **reducirse a escritura pública** y/o integrarse al estatuto en RES

### Paso 4 — Formalización ($30-50k CLP notaría, opcional)
- Reducir el pacto a escritura pública ante notario
- **O** integrar cláusulas críticas (ROFR, drag-along, restricciones de transferencia) directamente al estatuto SpA vía Junta Extraordinaria de Accionistas en RES — esto las hace **oponibles a terceros** (futuros inversionistas/compradores), mientras un pacto privado solo obliga a los firmantes

### Costo total realista
**$130.000 – $250.000 CLP** — dentro del techo declarado de $200k aprox.

---

## 5. Trade-offs honestos

### Ventajas
- ~70% más barato que asesoría legal full ($500k-1.5M)
- Estructura validada por templates probados (Capboard usado por miles de startups EU)
- Mantiene la "no negociable" — revisión legal del Paso 3

### Riesgos aceptados
- Capboard es europeo → algunas cláusulas pueden tener matices distintos en Chile
- Wonder.Legal es low-cost → cláusulas más simples, menos protección custom
- Sin Paso 3 (revisión legal), riesgo de **cláusulas inejecutables bajo derecho chileno** — especialmente vesting (que en Chile no existe expresamente) y deadlock 50/50

### Lo que se sacrifica vs asesoría full
- Customización absoluta caso por caso
- Cláusulas anti-dilución sofisticadas (no necesarias hoy)
- IP assignment con lenguaje custom

---

## 6. Lo que NO se pudo verificar

1. **Precio exacto Wonder.Legal CL en CLP** — la página requiere completar formulario hasta checkout
2. **Precios de Lawgo, LawAndGo, Doconto** — sitios no devolvieron pricing
3. **Profundidad del template Capboard en deadlock 50/50** — confirmado vesting + drag + tag, NO confirmado russian roulette / texas shootout específicamente
4. **Si RES (Empresa en un Día) acepta cláusulas atípicas de vesting/deadlock directamente en estatuto** — flexibilidad real tiene límites prácticos. Confirmar con abogado en Paso 3
5. **U-cursos PDF "Pacto de Accionistas"** — existe pero no se pudo descargar para verificar si es template usable o material teórico

---

## 7. NO recomendado (descartado explícito)

- ❌ **Stripe Atlas / NVCA / Cooley copy-paste** — Delaware, esfuerzo de adaptación equivalente a redactar uno nuevo
- ❌ **Modelos Scribd / Studocu sin revisión** — autoría no verificable, sin actualización legal
- ❌ **Firmar sin abogado** — el Paso 3 es la línea roja. Un pacto mal redactado con deadlock 50/50 puede generar disolución forzada futura

---

## Fuentes principales

- [Capboard SHA](https://www.capboard.io/en/captable/shareholder-agreement-clauses) ⭐
- [Airtree Open Source VC](https://www.airtree.vc/open-source-vc/shareholders-agreement-template) ⭐
- [Wonder.Legal CL Pacto de Socios](https://www.wonder.legal/cl/modele/pacto-socios-cl)
- [Registro de Empresas — Formatos Tipo](https://www.registrodeempresasysociedades.cl/AyudaFormatosTipo.aspx)
- [Brokering Abogados — Pactos de accionistas](https://www.brokering.cl/pactos-de-accionistas/)
- [Legal Prisma — Pacto Chile](https://www.legalprisma.cl/pacto-de-accionistas-en-chile/)
- [Chambers Venture Capital 2025 — Chile](https://practiceguides.chambers.com/practice-guides/venture-capital-2025/chile)
- [Promise Legal Founder Agreement](https://promise.legal/templates/founder-agreement)

---

*Research focused ejecutado 2026-06-02 (42 tool uses, 70k tokens).*
