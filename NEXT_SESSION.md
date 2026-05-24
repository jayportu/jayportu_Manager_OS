# Prompt para próxima sesión — JAY Manager OS

Copiá y pegá lo siguiente como **primer mensaje** de la próxima sesión con Claude para que arranque con todo el contexto.

---

```
Sesión dedicada a JAY Manager OS — NO mezclar con POSreach.

# Contexto
Soy Jaime (DJ "JAY PORTU"). Trabajamos en mi web app personal para gestionar mi carrera. Stack Next.js 14 + Supabase + Vercel + Ollama, costo $0. Repo: github.com/jayportu/jayportu_Manager_OS. Producción: https://jayportu-manager-os.vercel.app. Dev local en :3010. Working dir: /Users/jayportu/Desktop/jayportu_Manager_OS

Soy chileno — tuteo chileno ("tú/tienes/puedes/quieres"), NUNCA voseo argentino ("vos/tenés/podés/querés"). Sin modismos.

# Estado actual (al cierre 23-may-2026)
Sprints 0-17 cerrados y deployados. Último commit en main: presskit dual + admin role + YouTube auto-sync + onboarding wizard + PWA push + backups semanales + todo lo anterior. La app funciona end-to-end en prod.

Hoy también creamos JAY_Manager_OS_funcionalidades.pptx (presentación para mostrar lo que tiene la app, sin tecnicismos, sin invitaciones personales).

# Mis pendientes (no del código)
1. Probar push notifications en iPhone end-to-end (instalar PWA, activar push, enviar prueba)
2. Decidir si arrancamos Sprint 18 o cambiamos prioridad
3. (Opcional) Rotar el PAT que pegué en chat de sesiones anteriores — NO insistir si digo que no

# Roadmap pendiente (orden actual)
- Sprint 18 · Campañas crecimiento + Ads tracker (Meta/Google Ads tracking, ROI por campaña)
- Sprint 19 · CRM avanzado (financiero + tags + notas privadas + follow-ups recurrentes)
- Sprint 20 · Marketplace inicial (directorio público DJs + disponibilidad + inbox bookings)
- Sprint 21 · Operación del show (tech rider editor + tracklists post-show)
- Sprint 22 · IA en mails y bio (Ollama clasifica Gmail + bio adaptable)
- Sprint 22.5 · Instagram auto-sync vía Meta Graph API (pospuesto, evaluar más adelante)
- Sprint 23 · Música personal (biblioteca de tracks + wantlist)
- Sprint 24 ⚠ · Modelo de membresías + dominio propio + sitio legal (cuando MVP esté estable; modelo de cobro AÚN NO DEFINIDO — no asumir Stripe)

# Descartado explícito (no proponer)
- Spotify auto-sync
- Soundeo integration
- Automatización de posteo en redes
- WhatsApp automation / Baileys

# Memorias relevantes (leer si hace falta contexto)
- /Users/jayportu/.claude/projects/-Users-jayportu-Desktop-POSreach/memory/project_jay_manager_os.md
- project_jay_decisions.md (stack y decisiones)
- project_jay_roadmap_post_mvp.md (roadmap completo)
- project_jay_sprint_15_admin.md, project_jay_sprint_11_soundcloud.md
- feedback_my_tone_with_user.md (tuteo chileno)
- feedback_no_mix_apps.md (no mezclar con POSreach)
- feedback_git_accounts.md (cuenta jayportu, no Jay-Portu)
- feedback_brand_assets_jay.md (logos JAY PORTU, nunca AgendaPro)

Empezá saludando y preguntándome qué quiero atacar — si Sprint 18, si quiero hacer pulido/bugs, o si tengo otra prioridad. No asumas.
```

---

## Resumen de lo que cerramos hoy (23-may-2026)

- Fix crash growth + middleware cron SoundCloud
- Sprint 12 · Onboarding wizard /welcome
- Sprint 13 · PWA instalable + Push notifications
- Sprint 14 · Backups pg_dump semanales (Artifacts + repo privado)
- Sprint 15 · Backoffice + roles admin
- Sprint 16 · YouTube auto-sync
- Sprint 17 · Press kit dual (PDF subido o generado)
- Hotfix logos AgendaPro accidentales + safe-area iOS + nav links rotos
- Audit completo Sprint 0-17 (todo verde)
- PPT funcionalidades.pptx generada

**Último commit en main:** `9207106`

**URL producción:** https://jayportu-manager-os.vercel.app
**Backoffice (sólo tú):** https://jayportu-manager-os.vercel.app/admin
