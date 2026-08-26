"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import type { Assignment, Site, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [kwOpen, setKwOpen] = useState<Site | null>(null);
  const [siteForm, setSiteForm] = useState({ name: "", url: "", notes: "" });
  const [keyword, setKeyword] = useState("");

  const [date, setDate] = useState(today());
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [unscheduled, setUnscheduled] = useState<{ id: number; unique_id: string; name: string }[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [rows, setRows] = useState([{ site_id: "", keyword_id: "", target_clicks: "" }]);

  async function loadSites() {
    const res = await api<{ data: Site[] }>("/sites");
    setSites(res.data);
  }

  async function loadAssignments() {
    const res = await api<{ data: Assignment[]; unscheduled: typeof unscheduled }>(`/assignments?date=${date}`);
    setAssignments(res.data);
    setUnscheduled(res.unscheduled || []);
  }

  useEffect(() => {
    loadSites().catch((e) => toast.error(errorMessage(e)));
    api<{ data: User[] }>("/employees").then((r) => setEmployees(r.data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    loadAssignments().catch((e) => toast.error(errorMessage(e)));
  }, [date]);

  async function saveSite() {
    try {
      await api("/sites", { method: "POST", body: JSON.stringify(siteForm) });
      toast.success("Site added");
      setSiteOpen(false);
      setSiteForm({ name: "", url: "", notes: "" });
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
          target_clicks: r.target_clicks ? Number(r.target_clicks) : null,
        }));
      await api("/assignments", {
        method: "POST",
        body: JSON.stringify({ employee_id: Number(employeeId), work_date: date, items }),
      });
      toast.success("Work assigned");
      setAssignOpen(false);
      setRows([{ site_id: "", keyword_id: "", target_clicks: "" }]);
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
                setRows([{ site_id: "", keyword_id: "", target_clicks: "" }]);
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
                <TableHead>Target</TableHead>
                <TableHead>Reported</TableHead>
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
                  <TableCell>{a.target_clicks ?? "—"}</TableCell>
                  <TableCell>{a.report?.click_count ?? "—"}</TableCell>
                  <TableCell>{a.is_auto_copied ? "Auto" : "Manual"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" onClick={() => removeAssignment(a.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="sites" className="space-y-4 mt-4">
        <div className="flex justify-end">
          <Button onClick={() => setSiteOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="w-4 h-4" /> Add site
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {sites.map((site) => (
            <div key={site.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold">{site.name}</h3>
                  <p className="text-xs text-muted-foreground break-all">{site.url}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setKeyword(""); setKwOpen(site); }}>
                  + Keyword
                </Button>
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

      <Dialog open={siteOpen} onOpenChange={setSiteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add site</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={siteForm.name} onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>URL</Label>
              <Input value={siteForm.url} onChange={(e) => setSiteForm({ ...siteForm, url: e.target.value })} placeholder="https://" />
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
                <div key={i} className="grid grid-cols-3 gap-2">
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
                  <Input
                    type="number"
                    placeholder="Target"
                    value={row.target_clicks}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...next[i], target_clicks: e.target.value };
                      setRows(next);
                    }}
                  />
                </div>
              );
            })}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRows([...rows, { site_id: "", keyword_id: "", target_clicks: "" }])}
            >
              Add another site
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={saveAssign} className="bg-accent text-accent-foreground hover:bg-accent/90">Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
