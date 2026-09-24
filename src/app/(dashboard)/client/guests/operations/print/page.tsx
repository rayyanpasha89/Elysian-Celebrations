import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintEventBookButton } from "@/components/dashboard/print-event-book-button";
import { getClientProfileId } from "@/lib/guest-access";
import { loadGuestOperationsManifest } from "@/lib/guest-operations-export";
import { requirePortalPageRole } from "@/lib/portal-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function list(values: string[]) {
  if (values.length === 0) return "Not mapped";
  return values.join("\n");
}

export default async function GuestOperationsPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ weddingId?: string }>;
}) {
  const { weddingId = "" } = await searchParams;
  const session = await requirePortalPageRole(
    `/client/guests/operations/print?weddingId=${encodeURIComponent(weddingId)}`,
    "client"
  );
  const supabase = createAdminSupabaseClient();
  const profileId = await getClientProfileId(supabase, session.userId);
  if (!profileId || !weddingId) notFound();

  const manifest = await loadGuestOperationsManifest(supabase, weddingId, profileId);
  if (!manifest) notFound();

  const generatedAt = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  return (
    <div className="event-book-print mx-auto max-w-[297mm] bg-white p-5 text-charcoal md:p-8">
      <div className="event-book-screen-actions mb-5 flex flex-wrap items-center justify-between gap-3 border border-charcoal/10 bg-cream p-4">
        <Link
          href="/client/guests"
          className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate hover:text-charcoal"
        >
          Back to Guest Studio
        </Link>
        <PrintEventBookButton />
      </div>

      <header className="border-[3px] border-charcoal-brown p-7">
        <p className="font-accent text-[9px] uppercase tracking-[0.24em] text-saddle-brown">
          Elysian · Privacy-safe field manifest
        </p>
        <h1 className="mt-3 font-display text-4xl text-charcoal-brown">
          {manifest.event.name}
        </h1>
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 font-heading text-sm text-dusty-olive">
          <span>{manifest.rows.length} guests</span>
          <span>Generated {generatedAt}</span>
          <span>Contacts, booking references, identity data, and private notes excluded</span>
        </div>
      </header>

      <section className="mt-6 overflow-hidden border border-charcoal/15">
        <table className="w-full border-collapse text-left text-[10px] leading-4">
          <thead className="bg-charcoal-brown text-ivory">
            <tr>
              {[
                "Guest",
                "Status",
                "Travel",
                "Room",
                "Transfer",
                "Care",
              ].map((heading) => (
                <th key={heading} className="border-r border-ivory/15 p-2 font-accent uppercase tracking-[0.12em] last:border-r-0">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {manifest.rows.map((row) => (
              <tr key={`${row.guestName}-${row.hostGroup}`} className="break-inside-avoid border-t border-charcoal/10 align-top">
                <td className="p-2">
                  <strong className="font-heading text-xs">{row.guestName}</strong>
                  <span className="mt-1 block text-slate">{row.hostGroup} · {row.priority}</span>
                  <span className="block text-slate">{row.household} · {row.relationship}</span>
                </td>
                <td className="whitespace-pre-line p-2">{row.rsvp}\n{row.invitation}\nOwner: {row.owner}</td>
                <td className="whitespace-pre-line p-2">{list(row.travel)}</td>
                <td className="whitespace-pre-line p-2">{list(row.stays)}</td>
                <td className="whitespace-pre-line p-2">{list(row.transfers)}</td>
                <td className="whitespace-pre-line p-2">{list(row.care)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {manifest.rows.length === 0 ? (
          <p className="p-8 text-center font-heading text-sm text-slate">
            No guests have been added to this event yet.
          </p>
        ) : null}
      </section>
    </div>
  );
}
