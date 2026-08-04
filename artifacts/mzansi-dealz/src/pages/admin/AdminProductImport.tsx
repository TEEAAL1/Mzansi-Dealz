import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  apiUrl,
  downloadProductImportCsv,
  getDownloadProductImportCsvUrl,
  getGetLatestProductImportQueryKey,
  getGetProductImportQueryKey,
  useGetLatestProductImport,
  useGetProductImport,
  useImportProductRun,
  useRollbackProductImport,
  useStartProductImport,
} from "@workspace/api-client-react";
import type { ProductImportItem } from "@workspace/api-client-react";
import { AlertCircle, ArchiveRestore, CheckCircle2, CircleHelp, Download, FileSpreadsheet, ImageOff, Loader2, PackageCheck, PackageX, Play, RefreshCw, Search, ShieldCheck, Tag, Upload, X } from "lucide-react";
import { useAdminHeaders } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const DEFAULT_SOURCE_URL = "https://www.perfectdealz.co.za";
const ACTIVE_STATUSES = new Set(["queued", "pending", "crawling", "previewing", "importing", "processing", "running"]);

function isActiveStatus(status?: string | null) {
  return Boolean(status && ACTIVE_STATUSES.has(status.toLowerCase()));
}

function statusLabel(status?: string | null) {
  return (status || "not started").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function statusTone(status?: string | null) {
  const normalized = status?.toLowerCase();
  if (normalized === "completed" || normalized === "complete") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "failed" || normalized === "error") return "border-rose-200 bg-rose-50 text-rose-700";
  if (isActiveStatus(status)) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function MetricCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof PackageCheck; tone: string }) {
  return (
    <Card data-testid={`card-metric-${label.toLowerCase().replaceAll(" ", "-")}`} className="border-slate-200/80 shadow-sm">
      <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500" data-testid={`text-metric-label-${label.toLowerCase().replaceAll(" ", "-")}`}>{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950" data-testid={`text-metric-value-${label.toLowerCase().replaceAll(" ", "-")}`}>{value.toLocaleString("en-ZA")}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${tone}`} aria-hidden="true"><Icon className="h-5 w-5" /></div>
      </CardContent>
    </Card>
  );
}

function ImportLoading() {
  return (
    <div className="space-y-6" aria-label="Loading product import" data-testid="state-import-loading">
      <div className="space-y-2"><Skeleton className="h-9 w-72" /><Skeleton className="h-5 w-[30rem] max-w-full" /></div>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-28 rounded-xl" />)}</div>
      <Skeleton className="h-80 w-full rounded-2xl" />
    </div>
  );
}

export default function AdminProductImport() {
  const headers = useAdminHeaders();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [importImages, setImportImages] = useState(true);
  const [sourceUrl, setSourceUrl] = useState(DEFAULT_SOURCE_URL);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const latestQuery = useGetLatestProductImport({
    request: { headers },
    query: { queryKey: getGetLatestProductImportQueryKey(), refetchInterval: 5000 },
  });
  const latestRun = latestQuery.data?.run ?? null;

  useEffect(() => {
    if (latestRun && selectedRunId === null) setSelectedRunId(latestRun.id);
  }, [latestRun, selectedRunId]);

  const importQuery = useGetProductImport(selectedRunId ?? 0, {
    request: { headers },
    query: {
      enabled: Boolean(selectedRunId),
      queryKey: getGetProductImportQueryKey(selectedRunId ?? 0),
      refetchInterval: selectedRunId && isActiveStatus(latestRun?.status) ? 2500 : false,
    },
  });
  const run = importQuery.data?.run ?? latestRun;
  const items = importQuery.data?.items ?? [];
  const isBusy = isActiveStatus(run?.status);

  const startImport = useStartProductImport({ request: { headers } });
  const importRun = useImportProductRun({ request: { headers } });
  const rollbackRun = useRollbackProductImport({ request: { headers } });

  const metrics = useMemo(() => ({
    imported: run?.productsImported ?? 0,
    failed: run?.productsFailed ?? 0,
    images: run?.missingImages ?? items.filter((item) => item.missingImage).length,
    prices: run?.missingPrices ?? items.filter((item) => item.missingPrice).length,
  }), [items, run]);

  const refreshImport = () => {
    void queryClient.invalidateQueries({ queryKey: getGetLatestProductImportQueryKey() });
    if (selectedRunId) void queryClient.invalidateQueries({ queryKey: getGetProductImportQueryKey(selectedRunId) });
  };

  const handleStart = () => {
    if (!/^https:\/\/[^/]+\/?$/.test(sourceUrl.trim())) {
      toast({ title: "Invalid source URL", description: "Enter the HTTPS origin of a website you own or have permission to migrate, for example https://www.example.com.", variant: "destructive" });
      return;
    }
    startImport.mutate({
      data: { sourceUrl: sourceUrl.trim(), overwriteExisting, skipExisting: !overwriteExisting, importImages },
    }, {
      onSuccess: (response) => {
        setSelectedRunId(response.run.id);
        toast({ title: "Crawl started", description: "We are fetching the catalogue and preparing your preview." });
        refreshImport();
      },
      onError: () => toast({ title: "Could not start crawl", description: "Check the source and try again.", variant: "destructive" }),
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({ title: "Choose a CSV first", description: "Select your product CSV, then upload it for preview.", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("sourceUrl", sourceUrl.trim());
      formData.append("overwriteExisting", String(overwriteExisting));
      formData.append("importImages", String(importImages));
      const response = await fetch(apiUrl("/api/admin/product-import/upload-csv"), {
        method: "POST",
        credentials: "include",
        headers,
        body: formData,
      });
      const payload = await response.json() as { run?: { id: number }; message?: string; error?: string };
      if (!response.ok || !payload.run) throw new Error(payload.error || "CSV upload failed.");
      setSelectedRunId(payload.run.id);
      setSelectedFile(null);
      toast({ title: "CSV uploaded", description: payload.message || "Your active product preview is being prepared." });
      refreshImport();
    } catch (error) {
      toast({ title: "CSV upload failed", description: error instanceof Error ? error.message : "The CSV could not be uploaded.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleImport = () => {
    if (!run) return;
    importRun.mutate({ id: run.id }, {
      onSuccess: () => {
        toast({ title: "Import started", description: "Products are being written to your catalogue." });
        refreshImport();
      },
      onError: () => toast({ title: "Import could not start", description: "The preview may no longer be available. Refresh and try again.", variant: "destructive" }),
    });
  };

  const handleDownload = async () => {
    if (!run) return;
    setIsDownloading(true);
    try {
      const csv = await downloadProductImportCsv(run.id, { headers });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = "perfectdealz-products.csv";
      anchor.click();
      URL.revokeObjectURL(href);
      toast({ title: "CSV downloaded", description: "The latest preview has been saved to your device." });
    } catch {
      toast({ title: "Download failed", description: "The CSV could not be downloaded right now.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRollback = () => {
    if (!run) return;
    rollbackRun.mutate({ id: run.id }, {
      onSuccess: () => {
        toast({ title: "Import rolled back", description: "Products from this run have been removed." });
        refreshImport();
      },
      onError: () => toast({ title: "Rollback failed", description: "No products were changed. Try again.", variant: "destructive" }),
    });
  };

  if (latestQuery.isLoading && !latestQuery.data) return <ImportLoading />;

  if (latestQuery.isError && !latestQuery.data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center" data-testid="state-import-error">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-600" />
        <h1 className="mt-3 text-lg font-semibold text-rose-950">Import history is unavailable</h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-rose-800">We could not load the latest PerfectDealz run. Your catalogue is safe.</p>
        <Button onClick={() => latestQuery.refetch()} variant="outline" className="mt-5 border-rose-200 bg-white text-rose-800 hover:bg-rose-100" data-testid="button-retry-import"><RefreshCw className="mr-2 h-4 w-4" />Try again</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10" data-testid="page-admin-product-import">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><FileSpreadsheet className="h-4 w-4" />Catalogue operations</div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl" data-testid="text-page-title">Import products</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Bring a catalogue you own or have permission to migrate into MzansiDealz. Upload a CSV for the fastest path, or crawl a live store, review the preview, then import.</p>
        </div>
        {run && <div className="flex items-center gap-3 text-sm text-slate-500" data-testid="text-last-run"><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone(run.status)}`} data-testid="status-import-run">{statusLabel(run.status)}</span><span>Run #{run.id}</span></div>}
      </header>

      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm sm:p-6" data-testid="notice-source-ownership">
        <div className="absolute -right-10 -top-20 h-48 w-48 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-4">
            <div className="mt-0.5 rounded-xl bg-white/10 p-3"><ShieldCheck className="h-5 w-5 text-amber-300" /></div>
            <div>
              <p className="text-sm font-semibold">Use only authorised sources</p>
              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-300">Only migrate websites you own or have explicit permission to use. The importer accepts public HTTPS origins and blocks private/local network addresses.</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-slate-300"><Search className="h-3.5 w-3.5" />HTTPS source required</div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="border-slate-200/80 shadow-sm" data-testid="card-import-controls">
          <CardHeader className="border-b border-slate-100 pb-4"><CardTitle className="flex items-center gap-2 text-base"><Upload className="h-4 w-4 text-primary" />Upload or crawl catalogue</CardTitle><p className="text-sm font-normal text-slate-500">CSV uploads are prepared for preview and import as active products by default.</p></CardHeader>
          <CardContent className="space-y-6 p-5">
            <div className="space-y-2">
              <Label htmlFor="source-url">Source URL</Label>
              <Input id="source-url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} disabled={startImport.isPending || isBusy} className="font-mono text-sm" data-testid="input-source-url" />
              <p className="text-xs text-slate-500">Enter the public HTTPS origin of a site you own or have permission to migrate. Shopify sites and product JSON-LD are supported.</p>
            </div>
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-slate-900">Existing products</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors ${overwriteExisting ? "border-primary bg-primary/5" : "border-slate-200 hover:bg-slate-50"}`}>
                  <input type="radio" name="existing-products" checked={overwriteExisting} onChange={() => setOverwriteExisting(true)} disabled={startImport.isPending || isBusy} className="mt-1 accent-primary" data-testid="radio-overwrite-existing" />
                  <span><span className="block text-sm font-medium text-slate-900">Overwrite existing</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">Update matching products with the source data.</span></span>
                </label>
                <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors ${!overwriteExisting ? "border-primary bg-primary/5" : "border-slate-200 hover:bg-slate-50"}`}>
                  <input type="radio" name="existing-products" checked={!overwriteExisting} onChange={() => setOverwriteExisting(false)} disabled={startImport.isPending || isBusy} className="mt-1 accent-primary" data-testid="radio-skip-existing" />
                  <span><span className="block text-sm font-medium text-slate-900">Skip existing</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">Keep your current data for matching products.</span></span>
                </label>
              </div>
            </fieldset>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5">
              <div className="flex items-start gap-3"><div className="rounded-lg bg-slate-100 p-2"><ImageOff className="h-4 w-4 text-slate-600" /></div><div><Label htmlFor="import-images" className="cursor-pointer text-sm">Import product images</Label><p className="mt-0.5 text-xs text-slate-500">Fetch and save source image URLs.</p></div></div>
              <Switch id="import-images" checked={importImages} onCheckedChange={setImportImages} disabled={startImport.isPending || isBusy} data-testid="switch-import-images" />
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Import a CSV directly</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">Required columns: SKU, Name, Price, and the standard catalogue fields. Uploaded products are saved as <strong>active</strong>.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".csv,text/csv"
                    className="max-w-[15rem] bg-white text-xs file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-medium"
                    onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                    disabled={isUploading || isBusy}
                    data-testid="input-product-csv"
                  />
                  <Button onClick={handleUpload} disabled={isUploading || isBusy || !selectedFile} variant="outline" className="shrink-0 gap-2 bg-white" data-testid="button-upload-csv">
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {isUploading ? "Uploading…" : "Upload CSV"}
                  </Button>
                </div>
              </div>
              {selectedFile && <p className="mt-2 text-xs font-medium text-primary" data-testid="text-selected-csv">Selected: {selectedFile.name}</p>}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleStart} disabled={startImport.isPending || isBusy || isUploading} className="gap-2" data-testid="button-crawl-preview">{startImport.isPending || isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}{isBusy ? "Preparing…" : "Crawl / Preview instead"}</Button>
              {run && <Button variant="outline" onClick={handleDownload} disabled={isDownloading} data-csv-endpoint={getDownloadProductImportCsvUrl(run.id)} data-testid="button-preview-csv"><Download className="mr-2 h-4 w-4" />{isDownloading ? "Preparing CSV…" : "Preview CSV"}</Button>}
            </div>
            {isBusy && <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800" role="status" data-testid="status-polling-crawl"><Loader2 className="h-3.5 w-3.5 animate-spin" />Live status is updating every few seconds. You can leave this page open.</div>}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-slate-50/80 shadow-sm" data-testid="card-run-details">
          <CardHeader className="pb-3"><CardTitle className="text-base">Latest run</CardTitle></CardHeader>
          <CardContent>
            {run ? <div className="space-y-4 text-sm"><div className="flex items-center justify-between"><span className="text-slate-500">Source</span><span className="font-medium text-slate-900">{run.sourceDomain}</span></div><div className="flex items-center justify-between"><span className="text-slate-500">Discovered</span><span className="font-semibold text-slate-900">{run.totalDiscovered.toLocaleString("en-ZA")}</span></div><div className="flex items-center justify-between"><span className="text-slate-500">Started</span><span className="text-right text-slate-700">{formatDate(run.createdAt)}</span></div><div className="flex items-center justify-between"><span className="text-slate-500">Images</span><span className="font-medium text-slate-900">{run.importImages ? "Included" : "Skipped"}</span></div>{run.error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800" data-testid="text-import-error"><AlertCircle className="mr-1 inline h-3.5 w-3.5" />{run.error}</div>}</div> : <div className="py-5 text-sm text-slate-500" data-testid="state-import-empty"><CircleHelp className="mb-3 h-6 w-6 text-slate-400" /><p className="font-medium text-slate-700">No import runs yet</p><p className="mt-1 leading-5">Your first crawl will appear here with a reviewable sample.</p></div>}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Import report" data-testid="section-import-report">
        <MetricCard label="Products Imported" value={metrics.imported} icon={PackageCheck} tone="bg-emerald-100 text-emerald-700" />
        <MetricCard label="Products Failed" value={metrics.failed} icon={PackageX} tone="bg-rose-100 text-rose-700" />
        <MetricCard label="Missing Images" value={metrics.images} icon={ImageOff} tone="bg-amber-100 text-amber-700" />
        <MetricCard label="Missing Prices" value={metrics.prices} icon={Tag} tone="bg-slate-200 text-slate-700" />
      </section>

      <Card className="overflow-hidden border-slate-200/80 shadow-sm" data-testid="card-sample-preview">
        <CardHeader className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle className="flex items-center gap-2 text-base"><FileSpreadsheet className="h-4 w-4 text-primary" />Sample preview</CardTitle><p className="mt-1 text-sm font-normal text-slate-500">A small window into the rows found in the latest crawl.</p></div>
          {run && <Badge variant="outline" className="w-fit border-slate-200 font-normal text-slate-600" data-testid="text-preview-count">{items.length} row{items.length === 1 ? "" : "s"} shown</Badge>}
        </CardHeader>
        <CardContent className="p-0">
          {importQuery.isLoading && selectedRunId ? <div className="space-y-3 p-5" data-testid="state-preview-loading">{[1, 2, 3].map((row) => <Skeleton key={row} className="h-12 w-full" />)}</div> : items.length === 0 ? <div className="px-5 py-14 text-center" data-testid="state-preview-empty"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100"><FileSpreadsheet className="h-5 w-5 text-slate-400" /></div><p className="mt-3 text-sm font-medium text-slate-700">{run ? "No preview rows are available yet" : "Your sample preview will appear here"}</p><p className="mt-1 text-sm text-slate-500">{run ? "The crawl may still be preparing its CSV." : "Run Crawl / Preview to inspect source products before importing."}</p></div> : <div className="overflow-x-auto"><Table><TableHeader className="bg-slate-50/80"><TableRow><TableHead>Product</TableHead><TableHead className="hidden sm:table-cell">SKU</TableHead><TableHead>Status</TableHead><TableHead className="hidden md:table-cell">Source URL</TableHead><TableHead className="text-right">Checks</TableHead></TableRow></TableHeader><TableBody>{items.slice(0, 20).map((item: ProductImportItem) => <TableRow key={item.id} data-testid={`row-import-item-${item.id}`}><TableCell><div className="max-w-[15rem] truncate font-medium text-slate-900" data-testid={`text-import-item-name-${item.id}`}>{item.name || "Unnamed product"}</div><div className="max-w-[15rem] truncate text-xs text-slate-500 sm:hidden">{item.sku || "No SKU"}</div></TableCell><TableCell className="hidden font-mono text-xs text-slate-500 sm:table-cell">{item.sku || "—"}</TableCell><TableCell><Badge variant="outline" className={`text-xs font-medium ${statusTone(item.status)}`} data-testid={`status-import-item-${item.id}`}>{statusLabel(item.status)}</Badge>{item.error && <p className="mt-1 max-w-40 truncate text-xs text-rose-600" title={item.error}>{item.error}</p>}</TableCell><TableCell className="hidden max-w-[19rem] truncate text-xs text-slate-500 md:table-cell">{item.sourceUrl}</TableCell><TableCell><div className="flex justify-end gap-1.5">{item.missingImage ? <span className="rounded-md bg-amber-50 p-1.5 text-amber-700" title="Missing image"><ImageOff className="h-3.5 w-3.5" /></span> : <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Image found" />}{item.missingPrice ? <span className="rounded-md bg-rose-50 p-1.5 text-rose-700" title="Missing price"><X className="h-3.5 w-3.5" /></span> : <span className="text-xs text-emerald-700">Price</span>}</div></TableCell></TableRow>)}</TableBody></Table></div>}
        </CardContent>
      </Card>

      <section className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6" data-testid="section-import-action">
        <div><p className="font-semibold text-slate-950">Ready to update your catalogue?</p><p className="mt-1 text-sm text-slate-600">{run ? "Import this reviewed CSV into MzansiDealz. Existing products follow the option selected above." : "Complete a crawl first to create an importable preview."}</p></div>
        <Button onClick={handleImport} disabled={!run || isBusy || run.status.toLowerCase() !== "ready" || importRun.isPending} className="shrink-0 gap-2" data-testid="button-import-csv">{importRun.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}Import CSV</Button>
      </section>

      {run && (run.status.toLowerCase() === "completed" || run.productsImported > 0) && <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between" data-testid="section-rollback"><div className="flex items-start gap-3"><ArchiveRestore className="mt-0.5 h-4 w-4 text-slate-500" /><div><p className="text-sm font-medium text-slate-800">Need to undo this run?</p><p className="text-xs text-slate-500">Rollback restores overwritten products and removes products created by import #{run.id}.</p></div></div><AlertDialog><AlertDialogTrigger asChild><Button variant="outline" className="w-fit border-rose-200 text-rose-700 hover:bg-rose-50" disabled={rollbackRun.isPending} data-testid="button-open-rollback">Rollback import</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Rollback import #{run.id}?</AlertDialogTitle><AlertDialogDescription>This restores products overwritten by this run and removes products created by it. Images downloaded for created products are also removed when possible.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel data-testid="button-cancel-rollback">Keep products</AlertDialogCancel><AlertDialogAction onClick={handleRollback} className="bg-rose-600 text-white hover:bg-rose-700" data-testid="button-confirm-rollback">{rollbackRun.isPending ? "Rolling back…" : "Rollback import"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>}
    </div>
  );
}