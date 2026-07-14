"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import {
  MessageCircle,
  Mail,
  Instagram,
  ExternalLink,
  X,
  Send,
} from "lucide-react";
import {
  CAMPAIGN_CONTACT_STATUS,
  CAMPAIGN_CONTACT_STATUS_LABELS,
  CONTACT_TYPE_LABELS,
  type CampaignContact,
  type CampaignContactStatus,
  type CampaignChannel,
  type DjProfile,
  type ContactType,
} from "@/types/database";
import {
  updateCampaignContactStatusAction,
  removeCampaignContactAction,
} from "../actions";
import { whatsappLink, dateTime, scoreColor } from "@/lib/format";
import { resolveTemplate, buildVars } from "@/lib/templates/variables";

type ContactRow = CampaignContact & {
  contact_name: string;
  contact_type: string;
  contact_whatsapp: string;
  contact_email: string;
  contact_instagram: string;
  contact_score: number;
};

interface Props {
  row: ContactRow;
  campaignId: string;
  isFirst: boolean;
  templateBody: string;
  templateSubject: string;
  campaignMessage: string;
  campaignChannel: CampaignChannel;
  djProfile: DjProfile | null;
  baseUrl: string;
}

export function CampaignContactRow({
  row,
  campaignId,
  isFirst,
  templateBody,
  templateSubject,
  campaignMessage,
  campaignChannel,
  djProfile,
  baseUrl,
}: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const sc = scoreColor(row.contact_score);

  const aviso = (msg: string) =>
    confirm({ title: "Aviso", message: msg, confirmLabel: "Entendido", hideCancel: true });

  // Resolver mensaje (plantilla o mensaje base) con variables
  const vars = buildVars(
    {
      // Pseudo-contact con solo lo que necesitamos para template vars
      // (no es un Contact completo, pero buildVars solo usa estos campos)
      name: row.contact_name,
      contact_person: "",
      city: "",
      country: "Chile",
      type: row.contact_type as ContactType,
      email: row.contact_email,
      whatsapp: row.contact_whatsapp,
      instagram: row.contact_instagram,
      contact_role: "",
      music_style: "",
    } as never,
    djProfile,
    baseUrl
  );
  const bodyTemplate = templateBody || campaignMessage;
  const resolved = bodyTemplate
    ? resolveTemplate(bodyTemplate, vars).text
    : "";

  function changeStatus(newStatus: CampaignContactStatus) {
    startTransition(async () => {
      await updateCampaignContactStatusAction(row.id, campaignId, newStatus);
      router.refresh();
    });
  }

  async function removeFromCampaign() {
    const { ok } = await confirm({
      title: "¿Quitar este contacto de la campaña?",
      variant: "warning",
      confirmLabel: "Quitar",
    });
    if (!ok) return;
    startTransition(async () => {
      await removeCampaignContactAction(row.id, campaignId);
      router.refresh();
    });
  }

  function openWhatsApp() {
    const wa = whatsappLink(row.contact_whatsapp, resolved);
    if (!wa) {
      void aviso("Este contacto no tiene WhatsApp.");
      return;
    }
    // Cambia status a enviado si estaba pendiente o preparado
    if (row.status === "pendiente" || row.status === "preparado") {
      void updateCampaignContactStatusAction(row.id, campaignId, "enviado")
        .then(() => router.refresh())
        .catch((e) =>
          console.error("auto-marcar 'enviado' falló:", e)
        );
    }
    window.open(wa, "_blank");
  }

  function openEmail() {
    if (!row.contact_email) {
      void aviso("Este contacto no tiene email.");
      return;
    }
    const subj = templateSubject
      ? resolveTemplate(templateSubject, vars).text
      : `Hola desde ${djProfile?.artist_name || "JAY PORTU"}`;
    const url = `mailto:${row.contact_email}?subject=${encodeURIComponent(
      subj
    )}&body=${encodeURIComponent(resolved)}`;
    if (row.status === "pendiente" || row.status === "preparado") {
      void updateCampaignContactStatusAction(row.id, campaignId, "enviado")
        .then(() => router.refresh())
        .catch((e) =>
          console.error("auto-marcar 'enviado' falló:", e)
        );
    }
    window.location.href = url;
  }

  function openInstagram() {
    const handle = row.contact_instagram
      .replace(/^@/, "")
      .replace(/^https?:\/\/(www\.)?instagram\.com\//, "");
    if (!handle) {
      void aviso("Este contacto no tiene Instagram.");
      return;
    }
    window.open(`https://instagram.com/${handle}`, "_blank");
  }

  return (
    <li
      className={`flex items-center gap-3 px-4 py-3 ${
        !isFirst ? "border-t border-border" : ""
      } hover:bg-bg-subtle transition-colors flex-wrap`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/crm/${row.contact_id}`}
            className="text-sm font-semibold hover:text-accent transition-colors truncate"
          >
            {row.contact_name}
          </Link>
          <span
            className={`inline-flex items-center rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${sc.bg} ${sc.text}`}
          >
            {row.contact_score}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            {CONTACT_TYPE_LABELS[row.contact_type as ContactType]}
          </span>
        </div>
        <div className="text-[11px] text-fg-subtle mt-0.5">
          {row.contacted_at && <>Enviado {dateTime(row.contacted_at)} · </>}
          {row.response_at && <>Respondió {dateTime(row.response_at)} · </>}
          {!row.contacted_at && !row.response_at && "Sin actividad aún"}
        </div>
      </div>

      <SelectNative
        aria-label={`Estado de ${row.contact_name}`}
        value={row.status}
        disabled={isPending}
        onChange={(e) => changeStatus(e.target.value as CampaignContactStatus)}
        className="w-44 text-xs"
      >
        {CAMPAIGN_CONTACT_STATUS.map((s) => (
          <option key={s} value={s}>
            {CAMPAIGN_CONTACT_STATUS_LABELS[s]}
          </option>
        ))}
      </SelectNative>

      <div className="flex gap-1 shrink-0">
        {row.contact_whatsapp && (campaignChannel === "whatsapp" || campaignChannel === "mixto") && (
          <Button
            onClick={openWhatsApp}
            size="sm"
            variant="clay"
            title="Abrir WhatsApp con mensaje"
          >
            <MessageCircle className="w-4 h-4" />
            <Send className="w-3 h-3" />
          </Button>
        )}
        {row.contact_email && (campaignChannel === "email" || campaignChannel === "mixto") && (
          <Button onClick={openEmail} size="sm" variant="clay" title="Email">
            <Mail className="w-4 h-4" />
          </Button>
        )}
        {row.contact_instagram && (campaignChannel === "instagram" || campaignChannel === "mixto") && (
          <Button
            onClick={openInstagram}
            size="sm"
            variant="clay"
            title="Instagram"
          >
            <Instagram className="w-4 h-4" />
          </Button>
        )}
        <Button asChild size="sm" variant="clay" title="Ver ficha">
          <Link href={`/crm/${row.contact_id}`}>
            <ExternalLink className="w-4 h-4" />
          </Link>
        </Button>
        <Button
          onClick={removeFromCampaign}
          size="sm"
          variant="clay"
          className="text-danger"
          disabled={isPending}
          title="Quitar de la campaña"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </li>
  );
}
