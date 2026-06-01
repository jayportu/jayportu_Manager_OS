# DROP. SpA — Research operacional Chile 2026

> Deep-research ejecutado 2026-06-01. 114 agents, 31 fuentes, 25 claims verificados adversarialmente (19 confirmados / 6 refutados).
> Este documento es la referencia técnica. El destilado accionable está al final.

---

## TL;DR

1. **Vía de constitución:** Empresa en un Día (RES) con ClaveÚnica de ambos socios. SpA es la estructura recomendada — diseñada para 1+ accionistas con plan de incorporar nuevos socios.
2. **Tributario:** Régimen **Pro Pyme General 14D N°3** recomendado para DROP. (IDPC transitorio 12,5% en 2025-2027, sube a 15% en 2028 y 25% desde 2029). Permite reinvertir utilidades sin gatillar impuestos personales hasta el retiro.
3. **IVA:** DROP. debe cobrar **19% IVA** sobre la suscripción de $10.000 CLP (giro 620100 Actividades de programación informática, Primera Categoría, afecto a IVA). **Decisión bloqueante de pricing pendiente.**
4. **Documentos tributarios:** Factura electrónica para clientes con giro, boleta electrónica para personas naturales. Determinación per-customer al checkout (lookup RUT).
5. **Ley 21.719 (datos personales):** Vigente desde **1-dic-2026** — DROP. tiene ~6 meses para adecuar política de privacidad, contratos con encargados (Vercel/Supabase/MP/Resend) y procesos ARCO.
6. **Retracto Ley 19.496:** 10 días, **excluible en T&C con frase literal "derecho a retracto"** (Reglamento Decreto 52/2024 SERNAC, vigente desde 28-feb-2025). Si no se confirma por escrito el contrato, el retracto se extiende a 90 días.
7. **MercadoPago:** 2,89% + IVA (acreditación 10d) o 3,19% + IVA (inmediato), sin arriendo. Flow es alternativa equivalente con integración Webpay/MACH/Servipag.

---

## 1 · Constitución SpA vía RES

**Plataforma:** [registrodeempresasysociedades.cl](https://www.registrodeempresasysociedades.cl/Constituir/) — Ley 20.659 (Empresa en un Día), vigente desde 2013. ~70% de constituciones nuevas en Chile son SpA.

**Requisito:** ClaveÚnica de los dos socios.

**Datos a definir antes de entrar:**
- Razón social (verificar disponibilidad en RES)
- Capital inicial (mínimo $1.000 CLP — recomendado $1MM+ para credibilidad bancaria, no se desembolsa real)
- % accionario (50/50 vs 60/40 vs otro)
- Administrador(es) — uno solo vs ambos conjunto/separado
- Domicilio social
- Giros SII

**Costo:** ❌ El research **no pudo confirmar** el costo exacto de creación 2026. El claim "gratis con Firma Electrónica Avanzada" fue refutado 1-2 — no quedó claro qué cobra realmente RES vs notarios.
→ **Consultar directamente en RES antes de constituir.**

**Vía notarial tradicional:** $200-400k, 1-2 semanas. No vale la pena salvo casos edge (estatutos altamente personalizados).

Fuentes: [RES portal](https://www.registrodeempresasysociedades.cl/Constituir/) · [ChileAtiende ficha 21409](https://www.chileatiende.gob.cl/fichas/21409-tu-empresa-en-un-dia)

---

## 2 · Régimen tributario

### Pro Pyme General (14D N°3) — RECOMENDADO para DROP.

- **IDPC:** 12,5% en 2025-2027 (transitorio Ley 21.755), 15% en 2028, 25% desde 2029
- **Cómo funciona:** La SpA paga IDPC sobre utilidades. Los socios pagan Global Complementario (0-40%) solo al **retirar** efectivamente.
- **Ventaja para DROP.:** Permite acumular caja en la SpA para reinvertir en crecimiento (expansión LATAM) sin gatillar impuestos personales.
- **Requisitos:** Ingresos brutos promedio últimos 3 años ≤75.000 UF + tope absoluto 85.000 UF/año (~$3.300M CLP/año al UF actual). DROP. tiene mucho headroom: 12 DJs × $10.000 × 12 = $1,44M anual ≈ 38 UF.

### Pro Pyme Transparente (14D N°8)

- **IDPC:** ❌ Exento. Las utilidades se atribuyen directamente a Jaime + Fer en el mismo año (independiente de retiros).
- **Riesgo:** Si la SpA genera utilidades pero no las distribuye, los socios igual tributan en Global Complementario (cashflow personal negativo).
- **Cuándo conviene:** Cuando se distribuye casi todo cada año. **No es el caso de DROP. pre-revenue creciendo.**

**Decisión recomendada por el research:** 14D N°3 General. Confirmar con contador antes de elegir en SII.

Fuentes: [Circular SII N° 53/2025](https://www.sii.cl/normativa_legislacion/circulares/2025/circu53.pdf) · [SII Regímenes Pro Pyme](https://www.sii.cl/destacados/modernizacion/tipos_regimenes_mt.html)

---

## 3 · IVA y facturación

### Obligatoriedad IVA 19%

- Giro **620100 (Actividades de programación informática)** = Primera Categoría afecto a IVA (DL 825 + Ley 21.210).
- DROP. **debe cobrar 19% IVA** sobre suscripción $10.000 CLP a clientes en Chile.
- **Refutado** ❌: el claim "Ley 21.713 cambió el tratamiento para SaaS local" se rechazó 2-1. La ley afecta plataformas extranjeras (Netflix, Spotify), no SaaS domiciliado en Chile.
- **Para clientes en LATAM** (expansión 12-18m): probable exportación de servicios → tasa 0% IVA, pero requiere análisis caso-país. **Open question pendiente.**

### Decisión bloqueante de pricing

| Opción | Precio cobrado | Neto para DROP. | Implicancia |
|---|---|---|---|
| **A.** Mantener $10.000 (IVA incluido) | $10.000 | $8.403 | Pierdes $1.597/mes/DJ (vs el target original) |
| **B.** Subir a $11.900 (IVA incluido) | $11.900 | $10.000 | Cobranza limpia, pero impacta percepción de precio |

### Tipos de documento

- **Factura electrónica:** clientes con giro (DJs con inicio de actividades / SpA / Ltda)
- **Boleta electrónica:** consumidores finales sin giro (la mayoría de DJs personas naturales)
- Lookup de RUT en checkout determina cuál emitir → patrón "facturación embebida" estándar 2026
- Proveedores certificados: Bsale, Defontana, Acepta, OpenFactura (costos no validados por research)

Fuentes: [SII Actividades Económicas PDF](https://www.sii.cl/destacados/iva_prestacion_servicios/vb_actividades_economicas.pdf) · [Multicore guía 2026](https://multicore.cl/guia-definitiva-de-facturacion-electronica-para-servicios-digitales-en-chile-sii-y-normativas-2026/)

---

## 4 · Ley 21.719 (datos personales) — DEADLINE 1-DIC-2026

Publicada 13-dic-2024, vigente **1-dic-2026**. Crea la **Agencia de Protección de Datos Personales (APDP)** con poder de investigar, sancionar y suspender tratamiento de datos.

### Qué cambia para DROP.

- **Política de privacidad** debe actualizarse con base legal de tratamiento por finalidad
- **Derechos ARCO digitales:** acceso, rectificación, cancelación, oposición + portabilidad
- **Contratos con encargados de tratamiento** (Vercel, Supabase, MercadoPago, Resend) → DPA obligatorio
- **DPO (Data Protection Officer):** probablemente NO con 12 usuarios beta; SÍ cuando escale a tratamientos masivos
- **Notificación de brechas** a la APDP

### Sanciones

❌ El claim específico de la escala 5K/10K/20K UTM fue refutado 1-2. Para cifras exactas, consultar directamente [Ley 21.719 en BCN](https://www.bcn.cl/leychile/navegar?idNorma=1209272).

Fuentes: [BCN Ley 21.719](https://www.bcn.cl/leychile/navegar?idNorma=1209272) · Carey Abogados · Wiki Guías SGD

---

## 5 · Ley 19.496 (Consumidor) y retracto

### Texto legal

Art. 3 bis: *"El consumidor podrá poner término unilateralmente al contrato en el plazo de 10 días contados desde la recepción del producto o desde la contratación del servicio y antes de la prestación del mismo"*.

### Aplicación para DROP.

1. **Trial de 15 días sirve como retracto efectivo** — el usuario puede cancelar antes del primer cobro sin penalidad.
2. **Reglamento Decreto 52/2024 SERNAC (vigente desde 28-feb-2025)** permite EXCLUIR el retracto en contratos de servicios si se informa clara y conspicuamente con la frase literal **"derecho a retracto"** antes de contratar.
3. **Confirmación escrita post-suscripción** (email + boleta) evita la extensión del plazo a 90 días.

### Decisión que destrabamos en la sesión

- Trial 15 días + reembolso completo si cancela en los 10 días posteriores al primer cobro → **doblemente blindado** (excede lo que exige la ley).

Fuente: [SERNAC retracto](https://www.sernac.cl/portal/617/w3-propertyvalue-64530.html)

---

## 6 · MercadoPago y alternativas

### MercadoPago Chile 2026

| Modalidad | Comisión | IVA | Efectivo | $10.000 → cobra |
|---|---|---|---|---|
| Acreditación 10 días | 2,89% | + IVA | 3,44% | $344 |
| Acreditación inmediata | 3,19% | + IVA | 3,80% | $380 |

- Sin arriendo mensual
- Soporta suscripciones recurrentes (preapproval) — ya implementado en S19
- No hay costo extra por modalidad recurrente vs one-shot (la comisión es por transacción)

### Alternativa: Flow

- 2,89% + IVA, acreditación al 3er día hábil (D+1 disponible)
- Integra **Webpay (Transbank), MACH y Servipag** en un solo gateway
- Ventaja vs MP: Webpay tiene la red más amplia en Chile
- Desventaja vs MP: producto de suscripción recurrente menos maduro

### Migración persona natural → SpA en MP

❌ El research **no pudo confirmar** el proceso exacto. Probablemente requiere onboarding nuevo (no migración). Documentación pedida y tiempos: **consultar a soporte MP directamente** cuando se cree la SpA.

Fuentes: [MP tarifas suscripciones](https://mercadopago.cl/ayuda/cuanto-cuesta-recibir-pagos-suscripciones_19495) · [Flow tarifas](https://web.flow.cl/es-cl/tarifas/)

---

## 7 · Open questions (lo que NO contestó el research)

Estas 4 áreas requieren consulta humana con profesionales chilenos:

| # | Pregunta | A quién preguntar |
|---|---|---|
| 1 | Costo real total constitución SpA en RES 2026 (FEA + notarización + inscripciones) | Llamar a RES o asesor legal |
| 2 | Honorarios contador externo en Chile 2026 para SpA SaaS (mínimo, recomendado, premium) + bancos chilenos con onboarding más rápido para SpA tech pre-revenue | Cotizar con 2-3 contadores y 2-3 bancos directamente |
| 3 | Templates confiables de pacto de accionistas 2 cofundadores 50/50 SaaS Chile (vesting 4y+1 cliff, drag-along, tag-along, ROFR, good/bad leaver, deadlock) + costo abogado | Abogado especializado en startups |
| 4 | Cómo aplicar exención IVA "exportación de servicios" cuando DROP. expanda a LATAM (Argentina, México, Colombia) — documentación SII para calificar a tasa 0% | Tributarista cuando se internacionalice |

---

## 8 · Caveats y datos sensibles al tiempo

1. **Ley 21.719 entra en vigencia 1-dic-2026** — DROP. tiene ~6 meses para adecuar privacidad, DPAs y procesos ARCO.
2. **IDPC 12,5% es transitorio** — sube a 15% en 2028 y a 25% desde 2029. Planificar timing de retiros.
3. **Reglamento Decreto 52/2024 SERNAC** (vigente 28-feb-2025) afecta cómo excluir retracto en SaaS — usar frase literal "derecho a retracto".
4. **Tasas tributarias y comisiones de pasarelas cambian** — verificar antes de ejecutar.

---

## 9 · Fuentes principales (primary quality)

- [registrodeempresasysociedades.cl/Constituir](https://www.registrodeempresasysociedades.cl/Constituir/)
- [registrodeempresasysociedades.cl/AyudaSpa](https://www.registrodeempresasysociedades.cl/AyudaSpa.aspx)
- [chileatiende.gob.cl/fichas/21409](https://www.chileatiende.gob.cl/fichas/21409-tu-empresa-en-un-dia)
- [sii.cl/destacados/modernizacion/tipos_regimenes_mt.html](https://www.sii.cl/destacados/modernizacion/tipos_regimenes_mt.html)
- [sii.cl Circular N° 53/2025](https://www.sii.cl/normativa_legislacion/circulares/2025/circu53.pdf)
- [sii.cl Actividades Económicas](https://www.sii.cl/destacados/iva_prestacion_servicios/vb_actividades_economicas.pdf)
- [bcn.cl Ley 21.719](https://www.bcn.cl/leychile/navegar?idNorma=1209272)
- [sernac.cl retracto](https://www.sernac.cl/portal/617/w3-propertyvalue-64530.html)

---

*Documento generado por deep-research workflow 2026-06-01.*
