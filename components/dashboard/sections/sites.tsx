"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import type { Assignment, Keyword, Site, User } from "@/lib/types";
import { directoryEmployees } from "@/lib/employee-order";
import { SiteMark, siteDomain, siteHref } from "@/components/dashboard/site-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function SitesSection() {
  const [sites, setSites] = useState<Site[]>([]);
  const [siteOpen, setSiteOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [viewingSite, setViewingSite] = useState<Site | null>(null);
  const [kwOpen, setKwOpen] = useState<Site | null>(null);
  const [siteForm, setSiteForm] = useState({ name: "", url: "", notes: "" });
  const [keyword, setKeyword] = useState("");
  const [editingKeyword, setEditingKeyword] = useState<Keyword | null>(null);
  const [keywordText, setKeywordText] = useState("");

  const [date, setDate] = useState(today());
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [unscheduled, setUnscheduled] = useState<{ id: number; unique_id: string; name: string }[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [rows, setRows] = useState([{ site_id: "", keyword_id: "" }]);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [editEmployeeId, setEditEmployeeId] = useState("");
  const [editSiteId, setEditSiteId] = useState("");
  const [editKeywordId, setEditKeywordId] = useState("");

  async function loadSites() {
    const res = await api<{ data: Site[] }>("/sites");
    setSites(res.data);
    setViewingSite((current) => (current ? res.data.find((s) => s.id === current.id) ?? null : null));
  }

  async function loadAssignments() {
    const res = await api<{ data: Assignment[]; unscheduled: typeof unscheduled }>(`/assignments?date=${date}`);
    setAssignments(res.data);
    setUnscheduled(res.unscheduled || []);
  }

  useEffect(() => {
    loadSites().catch((e) => toast.error(errorMessage(e)));
    api<{ data: User[] }>("/employees").then((r) => setEmployees(directoryEmployees(r.data ?? []))).catch(() => undefined);
  }, []);

  useEffect(() => {
    loadAssignments().catch((e) => toast.error(errorMessage(e)));
  }, [date]);

  function openCreateSite() {
    setEditingSite(null);
    setSiteForm({ name: "", url: "", notes: "" });
    setSiteOpen(true);
  }

  function openEditSite(site: Site) {
    setViewingSite(null);
    setEditingSite(site);
    setSiteForm({ name: site.name || "", url: site.url || "", notes: site.notes || "" });
    setSiteOpen(true);
  }

  async function saveSite() {
    try {
      if (editingSite) {
        await api(`/sites/${editingSite.id}`, { method: "PUT", body: JSON.stringify(siteForm) });
        toast.success("Site updated");
      } else {
        await api("/sites", { method: "POST", body: JSON.stringify(siteForm) });
        toast.success("Site added");
      }
      setSiteOpen(false);
      setEditingSite(null);
      setSiteForm({ name: "", url: "", notes: "" });
      await loadSites();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function removeKeyword(id: number) {
    try {
      await api(`/keywords/${id}`, { method: "DELETE" });
      toast.success("Keyword removed");
      await loadSites();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function saveKeywordEdit() {
    if (!editingKeyword) return;
    try {
      await api(`/keywords/${editingKeyword.id}`, {
        method: "PUT",
        body: JSON.stringify({ keyword: keywordText.trim() }),
      });
      toast.success("Keyword updated");
      setEditingKeyword(null);
      setKeywordText("");
      await loadSites();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function addKeyword() {
    if (!kwOpen) return;
    try {
      await api(`/sites/${kwOpen.id}/keywords`, {
        method: "POST",
        body: JSON.stringify({ keyword }),
      });
      toast.success("Keyword added");
      setKeyword("");
      setKwOpen(null);
      await loadSites();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function copyYesterday() {
    try {
      const res = await api<{ message: string; copied: number }>("/assignments/copy-yesterday", {
        method: "POST",
        body: JSON.stringify({ date }),
      });
      toast.success(res.message);
      await loadAssignments();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function saveAssign() {
    try {
      const items = rows
        .filter((r) => r.site_id && r.keyword_id)
        .map((r) => ({
          site_id: Number(r.site_id),
          keyword_id: Number(r.keyword_id),
        }));
      await api("/assignments", {
        method: "POST",
        body: JSON.stringify({ employee_id: Number(employeeId), work_date: date, items }),
      });
      toast.success("Work assigned");
      setAssignOpen(false);
      setRows([{ site_id: "", keyword_id: "" }]);
      await loadAssignments();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function removeAssignment(id: number) {
    try {
      await api(`/assignments/${id}`, { method: "DELETE" });
      await loadAssignments();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  function openEdit(assignment: Assignment) {
    setEditing(assignment);
    setEditEmployeeId(String(assignment.employee_id));
    setEditSiteId(String(assignment.site_id));
    setEditKeywordId(String(assignment.keyword_id));
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      await api(`/assignments/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify({
          employee_id: Number(editEmployeeId),
          site_id: Number(editSiteId),
          keyword_id: Number(editKeywordId),
        }),
      });
      toast.success("Assignment updated");
      setEditOpen(false);
      setEditing(null);
      await loadAssignments();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const joined = useMemo(
    () => employees.filter((e) => e.role === "employee" && e.status === "joined"),
    [employees]
  );

  return (
    <Tabs defaultValue="schedule">
      <TabsList>
        <TabsTrigger value="schedule">Schedule</TabsTrigger>
        <TabsTrigger value="sites">Sites & keywords</TabsTrigger>
      </TabsList>

      <TabsContent value="schedule" className="space-y-4 mt-4">
        <div className="flex flex-wrap gap-3 items-end justify-between">
          <div className="space-y-1.5">
            <Label>Work date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={copyYesterday}>
              Copy yesterday
            </Button>
            <Button
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => {
                setEmployeeId("");
                setRows([{ site_id: "", keyword_id: "" }]);
                setAssignOpen(true);
              }}
            >
              <Plus className="w-4 h-4" /> Assign work
            </Button>
          </div>
        </div>

        {unscheduled.length > 0 ? (
          <p className="text-sm text-warning">
            Unscheduled: {unscheduled.map((u) => `${u.name} (${u.unique_id})`).join(", ")}
          </p>
        ) : null}

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Keyword</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Source</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    {a.employee.name}
                    <div className="text-xs text-muted-foreground">{a.employee.unique_id}</div>
                  </TableCell>
                  <TableCell>{a.site.name}</TableCell>
                  <TableCell>{a.keyword}</TableCell>
                  <TableCell>{a.report?.click_count ?? "—"}</TableCell>
                  <TableCell>{a.is_auto_copied ? "Auto" : "Manual"}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(a)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => removeAssignment(a.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="sites" className="space-y-4 mt-4">
        <div className="flex justify-end">
          <Button onClick={openCreateSite} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="w-4 h-4" /> Add site
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {sites.map((site) => (
            <div key={site.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-start gap-3 min-w-0">
                  <SiteMark domain={site.domain || siteDomain(site.url)} favicon={site.favicon_url} name={site.name} />
                  <div className="min-w-0">
                    <h3 className="font-semibold leading-tight">{site.domain || siteDomain(site.url) || site.name}</h3>
                    {site.name && site.name.toLowerCase() !== (site.domain || siteDomain(site.url) || "").toLowerCase() ? (
                      <p className="text-xs text-muted-foreground truncate">{site.name}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground break-all">{site.url}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setViewingSite(site)}>
                    <Eye className="w-4 h-4" />
                    View
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEditSite(site)}>
                    <Pencil className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setKeyword(""); setKwOpen(site); }}>
                    + Keyword
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {site.keywords.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No keywords yet</span>
                ) : (
                  site.keywords.map((k) => (
                    <span key={k.id} className="text-xs px-2 py-1 rounded-md bg-secondary">
                      {k.keyword}
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </TabsContent>

      <Dialog open={siteOpen} onOpenChange={(open) => { setSiteOpen(open); if (!open) setEditingSite(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingSite ? "Edit site" : "Add site"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={siteForm.name} onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>URL</Label>
              <Input value={siteForm.url} onChange={(e) => setSiteForm({ ...siteForm, url: e.target.value })} placeholder="https://soundbuttons.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={siteForm.notes} onChange={(e) => setSiteForm({ ...siteForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveSite} className="bg-accent text-accent-foreground hover:bg-accent/90">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!kwOpen} onOpenChange={() => setKwOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Keyword for {kwOpen?.name}</DialogTitle></DialogHeader>
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="search phrase" />
          <DialogFooter>
            <Button onClick={addKeyword} className="bg-accent text-accent-foreground hover:bg-accent/90">Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewingSite)} onOpenChange={(open) => { if (!open) setViewingSite(null); }}>
        <DialogContent className="max-w-lg">
          {viewingSite ? (
            <>
              <DialogHeader>
                <DialogTitle>Site details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <SiteMark
                    domain={viewingSite.domain || siteDomain(viewingSite.url)}
                    favicon={viewingSite.favicon_url}
                    name={viewingSite.name}
                  />
                  <div className="min-w-0">
                    <div className="font-semibold leading-tight">
                      {viewingSite.domain || siteDomain(viewingSite.url) || viewingSite.name}
                    </div>
                    {viewingSite.name ? (
                      <p className="text-sm text-muted-foreground">{viewingSite.name}</p>
                    ) : null}
                    {siteHref(viewingSite.url) ? (
                      <a
                        href={siteHref(viewingSite.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-accent break-all hover:underline"
                      >
                        {viewingSite.url}
                      </a>
                    ) : null}
                  </div>
                </div>
                {viewingSite.notes ? (
                  <p className="text-sm whitespace-pre-wrap">{viewingSite.notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No notes.</p>
                )}
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Keywords</div>
                  {viewingSite.keywords.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No keywords yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {viewingSite.keywords.map((k) => (
                        <span key={k.id} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-secondary">
                          {k.keyword}
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setEditingKeyword(k);
                              setKeywordText(k.keyword);
                            }}
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => removeKeyword(k.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setKeyword("");
                    setKwOpen(viewingSite);
                  }}
                >
                  + Keyword
                </Button>
                <Button
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={() => openEditSite(viewingSite)}
                >
                  Edit site
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingKeyword)} onOpenChange={(open) => { if (!open) setEditingKeyword(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit keyword</DialogTitle></DialogHeader>
          <Input value={keywordText} onChange={(e) => setKeywordText(e.target.value)} />
          <DialogFooter>
            <Button onClick={saveKeywordEdit} className="bg-accent text-accent-foreground hover:bg-accent/90">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Assign work for {date}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger><SelectValue placeholder="Employee" /></SelectTrigger>
              <SelectContent>
                {joined.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>{e.name} ({e.unique_id})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {rows.map((row, i) => {
              const site = sites.find((s) => String(s.id) === row.site_id);
              return (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <Select
                    value={row.site_id}
                    onValueChange={(v) => {
                      const next = [...rows];
                      next[i] = { ...next[i], site_id: v, keyword_id: "" };
                      setRows(next);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Site" /></SelectTrigger>
                    <SelectContent>
                      {sites.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={row.keyword_id}
                    onValueChange={(v) => {
                      const next = [...rows];
                      next[i] = { ...next[i], keyword_id: v };
                      setRows(next);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Keyword" /></SelectTrigger>
                    <SelectContent>
                      {(site?.keywords || []).map((k) => (
                        <SelectItem key={k.id} value={String(k.id)}>{k.keyword}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRows([...rows, { site_id: "", keyword_id: "" }])}
            >
              Add another site
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={saveAssign} className="bg-accent text-accent-foreground hover:bg-accent/90">Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select value={editEmployeeId} onValueChange={setEditEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Employee" /></SelectTrigger>
                <SelectContent>
                  {joined.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.name} ({e.unique_id})</SelectItem>
                  ))}
                  {editing && !joined.some((e) => e.id === editing.employee_id) ? (
                    <SelectItem value={String(editing.employee_id)}>
                      {editing.employee.name} ({editing.employee.unique_id})
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Site</Label>
              <Select
                value={editSiteId}
                onValueChange={(v) => {
                  setEditSiteId(v);
                  const site = sites.find((s) => String(s.id) === v);
                  const keep = site?.keywords.some((k) => String(k.id) === editKeywordId);
                  if (!keep) setEditKeywordId("");
                }}
              >
                <SelectTrigger><SelectValue placeholder="Site" /></SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Keyword</Label>
              <Select value={editKeywordId} onValueChange={setEditKeywordId}>
                <SelectTrigger><SelectValue placeholder="Keyword" /></SelectTrigger>
                <SelectContent>
                  {(sites.find((s) => String(s.id) === editSiteId)?.keywords || []).map((k) => (
                    <SelectItem key={k.id} value={String(k.id)}>{k.keyword}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveEdit} className="bg-accent text-accent-foreground hover:bg-accent/90">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
