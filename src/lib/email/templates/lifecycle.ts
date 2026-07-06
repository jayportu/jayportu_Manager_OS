import "server-only";

import { INK, CREAM, ORANGE, MUTED, BORDER, FONT_MONO, wrapEmail, ctaButton, escapeHtml } from "./_shared";


// ---------------------------------------------------------------------------
// 5. Avatar Reminder (perfil incompleto sin foto)
// ---------------------------------------------------------------------------

/**
 * Recordatorio para DJs beta que NO subieron foto de perfil.
 * Sin foto, su card en /dj sale con iniciales — el directorio se ve
 * menos profesional y los bookers no los identifican tan fácil.
 *
 * Tono: cordial, chileno tuteo, low pressure. CTA único a /perfil.
 */
export function avatarReminderEmailHtml(input: {
  artistName: string;
  profileUrl: string;
  directoryUrl: string;
}): string {
  const content = `
              <p style="font-size:16px; margin:0 0 16px 0;">Hola ${escapeHtml(input.artistName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Pasé revisando los perfiles de los DJs en la beta y vi que el tuyo todavía no tiene foto cargada.
              </p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Sin foto, tu card en el <a href="${input.directoryUrl}" style="color:${INK}; text-decoration:underline;">directorio público</a> sale con tus iniciales en vez de tu cara. Los bookers que entran a buscar DJ se enganchan con quien identifican rápido — y la foto es lo primero que ven.
              </p>
              <p style="font-size:15px; margin:0 0 12px 0;">Súbela en 30 segundos:</p>
              <ol style="font-size:15px; margin:0 0 20px 20px; padding:0;">
                <li style="margin:0 0 8px 0;">Abre tu perfil en DROP.</li>
                <li style="margin:0 0 8px 0;">Click en el círculo gris arriba (donde van las iniciales).</li>
                <li style="margin:0 0 8px 0;">Elige una foto cuadrada — JPG o PNG, hasta 10&nbsp;MB.</li>
              </ol>
              <p style="font-size:15px; margin:0 0 24px 0;">
                ${ctaButton("Subir mi foto", input.profileUrl)}
              </p>
              <p style="font-size:13px; color:${MUTED}; margin:0 0 16px 0;">
                Tip: usa una foto donde se te vea la cara claramente, sin filtros raros. Lo que pondrías en tu Instagram de perfil. La misma queda como avatar en toda la app + en tu press kit público.
              </p>
              <p style="font-size:15px; margin:0 0 24px 0;">
                Cualquier duda — o si algo no carga — respondes este correo y te ayudo directo.
              </p>
              <p style="font-size:15px; margin:0;">
                Saludos,<br>
                DROP<span style="color:${ORANGE};">.</span> Team
              </p>`;

  return wrapEmail({
    title: "Tu perfil en DROP. está casi listo",
    preheader: "Falta tu foto. Sin ella, tu card en el directorio sale con iniciales.",
    content,
    footerReason:
      'Recibes este correo porque estás en la beta de DROP. y tu perfil aún no tiene foto. Si prefieres no recibir más mensajes, respondes "unsubscribe" y te quito de la lista.',
  });
}


export function avatarReminderEmailText(input: {
  artistName: string;
  profileUrl: string;
  directoryUrl: string;
}): string {
  return `Hola ${input.artistName},

Pasé revisando los perfiles de los DJs en la beta y vi que el tuyo todavía no tiene foto cargada.

Sin foto, tu card en el directorio público (${input.directoryUrl}) sale con tus iniciales en vez de tu cara. Los bookers que entran a buscar DJ se enganchan con quien identifican rápido — y la foto es lo primero que ven.

Súbela en 30 segundos:
1. Abre tu perfil en DROP.
2. Click en el círculo gris arriba (donde van las iniciales).
3. Elige una foto cuadrada — JPG o PNG, hasta 10 MB.

Subir mi foto: ${input.profileUrl}

Tip: usa una foto donde se te vea la cara claramente, sin filtros raros. Lo que pondrías en tu Instagram de perfil. La misma queda como avatar en toda la app + en tu press kit público.

Cualquier duda — o si algo no carga — respondes este correo y te ayudo directo.

Saludos,
DROP. Team

--
DROP. — The DJ OS — Santiago, Chile — dropgigs.com
Recibes este correo porque estás en la beta y tu perfil aún no tiene foto. Si no quieres más, respondes "unsubscribe".`;
}


// ---------------------------------------------------------------------------
// 6. Follow Updates (digest de updates de DJ a followers)
// ---------------------------------------------------------------------------

// ─── Activación E1 · Bienvenida (al completar onboarding) ──────────────────
export function welcomeDjEmailHtml(input: {
  artistName: string;
  profileUrl: string;
}): string {
  const content = `
              <p style="font-size:16px; margin:0 0 16px 0;">Hola ${escapeHtml(input.artistName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Ya estás dentro de DROP<span style="color:${ORANGE};">.</span> Tienes acceso a tu sistema operativo de DJ: press kit, CRM de contactos, calendario con plata y growth — todo en un solo lugar.
              </p>
              <p style="font-size:15px; margin:0 0 12px 0;">
                Lo primero, y lo que más te mueve la aguja: <strong>arma tu press kit público</strong>. Es el link que les pasas a los bookers en vez de un PDF o tu Instagram. En 5 minutos:
              </p>
              <ol style="font-size:15px; margin:0 0 20px 20px; padding:0;">
                <li style="margin:0 0 8px 0;">Sube tu foto.</li>
                <li style="margin:0 0 8px 0;">Elige tus géneros y escribe dos líneas de bio.</li>
                <li style="margin:0 0 8px 0;">Pega tu mejor set (SoundCloud, Mixcloud o YouTube).</li>
              </ol>
              <p style="font-size:15px; margin:0 0 24px 0;">
                ${ctaButton("Armar mi press kit", input.profileUrl)}
              </p>
              <p style="font-size:13px; color:${MUTED}; margin:0 0 16px 0;">
                Con eso ya queda presentable y lo puedes compartir. El resto (rider, fee, galería) lo sumas cuando quieras.
              </p>
              <p style="font-size:15px; margin:0 0 24px 0;">
                Cualquier duda, respondes este correo y te ayudo directo.
              </p>
              <p style="font-size:15px; margin:0;">
                Saludos,<br>
                DROP<span style="color:${ORANGE};">.</span> Team
              </p>`;
  return wrapEmail({
    title: "Estás dentro de DROP. — armemos tu press kit",
    preheader: "Tu cuenta ya está lista. En 5 minutos tienes un press kit que se ve pro.",
    content,
    footerReason: "Recibes este correo porque acabas de activar tu cuenta en la beta de DROP.",
  });
}


export function welcomeDjEmailText(input: {
  artistName: string;
  profileUrl: string;
}): string {
  return `Hola ${input.artistName},

Ya estás dentro de DROP. Tienes acceso a tu sistema operativo de DJ: press kit, CRM, calendario con plata y growth — todo en un solo lugar.

Lo primero, y lo que más te mueve la aguja: arma tu press kit público. Es el link que les pasas a los bookers en vez de un PDF o tu Instagram. En 5 minutos:

1. Sube tu foto.
2. Elige tus géneros y escribe dos líneas de bio.
3. Pega tu mejor set (SoundCloud, Mixcloud o YouTube).

Armar mi press kit: ${input.profileUrl}

Con eso ya queda presentable y lo puedes compartir. El resto (rider, fee, galería) lo sumas cuando quieras.

Cualquier duda, respondes este correo y te ayudo directo.

Saludos,
DROP. Team`;
}


// ─── Activación E3 · Press kit vivo (al quedar live-ready) ─────────────────
export function presskitLiveEmailHtml(input: {
  artistName: string;
  presskitUrl: string;
}): string {
  const content = `
              <p style="font-size:16px; margin:0 0 16px 0;">Hola ${escapeHtml(input.artistName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Listo<span style="color:${ORANGE};">.</span> Tu press kit ya está completo y público. Este es tu link — así lo ven los bookers:
              </p>
              <p style="font-family:${FONT_MONO}; font-size:15px; font-weight:700; color:${INK}; background:#FBF7F0; border:2px solid ${ORANGE}; border-radius:4px; padding:12px 14px; margin:0 0 18px 0; text-align:center; word-break:break-all;">
                ${escapeHtml(input.presskitUrl.replace(/^https?:\/\//, ""))}
              </p>
              <p style="font-size:15px; margin:0 0 24px 0;">
                ${ctaButton("Ver mi press kit", input.presskitUrl)}
              </p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Ahora lo que de verdad mueve la aguja: <strong>úsalo</strong>. Pégalo en la bio de tu Instagram, mándaselo a los venues donde quieres tocar, ponlo en tu WhatsApp. Es tu carta de presentación en un link.
              </p>
              <p style="font-size:13px; color:${MUTED}; margin:0 0 24px 0;">
                ¿Próximo paso opcional? Carga tus gigs en el calendario y empieza a llevar la cuenta de lo que cobras.
              </p>
              <p style="font-size:15px; margin:0;">
                Saludos,<br>
                DROP<span style="color:${ORANGE};">.</span> Team
              </p>`;
  return wrapEmail({
    title: "Tu press kit en DROP. está vivo",
    preheader: "Acá está tu link. Ahora lo importante: empieza a pasarlo.",
    content,
    footerReason: "Recibes este correo porque completaste tu press kit en DROP.",
  });
}


export function presskitLiveEmailText(input: {
  artistName: string;
  presskitUrl: string;
}): string {
  return `Hola ${input.artistName},

Listo. Tu press kit ya está completo y público. Este es tu link — así lo ven los bookers:

${input.presskitUrl}

Ahora lo que de verdad mueve la aguja: úsalo. Pégalo en la bio de tu Instagram, mándaselo a los venues donde quieres tocar, ponlo en tu WhatsApp. Es tu carta de presentación en un link.

¿Próximo paso opcional? Carga tus gigs en el calendario y empieza a llevar la cuenta de lo que cobras.

Saludos,
DROP. Team`;
}

export interface FollowUpdate {
  type: "show_scheduled" | "availability_updated";
  title: string;
  detail?: string;
}


export function followUpdatesEmailHtml(input: {
  bookerName: string;
  djArtistName: string;
  djSlug: string;
  updates: FollowUpdate[];
  dashboardUrl: string;
  siteUrl: string;
}): string {
  const updatesHtml = input.updates
    .map(
      (u) => `
                <li style="margin:0 0 12px 0;">
                  <strong>${escapeHtml(u.title)}</strong>${
                    u.detail
                      ? `<br/><span style="color:${MUTED}; font-size:14px;">${escapeHtml(u.detail)}</span>`
                      : ""
                  }
                </li>`
    )
    .join("");
  const profileUrl = `${input.siteUrl}/p/${input.djSlug}`;

  const content = `
              <p style="font-size:16px; margin:0 0 16px 0;">
                Hola ${escapeHtml(input.bookerName)},
              </p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                <strong>${escapeHtml(input.djArtistName)}</strong>, que sigues, tiene novedades:
              </p>
              <ul style="font-size:15px; margin:0 0 20px 20px; padding:0; list-style:none;">
                ${updatesHtml}
              </ul>
              <p style="font-size:15px; margin:0 0 24px 0;">
                ${ctaButton(`Ver perfil de ${input.djArtistName}`, profileUrl)}
              </p>
              <p style="font-size:13px; color:${MUTED}; margin:0 0 16px 0;">
                ¿Recibes muchos avisos? Puedes pausar las notificaciones desde el perfil del DJ o desde tu feed de seguidos en DROP.
              </p>
              <p style="font-size:15px; margin:0;">
                Saludos,<br>
                DROP<span style="color:${ORANGE};">.</span> Team
              </p>`;

  return wrapEmail({
    title: `${input.djArtistName} actualizó su agenda`,
    preheader: `Novedades de ${input.djArtistName} en DROP.`,
    content,
    footerReason: `Recibes este email porque sigues a ${escapeHtml(input.djArtistName)} con avisos activados en DROP. Puedes pausarlos en cualquier momento desde su perfil.`,
  });
}


export function followUpdatesEmailText(input: {
  bookerName: string;
  djArtistName: string;
  djSlug: string;
  updates: FollowUpdate[];
  siteUrl: string;
}): string {
  const lines = input.updates
    .map((u, i) => {
      const head = `${i + 1}. ${u.title}`;
      return u.detail ? `${head}\n   ${u.detail}` : head;
    })
    .join("\n");
  const profileUrl = `${input.siteUrl}/p/${input.djSlug}`;
  return `Hola ${input.bookerName},

${input.djArtistName}, que sigues, tiene novedades:

${lines}

Ver perfil: ${profileUrl}

¿Recibes muchos avisos? Puedes pausar las notificaciones desde el perfil del DJ o desde tu feed de seguidos en DROP.

Saludos,
DROP. Team

--
DROP. — The DJ OS — Santiago, Chile — dropgigs.com
Recibes este correo porque sigues a ${input.djArtistName} con avisos activados. Puedes pausarlos en cualquier momento desde su perfil.`;
}


// ---------------------------------------------------------------------------
// 8. Weekly Digest — resumen semanal al DJ
// ---------------------------------------------------------------------------

export function weeklyDigestDjEmailHtml(input: {
  djArtistName: string;
  weekLabel: string;
  profileViews: number;
  bookingsReceived: number;
  newFollowers: number;
  dashboardUrl: string;
}): string {
  const { djArtistName, weekLabel, profileViews, bookingsReceived, newFollowers, dashboardUrl } = input;
  const highlight =
    bookingsReceived > 0
      ? `Recibiste <strong>${bookingsReceived} booking${bookingsReceived > 1 ? "s" : ""}</strong> esta semana.`
      : profileViews > 0
        ? `Tu perfil tuvo <strong>${profileViews} vista${profileViews > 1 ? "s" : ""}</strong> esta semana.`
        : "Esta semana no hubo actividad. Actualizar tu perfil o compartirlo puede ayudar.";
  const bookingsColor = bookingsReceived > 0 ? ORANGE : INK;
  const content = `
              <p style="font-size:16px; margin:0 0 6px 0;">Hola ${escapeHtml(djArtistName)},</p>
              <p style="font-size:11px; color:${MUTED}; font-family:${FONT_MONO}; text-transform:uppercase; letter-spacing:0.12em; margin:0 0 20px 0;">Semana ${escapeHtml(weekLabel)}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER}; border-radius:4px; margin:0 0 20px 0;">
                <tr>
                  <td align="center" style="padding:20px 8px; border-right:1px solid ${BORDER}; width:33.3%;">
                    <div style="font-size:30px; font-weight:700; font-family:${FONT_MONO}; color:${INK}; line-height:1;">${profileViews}</div>
                    <div style="font-size:10px; color:${MUTED}; text-transform:uppercase; letter-spacing:0.1em; margin-top:6px;">Vistas</div>
                  </td>
                  <td align="center" style="padding:20px 8px; border-right:1px solid ${BORDER}; width:33.3%;">
                    <div style="font-size:30px; font-weight:700; font-family:${FONT_MONO}; color:${bookingsColor}; line-height:1;">${bookingsReceived}</div>
                    <div style="font-size:10px; color:${MUTED}; text-transform:uppercase; letter-spacing:0.1em; margin-top:6px;">Bookings</div>
                  </td>
                  <td align="center" style="padding:20px 8px; width:33.3%;">
                    <div style="font-size:30px; font-weight:700; font-family:${FONT_MONO}; color:${INK}; line-height:1;">${newFollowers}</div>
                    <div style="font-size:10px; color:${MUTED}; text-transform:uppercase; letter-spacing:0.1em; margin-top:6px;">Followers</div>
                  </td>
                </tr>
              </table>
              <p style="font-size:15px; margin:0 0 24px 0;">${highlight}</p>
              <p style="margin:0 0 24px 0;">${ctaButton("Ver mi dashboard", dashboardUrl)}</p>
              <p style="font-size:15px; margin:0;">Que la próxima semana sea mejor,<br>DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: `Tu semana en DROP. — ${weekLabel}`,
    preheader: `${profileViews} vistas · ${bookingsReceived} bookings · ${newFollowers} followers esta semana.`,
    content,
    footerReason: "Recibes este resumen porque tienes una cuenta activa en DROP. (dropgigs.com). Puedes pausarlo desde Configuración.",
  });
}


export function weeklyDigestDjEmailText(input: {
  djArtistName: string;
  weekLabel: string;
  profileViews: number;
  bookingsReceived: number;
  newFollowers: number;
  dashboardUrl: string;
}): string {
  const { djArtistName, weekLabel, profileViews, bookingsReceived, newFollowers, dashboardUrl } = input;
  return [
    `Hola ${djArtistName},`,
    `Resumen semana ${weekLabel}:`,
    "",
    `Vistas al perfil: ${profileViews}`,
    `Bookings recibidos: ${bookingsReceived}`,
    `Nuevos followers: ${newFollowers}`,
    "",
    `Ver dashboard: ${dashboardUrl}`,
    "",
    "Que la próxima semana sea mejor,",
    "DROP. Team",
    "",
    "--",
    "DROP. — dropgigs.com | Pausar resumen: dropgigs.com/configuracion",
  ].join("\n");
}


// ---------------------------------------------------------------------------
// 10. Follow-up vencido — recordatorio CRM
// ---------------------------------------------------------------------------

export function followUpOverdueEmailHtml(input: {
  djArtistName: string;
  contactName: string;
  dueDateLabel: string;
  note: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, contactName, dueDateLabel, note, dashboardUrl } = input;
  const content = `
              <p style="font-size:16px; margin:0 0 16px 0;">Hola ${escapeHtml(djArtistName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">Tienes un seguimiento vencido en tu CRM:</p>
              <div style="background:#f9f7f4; border:1px solid ${BORDER}; border-radius:4px; padding:16px 20px; margin:0 0 20px 0;">
                <p style="font-size:14px; font-weight:700; margin:0 0 6px 0;">${escapeHtml(contactName)}</p>
                <p style="font-size:13px; color:${ORANGE}; font-family:${FONT_MONO}; margin:0 0 10px 0; text-transform:uppercase; letter-spacing:0.08em;">${escapeHtml(dueDateLabel)}</p>
                <p style="font-size:14px; color:${MUTED}; margin:0; font-style:italic;">"${escapeHtml(note)}"</p>
              </div>
              <p style="margin:0 0 24px 0;">${ctaButton("Ir al CRM", dashboardUrl)}</p>
              <p style="font-size:15px; margin:0;">— DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: `Follow-up vencido — ${contactName}`,
    preheader: `Tienes un seguimiento pendiente con ${contactName} desde ${dueDateLabel}.`,
    content,
    footerReason: "Recibes este aviso porque tienes seguimientos activos en tu CRM de DROP. (dropgigs.com).",
  });
}


export function followUpOverdueEmailText(input: {
  djArtistName: string;
  contactName: string;
  dueDateLabel: string;
  note: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, contactName, dueDateLabel, note, dashboardUrl } = input;
  return [
    `Hola ${djArtistName},`,
    "",
    "Tienes un seguimiento vencido en tu CRM:",
    "",
    `Contacto: ${contactName}`,
    `Vencido: ${dueDateLabel}`,
    `Nota: "${note}"`,
    "",
    `Ir al CRM: ${dashboardUrl}`,
    "",
    "— DROP. Team",
    "",
    "--",
    "DROP. — dropgigs.com",
  ].join("\n");
}


// ---------------------------------------------------------------------------
// 12. Perfil completo — confirmación de hito
// ---------------------------------------------------------------------------

export function profileCompleteEmailHtml(input: {
  djArtistName: string;
  profileUrl: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, profileUrl } = input;
  const content = `
              <p style="font-size:16px; margin:0 0 16px 0;">Hola ${escapeHtml(djArtistName)},</p>
              <p style="font-size:15px; margin:0 0 8px 0;">Tu perfil en DROP. está <strong>100% completo</strong>.</p>
              <p style="font-size:24px; font-family:${FONT_MONO}; margin:0 0 20px 0;">✓</p>
              <p style="font-size:15px; margin:0 0 12px 0;">Ahora los bookers pueden encontrarte y contactarte directamente. Tu press kit público está en:</p>
              <div style="background:#f9f7f4; border:1px solid ${BORDER}; border-radius:4px; padding:14px 16px; margin:0 0 20px 0;">
                <p style="font-size:13px; font-family:${FONT_MONO}; margin:0; color:${INK}; word-break:break-all;">${escapeHtml(profileUrl)}</p>
              </div>
              <p style="font-size:14px; color:${MUTED}; margin:0 0 20px 0;">Compártelo en tus redes, en tu bio de Instagram, o en tu firma de email.</p>
              <p style="margin:0 0 24px 0;">${ctaButton("Ver mi perfil", profileUrl)}</p>
              <p style="font-size:15px; margin:0;">Que lleguen los bookings,<br>DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: "Tu perfil DROP. está completo",
    preheader: "Tu press kit está listo y visible para bookers. Compártelo.",
    content,
    footerReason: "Recibes este aviso porque completaste tu perfil en DROP. (dropgigs.com).",
  });
}


export function profileCompleteEmailText(input: {
  djArtistName: string;
  profileUrl: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, profileUrl } = input;
  return [
    `Hola ${djArtistName},`,
    "",
    "Tu perfil en DROP. está 100% completo.",
    "",
    "Tu press kit público está en:",
    profileUrl,
    "",
    "Compártelo en tus redes, en tu bio de Instagram, o en tu firma de email.",
    "",
    "Que lleguen los bookings,",
    "DROP. Team",
    "",
    "--",
    "DROP. — dropgigs.com",
  ].join("\n");
}


// ---------------------------------------------------------------------------
// 16. Retención: 30 días sin booking recibido
// ---------------------------------------------------------------------------

export function djRetencion30DiasEmailHtml(input: {
  djArtistName: string;
  profileUrl: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, profileUrl, dashboardUrl } = input;
  const tips = [
    ["Foto profesional", "El 80% de los bookers mira primero la foto. Una buena imagen lo cambia todo."],
    ["Bio con estilo y géneros", "Explica qué tipo de eventos tocas y en qué eres diferente."],
    ["Comparte tu press kit", "El link de tu perfil es tu tarjeta de presentación. Agrégalo a tu bio de IG."],
  ];
  const tipsHtml = tips.map(([title, desc]) => `
    <tr>
      <td style="padding:12px 0; border-bottom:1px solid ${BORDER};">
        <p style="font-size:14px; font-weight:600; color:${INK}; margin:0 0 4px 0;">${title}</p>
        <p style="font-size:13px; color:${MUTED}; margin:0;">${desc}</p>
      </td>
    </tr>`).join("");
  const content = `
              <p style="font-size:16px; margin:0 0 20px 0;">Hola ${escapeHtml(djArtistName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Llevas un mes sin recibir nuevos bookings. Estas pequeñas mejoras en tu perfil pueden hacer una gran diferencia:
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
                ${tipsHtml}
              </table>
              <p style="margin:0 0 12px 0;">${ctaButton("Revisar mi press kit", profileUrl)}</p>
              <p style="margin:0 0 24px 0;"><a href="${escapeHtml(dashboardUrl)}" style="font-size:13px; color:${MUTED};">Ver mi dashboard</a></p>
              <p style="font-size:15px; margin:0;">DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: "Algunos tips para conseguir tu próximo booking",
    preheader: "Pequeños cambios en tu perfil pueden atraer más bookers.",
    content,
    footerReason: "Recibes este mensaje porque tienes una cuenta activa en DROP. (dropgigs.com).",
  });
}


export function djRetencion30DiasEmailText(input: {
  djArtistName: string;
  profileUrl: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, profileUrl, dashboardUrl } = input;
  return [
    `Hola ${djArtistName},`,
    "",
    "Llevas un mes sin recibir nuevos bookings. Algunos tips:",
    "",
    "1. Foto profesional — El 80% de los bookers mira primero la foto.",
    "2. Bio con estilo y géneros — Explica qué tipo de eventos tocas.",
    "3. Comparte tu press kit — Agrégalo a tu bio de IG.",
    "",
    `Revisar mi press kit: ${profileUrl}`,
    `Dashboard: ${dashboardUrl}`,
    "",
    "--",
    "Recibes este mensaje porque tienes una cuenta activa en DROP. (dropgigs.com).",
  ].join("\n");
}


// ---------------------------------------------------------------------------
// 17. Retención: 60 días sin actividad (reengagement)
// ---------------------------------------------------------------------------

export function djRetencion60DiasEmailHtml(input: {
  djArtistName: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, dashboardUrl } = input;
  const novedades = [
    "Nuevo sistema de seguimientos en el CRM",
    "Smart Match — bookers que buscan tu estilo",
    "Press kit con sección de sets y mixes",
  ];
  const novedadesHtml = novedades.map(n => `
    <li style="font-size:14px; color:${MUTED}; margin-bottom:8px;">${n}</li>`).join("");
  const content = `
              <p style="font-size:16px; margin:0 0 20px 0;">Hola ${escapeHtml(djArtistName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Hace un tiempo que no te vemos por acá. Mientras estabas afuera, DROP. creció bastante.
              </p>
              <p style="font-size:13px; color:${MUTED}; text-transform:uppercase; letter-spacing:0.1em; font-family:${FONT_MONO}; margin:0 0 12px 0;">Novedades</p>
              <ul style="padding-left:20px; margin:0 0 24px 0;">
                ${novedadesHtml}
              </ul>
              <p style="margin:0 0 24px 0;">${ctaButton("Volver a DROP.", dashboardUrl)}</p>
              <p style="font-size:15px; margin:0;">Te esperamos,<br>DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: "Hace tiempo que no te vemos — novedades en DROP.",
    preheader: "Smart Match, CRM mejorado y más. Echa un vistazo.",
    content,
    footerReason: "Recibes este mensaje porque tienes una cuenta en DROP. (dropgigs.com).",
  });
}


export function djRetencion60DiasEmailText(input: {
  djArtistName: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, dashboardUrl } = input;
  return [
    `Hola ${djArtistName},`,
    "",
    "Hace un tiempo que no te vemos por acá. Mientras estabas afuera, DROP. creció bastante.",
    "",
    "Novedades:",
    "- Nuevo sistema de seguimientos en el CRM",
    "- Smart Match — bookers que buscan tu estilo",
    "- Press kit con sección de sets y mixes",
    "",
    `Volver a DROP.: ${dashboardUrl}`,
    "",
    "--",
    "Recibes este mensaje porque tienes una cuenta en DROP. (dropgigs.com).",
  ].join("\n");
}


// ---------------------------------------------------------------------------
// 18. Retención: Aniversario en DROP.
// ---------------------------------------------------------------------------

export function djAniversarioEmailHtml(input: {
  djArtistName: string;
  yearsLabel: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, yearsLabel, dashboardUrl } = input;
  const content = `
              <p style="font-size:11px; color:${ORANGE}; font-family:${FONT_MONO}; text-transform:uppercase; letter-spacing:0.15em; margin:0 0 8px 0;">Aniversario</p>
              <p style="font-size:26px; font-weight:700; color:${INK}; margin:0 0 20px 0; line-height:1.2;">
                ${escapeHtml(yearsLabel)} en DROP<span style="color:${ORANGE};">.</span>
              </p>
              <p style="font-size:15px; margin:0 0 16px 0;">Hola ${escapeHtml(djArtistName)},</p>
              <p style="font-size:15px; color:${MUTED}; margin:0 0 24px 0;">
                Hoy se cumple exactamente ${escapeHtml(yearsLabel)} desde que te sumaste a DROP.
                Gracias por ser parte de esto desde el principio.
              </p>
              <p style="margin:0 0 24px 0;">${ctaButton("Ver mi perfil", dashboardUrl)}</p>
              <p style="font-size:15px; margin:0;">Con cariño,<br>DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: `${yearsLabel} en DROP. — feliz aniversario`,
    preheader: `Hoy se cumple ${yearsLabel} desde que te sumaste. Gracias.`,
    content,
    footerReason: "Recibes este mensaje porque tienes una cuenta en DROP. (dropgigs.com).",
  });
}


export function djAniversarioEmailText(input: {
  djArtistName: string;
  yearsLabel: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, yearsLabel, dashboardUrl } = input;
  return [
    `Hola ${djArtistName},`,
    "",
    `Hoy se cumple exactamente ${yearsLabel} desde que te sumaste a DROP.`,
    "Gracias por ser parte de esto desde el principio.",
    "",
    `Ver mi perfil: ${dashboardUrl}`,
    "",
    "--",
    "Con cariño, DROP. Team (dropgigs.com).",
  ].join("\n");
}


// ---------------------------------------------------------------------------
// 19. Operaciones: DJ suspendido — notificación al afectado
// ---------------------------------------------------------------------------

export function djSuspendidoEmailHtml(input: {
  djArtistName: string;
  reason?: string;
  contactEmail: string;
}): string {
  const { djArtistName, reason, contactEmail } = input;
  const reasonBlock = reason
    ? `<div style="background:${CREAM}; border-left:3px solid ${ORANGE}; padding:14px 18px; border-radius:4px; margin:0 0 24px 0;">
        <p style="font-size:13px; color:${MUTED}; margin:0 0 4px 0; text-transform:uppercase; letter-spacing:0.1em; font-family:${FONT_MONO};">Motivo</p>
        <p style="font-size:14px; color:${INK}; margin:0;">${escapeHtml(reason)}</p>
       </div>`
    : "";
  const content = `
              <p style="font-size:16px; margin:0 0 20px 0;">Hola ${escapeHtml(djArtistName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Tu cuenta en DROP. ha sido <strong>suspendida temporalmente</strong> por nuestro equipo de moderación.
              </p>
              ${reasonBlock}
              <p style="font-size:14px; color:${MUTED}; margin:0 0 24px 0;">
                Si crees que esto es un error o quieres más información, escríbenos a
                <a href="mailto:${escapeHtml(contactEmail)}" style="color:${INK};">${escapeHtml(contactEmail)}</a>
                y lo revisamos.
              </p>
              <p style="font-size:15px; margin:0;">DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: "Tu cuenta en DROP. ha sido suspendida",
    preheader: "Información importante sobre tu cuenta.",
    content,
    footerReason: "Recibes este mensaje porque tienes una cuenta en DROP. (dropgigs.com).",
  });
}


export function djSuspendidoEmailText(input: {
  djArtistName: string;
  reason?: string;
  contactEmail: string;
}): string {
  const { djArtistName, reason, contactEmail } = input;
  return [
    `Hola ${djArtistName},`,
    "",
    "Tu cuenta en DROP. ha sido suspendida temporalmente por nuestro equipo de moderación.",
    ...(reason ? ["", `Motivo: ${reason}`] : []),
    "",
    `Si crees que esto es un error, escríbenos a ${contactEmail}.`,
    "",
    "--",
    "DROP. Team (dropgigs.com).",
  ].join("\n");
}


// ---------------------------------------------------------------------------
// 24. CRM: follow-up vence mañana
// ---------------------------------------------------------------------------

export function followUpProximoEmailHtml(input: {
  djArtistName: string;
  contactName: string;
  dueDateLabel: string;
  note: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, contactName, dueDateLabel, note } = input;
  const content = `
              <p style="font-size:16px; margin:0 0 20px 0;">Hola ${escapeHtml(djArtistName)},</p>
              <p style="font-size:15px; margin:0 0 20px 0;">
                Tienes un seguimiento programado para <strong>mañana</strong> con <strong>${escapeHtml(contactName)}</strong>.
              </p>
              <div style="background:${CREAM}; border-radius:6px; padding:18px 20px; margin:0 0 28px 0;">
                <p style="font-size:11px; color:${MUTED}; margin:0 0 6px 0; text-transform:uppercase; letter-spacing:0.1em; font-family:${FONT_MONO};">Fecha · ${escapeHtml(dueDateLabel)}</p>
                <p style="font-size:14px; color:${INK}; margin:0; font-style:italic;">"${escapeHtml(note)}"</p>
              </div>
              <p style="margin:0 0 24px 0;">${ctaButton("Ir al CRM", input.dashboardUrl)}</p>
              <p style="font-size:15px; margin:0;">DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: `Seguimiento mañana con ${contactName}`,
    preheader: `Recordatorio: tienes un follow-up pendiente para ${dueDateLabel}.`,
    content,
    footerReason: "Recibes este recordatorio porque tienes seguimientos activos en DROP. (dropgigs.com).",
  });
}


export function followUpProximoEmailText(input: {
  djArtistName: string;
  contactName: string;
  dueDateLabel: string;
  note: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, contactName, dueDateLabel, note, dashboardUrl } = input;
  return [
    `Hola ${djArtistName},`,
    "",
    `Tienes un seguimiento programado para mañana (${dueDateLabel}) con ${contactName}.`,
    `Nota: "${note}"`,
    "",
    `Ir al CRM: ${dashboardUrl}`,
    "",
    "--",
    "Recibes este recordatorio porque tienes seguimientos activos en DROP. (dropgigs.com).",
  ].join("\n");
}


// ---------------------------------------------------------------------------
// 25. CRM: contacto sin actividad en 90 días
// ---------------------------------------------------------------------------

export function contactoInactivoEmailHtml(input: {
  djArtistName: string;
  contactName: string;
  lastActivityLabel: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, contactName, lastActivityLabel, dashboardUrl } = input;
  const content = `
              <p style="font-size:16px; margin:0 0 20px 0;">Hola ${escapeHtml(djArtistName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                No hay actividad con <strong>${escapeHtml(contactName)}</strong> desde <strong>${escapeHtml(lastActivityLabel)}</strong>.
              </p>
              <p style="font-size:14px; color:${MUTED}; margin:0 0 24px 0;">
                ¿Vale la pena retomar el contacto? Un mensaje corto puede reactivar la relación.
              </p>
              <p style="margin:0 0 24px 0;">${ctaButton("Ver contacto", dashboardUrl)}</p>
              <p style="font-size:15px; margin:0;">DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: `${contactName} lleva 90 días sin actividad`,
    preheader: "Puede ser momento de retomar el contacto.",
    content,
    footerReason: "Recibes este aviso porque tienes contactos en tu CRM de DROP. (dropgigs.com).",
  });
}


export function contactoInactivoEmailText(input: {
  djArtistName: string;
  contactName: string;
  lastActivityLabel: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, contactName, lastActivityLabel, dashboardUrl } = input;
  return [
    `Hola ${djArtistName},`,
    "",
    `No hay actividad con ${contactName} desde ${lastActivityLabel}.`,
    "¿Vale la pena retomar el contacto? Un mensaje corto puede reactivar la relación.",
    "",
    `Ver contacto: ${dashboardUrl}`,
    "",
    "--",
    "Recibes este aviso porque tienes contactos en tu CRM de DROP. (dropgigs.com).",
  ].join("\n");
}


// ---------------------------------------------------------------------------
// 26. Calendario: recordatorio 7 días antes del show
// ---------------------------------------------------------------------------

export function eventoEn7DiasEmailHtml(input: {
  djArtistName: string;
  eventDate: string;
  venue?: string;
  amountClp?: number;
  dashboardUrl: string;
}): string {
  const { djArtistName, eventDate, venue, amountClp, dashboardUrl } = input;
  const venueRow = venue
    ? `<tr><td style="padding:10px 0; border-bottom:1px solid ${BORDER};"><span style="font-size:11px; color:${MUTED}; text-transform:uppercase; font-family:${FONT_MONO};">Lugar</span><p style="font-size:14px; color:${INK}; margin:4px 0 0 0;">${escapeHtml(venue)}</p></td></tr>`
    : "";
  const amountRow = amountClp
    ? `<tr><td style="padding:10px 0;"><span style="font-size:11px; color:${MUTED}; text-transform:uppercase; font-family:${FONT_MONO};">Monto acordado</span><p style="font-size:14px; color:${INK}; font-weight:600; margin:4px 0 0 0;">$${amountClp.toLocaleString("es-CL")} CLP</p></td></tr>`
    : "";
  const content = `
              <p style="font-size:11px; color:${ORANGE}; font-family:${FONT_MONO}; text-transform:uppercase; letter-spacing:0.15em; margin:0 0 8px 0;">Faltan 7 días</p>
              <p style="font-size:16px; margin:0 0 20px 0;">Hola ${escapeHtml(djArtistName)},</p>
              <p style="font-size:15px; margin:0 0 20px 0;">Tu próximo evento es en una semana. Aquí tienes todos los detalles:</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER}; border-radius:6px; padding:4px 16px; margin:0 0 28px 0;">
                <tr><td style="padding:10px 0; border-bottom:1px solid ${BORDER};"><span style="font-size:11px; color:${MUTED}; text-transform:uppercase; font-family:${FONT_MONO};">Fecha</span><p style="font-size:14px; color:${INK}; font-weight:600; margin:4px 0 0 0;">${escapeHtml(eventDate)}</p></td></tr>
                ${venueRow}
                ${amountRow}
              </table>
              <p style="margin:0 0 24px 0;">${ctaButton("Ver en mi calendario", dashboardUrl)}</p>
              <p style="font-size:15px; margin:0;">DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: `Tu evento es en 7 días — ${eventDate}`,
    preheader: "Repasa los detalles antes del show.",
    content,
    footerReason: "Recibes este recordatorio porque tienes un evento agendado en DROP. (dropgigs.com).",
  });
}


export function eventoEn7DiasEmailText(input: {
  djArtistName: string;
  eventDate: string;
  venue?: string;
  amountClp?: number;
  dashboardUrl: string;
}): string {
  const { djArtistName, eventDate, venue, amountClp, dashboardUrl } = input;
  return [
    `Hola ${djArtistName},`,
    "",
    `Tu próximo evento es el ${eventDate}.`,
    ...(venue ? [`Lugar: ${venue}`] : []),
    ...(amountClp ? [`Monto: $${amountClp.toLocaleString("es-CL")} CLP`] : []),
    "",
    `Ver en mi calendario: ${dashboardUrl}`,
    "",
    "--",
    "Recibes este recordatorio porque tienes un evento agendado en DROP. (dropgigs.com).",
  ].join("\n");
}


// ---------------------------------------------------------------------------
// 27. Press kit: DJ sin slug configurado
// ---------------------------------------------------------------------------

export function djSinSlugEmailHtml(input: {
  djArtistName: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, dashboardUrl } = input;
  const content = `
              <p style="font-size:16px; margin:0 0 20px 0;">Hola ${escapeHtml(djArtistName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Tu press kit todavía no tiene una URL personalizada. En este momento tu link es
                largo y difícil de recordar.
              </p>
              <div style="background:${CREAM}; border-radius:6px; padding:16px 20px; margin:0 0 24px 0;">
                <p style="font-size:13px; color:${MUTED}; margin:0 0 6px 0; text-transform:uppercase; letter-spacing:0.1em; font-family:${FONT_MONO};">Con tu slug</p>
                <p style="font-size:15px; color:${INK}; font-weight:600; font-family:${FONT_MONO}; margin:0;">dropgigs.com/dj/<span style="color:${ORANGE};">tu-nombre</span></p>
              </div>
              <p style="margin:0 0 24px 0;">${ctaButton("Configurar mi URL", dashboardUrl)}</p>
              <p style="font-size:15px; margin:0;">DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: "Tu press kit no tiene URL personalizada",
    preheader: "dropgigs.com/dj/tu-nombre — configúralo en 30 segundos.",
    content,
    footerReason: "Recibes este mensaje porque tienes una cuenta activa en DROP. (dropgigs.com).",
  });
}


export function djSinSlugEmailText(input: {
  djArtistName: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, dashboardUrl } = input;
  return [
    `Hola ${djArtistName},`,
    "",
    "Tu press kit todavía no tiene una URL personalizada.",
    "Con un slug queda así: dropgigs.com/dj/tu-nombre",
    "",
    `Configurar mi URL: ${dashboardUrl}`,
    "",
    "--",
    "Recibes este mensaje porque tienes una cuenta activa en DROP. (dropgigs.com).",
  ].join("\n");
}


// ---------------------------------------------------------------------------
// 30. Onboarding: DJ recién aprobado — primeros pasos
// ---------------------------------------------------------------------------

export function djOnboardingEmailHtml(input: {
  djArtistName: string;
  dashboardUrl: string;
  pressKitUrl: string;
}): string {
  const { djArtistName, dashboardUrl, pressKitUrl } = input;
  const pasos = [
    ["01", "Sube tu foto", "La primera impresión lo es todo. Usa una foto de alta calidad."],
    ["02", "Escribe tu bio", "Cuéntale a los bookers qué tipo de eventos tocas y cuál es tu estilo."],
    ["03", "Agrega tus géneros y ciudad", "Así apareces en las búsquedas de bookers cercanos."],
    ["04", "Configura tu URL", `Tu link quedará así: ${pressKitUrl}`],
    ["05", "Comparte tu press kit", "Agrégalo a tu bio de Instagram. Cada visita es un posible booking."],
  ];
  const pasosHtml = pasos.map(([num, title, desc]) => `
    <tr>
      <td style="padding:14px 0; border-bottom:1px solid ${BORDER}; vertical-align:top;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="width:32px; vertical-align:top; padding-top:2px;">
            <span style="font-size:11px; color:${ORANGE}; font-family:${FONT_MONO}; font-weight:700;">${num}</span>
          </td>
          <td>
            <p style="font-size:14px; font-weight:600; color:${INK}; margin:0 0 3px 0;">${title}</p>
            <p style="font-size:13px; color:${MUTED}; margin:0;">${escapeHtml(desc)}</p>
          </td>
        </tr></table>
      </td>
    </tr>`).join("");
  const content = `
              <p style="font-size:11px; color:${ORANGE}; font-family:${FONT_MONO}; text-transform:uppercase; letter-spacing:0.15em; margin:0 0 8px 0;">Bienvenido a DROP.</p>
              <p style="font-size:24px; font-weight:700; color:${INK}; margin:0 0 20px 0; line-height:1.2;">
                Hola ${escapeHtml(djArtistName)},<br>estás dentro.
              </p>
              <p style="font-size:15px; color:${MUTED}; margin:0 0 24px 0;">
                Tu cuenta está aprobada. Sigue estos 5 pasos para empezar a recibir bookings:
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
                ${pasosHtml}
              </table>
              <p style="margin:0 0 24px 0;">${ctaButton("Completar mi perfil", dashboardUrl)}</p>
              <p style="font-size:15px; margin:0;">
                Cualquier duda, responde este email.<br>
                DROP<span style="color:${ORANGE};">.</span> Team
              </p>`;
  return wrapEmail({
    title: "Tu acceso a DROP. está listo — 5 pasos para empezar",
    preheader: "Cuenta aprobada. Completa tu perfil y empieza a recibir bookings.",
    content,
    footerReason: "Recibes este mensaje porque tu solicitud a DROP. fue aprobada (dropgigs.com).",
  });
}


export function djOnboardingEmailText(input: {
  djArtistName: string;
  dashboardUrl: string;
  pressKitUrl: string;
}): string {
  const { djArtistName, dashboardUrl, pressKitUrl } = input;
  return [
    `Hola ${djArtistName}, estás dentro.`,
    "",
    "Tu cuenta está aprobada. 5 pasos para empezar:",
    "",
    "01. Sube tu foto — la primera impresión lo es todo.",
    "02. Escribe tu bio — cuéntale a los bookers tu estilo.",
    "03. Agrega géneros y ciudad — para aparecer en búsquedas.",
    `04. Configura tu URL — quedará: ${pressKitUrl}`,
    "05. Comparte tu press kit — agrégalo a tu bio de IG.",
    "",
    `Completar mi perfil: ${dashboardUrl}`,
    "",
    "Cualquier duda, responde este email.",
    "--",
    "DROP. Team (dropgigs.com).",
  ].join("\n");
}


// ---------------------------------------------------------------------------
// 33. DJ hito 10 bookings — felicitación por milestone
// ---------------------------------------------------------------------------

export function djHito10BookingsEmailHtml(input: {
  djName: string;
  profileUrl: string;
}): string {
  const { djName, profileUrl } = input;
  const content = `
              <p style="font-size:16px; margin:0 0 20px 0;">Hola ${escapeHtml(djName)},</p>
              <div style="text-align:center; margin:0 0 32px 0;">
                <p style="font-size:48px; margin:0 0 8px 0; line-height:1;">🎉</p>
                <p style="font-size:22px; font-weight:700; color:${INK}; margin:0; letter-spacing:-0.02em;">
                  10 bookings recibidos
                </p>
              </div>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Acabas de alcanzar un hito real. Tu perfil en DROP. ha generado
                <strong>10 solicitudes de booking</strong> — lo que significa que hay gente
                que te busca, te encuentra y quiere trabajar contigo.
              </p>
              <div style="background:${CREAM}; border-radius:6px; padding:16px 20px; margin:0 0 24px 0; border-left:3px solid ${ORANGE};">
                <p style="font-size:14px; color:${INK}; margin:0;">
                  Un perfil completo con fotos, géneros y audio samples convierte
                  hasta <strong>3× más</strong> que uno sin contenido. Sigue sumando.
                </p>
              </div>
              <p style="font-size:14px; color:${MUTED}; margin:0 0 24px 0;">
                Revisa tu inbox — puede que haya solicitudes nuevas esperando respuesta.
              </p>
              <p style="margin:0 0 28px 0;">${ctaButton("Ver mi perfil", profileUrl)}</p>
              <p style="font-size:15px; margin:0;">DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: "10 bookings. Un hito real.",
    preheader: "Tu perfil generó 10 solicitudes. Así se construye una carrera.",
    content,
    footerReason: "Recibes este mensaje porque eres DJ en DROP. (dropgigs.com).",
  });
}


export function djHito10BookingsEmailText(input: {
  djName: string;
  profileUrl: string;
}): string {
  const { djName, profileUrl } = input;
  return [
    `Hola ${djName},`,
    "",
    "🎉 10 bookings recibidos",
    "",
    "Acabas de alcanzar un hito real. Tu perfil en DROP. ha generado 10 solicitudes de booking",
    "— lo que significa que hay gente que te busca, te encuentra y quiere trabajar contigo.",
    "",
    "Un perfil completo convierte hasta 3× más que uno sin contenido. Sigue sumando.",
    "",
    "Revisa tu inbox — puede que haya solicitudes nuevas esperando respuesta.",
    "",
    `Ver mi perfil: ${profileUrl}`,
    "",
    "--",
    "Recibes este mensaje porque eres DJ en DROP. (dropgigs.com).",
  ].join("\n");
}
