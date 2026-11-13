import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { RefreshCw, Mail, Phone } from "lucide-react";
import { listWebsiteLeads } from "@/lib/leads.functions";
import { PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const leadsOptions = queryOptions({ queryKey: ["website-leads"], queryFn: () => listWebsiteLeads(), refetchInterval: 60000 });

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({ meta: [{ title: "Website leads — HIMGIRI Warehouse" }, { name: "description", content: "Website enquiries for HIMGIRI product managers." }, { property: "og:title", content: "Website leads — HIMGIRI Warehouse" }, { property: "og:description", content: "Website enquiries for HIMGIRI product managers." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(leadsOptions),
  component: Leads,
  errorComponent: () => <div role="alert" className="py-8"><h1 className="text-2xl font-bold">Website leads unavailable</h1><p className="mt-2 text-muted-foreground">Only managers can view enquiries. If you are a manager, try reloading this page.</p><Button className="mt-4" variant="outline" onClick={() => window.location.reload()}><RefreshCw /> Reload</Button></div>,
});

function Leads() {
  const { data, refetch, isFetching } = useSuspenseQuery(leadsOptions);
  const [search, setSearch] = useState("");
  const leads = data.leads.filter((lead) => [lead.name, lead.email, lead.phone, lead.message, lead.product].join(" ").toLowerCase().includes(search.toLowerCase()));
  return <div>
    <PageHeader title="Website leads" subtitle="himgiriladders.in" actions={<Button variant="outline" size="icon" aria-label="Refresh website leads" disabled={isFetching} onClick={() => refetch()}><RefreshCw className={isFetching ? "animate-spin" : ""} /></Button>} />
    <div className="mb-5 border-y py-4"><p className={`font-semibold ${data.configured ? "text-success" : "text-warning"}`}>{data.configured ? "Lead receiver ready" : "Website connection pending"}</p>{!data.configured && <p className="mt-1 text-sm text-muted-foreground">Website form delivery has not been connected yet.</p>}</div>
    <Input aria-label="Search website leads" placeholder="Search enquiries" value={search} onChange={(event) => setSearch(event.target.value)} className="mb-5 max-w-lg" />
    <p className="mb-3 text-sm text-muted-foreground">Latest {data.leads.length} enquiries</p>
    {leads.length === 0 ? <p className="border-y py-8 text-muted-foreground">{search ? "No matching enquiries." : "No website enquiries received yet."}</p> : <div className="divide-y border-y">{leads.map((lead) => <article key={lead.id} className="py-5">
      <div className="flex flex-wrap justify-between gap-2"><h2 className="break-words text-lg font-bold">{lead.name}</h2><time className="text-sm text-muted-foreground">{new Date(lead.created_at).toLocaleString("en-IN")}</time></div>
      {lead.product && <p className="mt-1 font-semibold text-primary">{lead.product}</p>}
      <p className="mt-2 whitespace-pre-wrap break-words">{lead.message}</p>
      <div className="mt-3 flex flex-wrap gap-4 text-sm">{lead.email && <a href={`mailto:${encodeURIComponent(lead.email)}`} className="flex min-w-0 items-center gap-2 text-primary hover:underline"><Mail className="size-4 shrink-0" /><span className="break-all">{lead.email}</span></a>}{lead.phone && <a href={`tel:${lead.phone.replace(/[^+\d]/g, "")}`} className="flex items-center gap-2 text-primary hover:underline"><Phone className="size-4" />{lead.phone}</a>}</div>
    </article>)}</div>}
  </div>;
}