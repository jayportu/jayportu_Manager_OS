# MavelPoint · Revisión completa #2 — funciones, multi-rol e interacciones

Recorrido como usuario del **landing completo** + un **perfil público** + verificación de funciones internas. Foco: qué tienen que DROP no, los espacios para fotógrafos/audiovisuales, y las interacciones del landing.

## A. Listado de funciones que MavelPoint tiene y DROP no

Sacado de los **2 tablists del landing** (Para artistas / Para la industria) + interior:

| # | Función | Qué hace | DROP hoy |
|---|---|---|---|
| 1 | **Tipos de cuenta multi-creativo** | DJ · Productor · **Film Maker** · **Visuals/VJ** (y fotógrafos) | Solo **DJ** |
| 2 | **Galería con carpetas** | Álbumes de fotos + videos (por carpeta) | Galería plana |
| 3 | **Calendario vista mes + mapa** | Grilla mensual + mapa geográfico de gigs | Solo agenda/lista *(vista mes ya mockeada ✅)* |
| 4 | **Envío de demos** | Bandeja para recibir demos/tracks de otros | — |
| 5 | **Gestión de equipo** | Manager/agencia co-gestionan el perfil del artista | — (perfil 1 dueño) |
| 6 | **Gestión de tareas** | To-dos / pendientes del artista o equipo | — |
| 7 | **Analíticas avanzadas** | Métricas de vistas/clicks/audiencia del perfil | Press-kit stats básicas |
| 8 | **Controles de privacidad** | Qué se muestra público vs privado, por bloque | Parcial (visible en /dj on/off) |
| 9 | **Gestor de artículos de prensa** | Clippings/prensa administrables | Sección en press kit (limitada) |
| 10 | **Bio multi-idioma** | Una versión de bio por idioma | Bio única |
| 11 | **MavelTree (link-in-bio)** | Link-in-bio auto-actualizable | Press kit `/p/` cumple rol parecido |
| 12 | **Perfil de industria + códigos** | Versión extendida del perfil tras un código | Contacto gated a bookers (más simple) |
| 13 | **Soporte con tickets** | Tickets con estados (abierto/resuelto…) | Feedback widget |
| 14 | **Multi-idioma de plataforma** | EN/ES/DE/FR/NL | Solo ES |
| 15 | **Local Circuit** | Motor de bookings impulsado por la comunidad | Booker en pausa |

**DROP tiene y MavelPoint NO:** CRM con scoring + pipeline · **calendario con $** (cobrado/pendiente/promedio) · growth tracking · Smart Match · presencia ● LIVE · plantillas de mensajes · suscripción. → DROP = **OS de gestión**; MavelPoint = **vitrina + red**.

## B. Espacios para fotógrafos y audiovisuales (idea estratégica)

MavelPoint **no es solo para DJs**: en el onboarding eliges rol y hay tipos **DJ / Productor / Film Maker / Visuals** (audiovisuales), además de cuentas de **industria** (manager, agencia, sello, promotor).

**Oportunidad para DROP:** abrirse al **ecosistema completo del evento** — no solo el DJ, también **fotógrafos, videastas/filmmakers y VJs** que trabajan en la misma escena. Cada uno tendría su press kit (galería/reel/portfolio) y aparecería en el directorio para que bookers/productoras los contraten.

- **A favor:** amplía el mercado (TAM), refuerza el directorio, mismas piezas (press kit, galería, calendario, CRM) sirven casi igual, y crea efecto red (un DJ recomienda a su fotógrafo).
- **En contra / a sopesar:** hoy el foco es **DJs en tracción** ([[drop_fase_traccion]]). Sumar roles ahora dispersa. → Recomendación: **dejarlo en el roadmap post-tracción**, pero diseñar el modelo de datos del perfil pensando en que el "rol" sea un campo (DJ por ahora, extensible a fotógrafo/AV después) para no rehacerlo.

## C. Interacciones del landing a aprovechar

El landing de MavelPoint es muy interactivo. Lo que vale la pena tomar:

- **Tabs de features interactivos:** 2 tablists (artistas / industria); al clickear cada feature, cambia el preview a la derecha. Cuenta la propuesta de valor sin saturar. **Adoptar.**
- **Scroll-reveal:** las secciones entran con fade/slide al hacer scroll. **Adoptar (sutil).**
- **Hero con palabra animada:** ✅ ya lo implementamos (morph in-place).
- **FAQ en acordeón:** preguntas frecuentes colapsables. **Adoptar.**
- **Hover lifts** en cards + **cards de artistas destacados** (prueba social). **Adoptar.**
- **Contadores/stats de plataforma** en el hero (X artistas, etc.). **Adoptar** (ya está en el mock del landing).

## Veredicto priorizado

- 🥇 **Ahora:** vista mes del calendario (✅), galería con carpetas + lightbox (✅), tabs interactivos + scroll-reveal + FAQ en el landing.
- 🥈 **Siguiente:** analíticas del perfil, controles de privacidad por bloque, gestor de prensa.
- ⏸️ **Post-tracción:** multi-rol creativo (fotógrafos/AV), gestión de equipo/tareas, envío de demos, bio/plataforma multi-idioma, soporte con tickets, Local Circuit propio. *(Pero el campo "rol" en el perfil se diseña extensible desde ya.)*
