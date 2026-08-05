import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetAdminTopSellersQueryKey,
  getListProductsQueryKey,
  useGetAdminTopSellers,
  useListProducts,
  useUpdateAdminTopSellers,
  type Product,
  type TopSellerSettingsInputMode,
} from "@workspace/api-client-react";
import { useAdminHeaders } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChevronDown, ChevronUp, GripVertical, Info, Loader2, Search, Trash2 } from "lucide-react";
import { formatZAR } from "@/lib/utils";

function ProductRow({ product, action }: { product: Product; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
      <img
        src={product.imageUrl}
        alt=""
        className="h-14 w-14 rounded-lg object-cover"
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = "/product-placeholder.svg";
        }}
      />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold text-gray-900">{product.name}</p>
        <p className="mt-1 text-xs text-gray-500">{formatZAR(product.price)} · {product.categoryName || "Uncategorised"}</p>
      </div>
      {action}
    </div>
  );
}

export default function AdminTopSellers() {
  const headers = useAdminHeaders();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, isError, refetch } = useGetAdminTopSellers({ request: { headers } });
  const [mode, setMode] = useState<TopSellerSettingsInputMode>("automatic");
  const [displayLimit, setDisplayLimit] = useState<5 | 10>(5);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [hasEdited, setHasEdited] = useState(false);
  const [saveError, setSaveError] = useState("");

  const { data: searchResults, isLoading: searchLoading } = useListProducts(
    { search: search.trim() || undefined, limit: 60, offset: 0 },
    { query: { queryKey: getListProductsQueryKey({ search: search.trim() || undefined, limit: 60, offset: 0 }), enabled: mode === "curated" && search.trim().length > 1 } },
  );
  const saveMutation = useUpdateAdminTopSellers({ request: { headers } });

  useEffect(() => {
    if (!data || hasEdited) return;
    setMode(data.mode);
    setDisplayLimit(data.displayLimit as 5 | 10);
    setSelectedIds(data.curatedProductIds);
  }, [data, hasEdited]);

  const selectedProducts = useMemo(() => {
    const productMap = new Map<number, Product>();
    [...(data?.curatedProducts ?? []), ...(searchResults?.products ?? []), ...(data?.products ?? [])].forEach((product) => productMap.set(product.id, product));
    return selectedIds.map((id) => productMap.get(id)).filter((product): product is Product => Boolean(product));
  }, [data?.curatedProducts, data?.products, searchResults?.products, selectedIds]);

  const availableSearchProducts = useMemo(
    () => (searchResults?.products ?? []).filter((product) => product.inStock && product.status === "active" && !/test/i.test(`${product.name} ${product.slug}`)),
    [searchResults?.products],
  );

  const automaticPreview = data?.automaticProducts ?? [];
  const previewProducts = mode === "curated" ? selectedProducts.slice(0, displayLimit) : automaticPreview.slice(0, displayLimit);
  const canSave = mode === "automatic" || selectedIds.length >= displayLimit;

  const markEdited = () => {
    setHasEdited(true);
    setSaveError("");
  };

  const addProduct = (product: Product) => {
    if (selectedIds.includes(product.id) || selectedIds.length >= 10) return;
    setSelectedIds((current) => [...current, product.id]);
    markEdited();
  };

  const removeProduct = (id: number) => {
    setSelectedIds((current) => current.filter((productId) => productId !== id));
    markEdited();
  };

  const moveProduct = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= selectedIds.length) return;
    const next = [...selectedIds];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setSelectedIds(next);
    markEdited();
  };

  const save = async () => {
    if (!canSave) return;
    try {
      await saveMutation.mutateAsync(
        { data: { mode, displayLimit, curatedProductIds: selectedIds } },
      );
      await queryClient.invalidateQueries({ queryKey: getGetAdminTopSellersQueryKey() });
      setHasEdited(false);
      toast({ title: "Top sellers saved", description: "The homepage hero is using the new merchandising lineup." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      setSaveError(message);
      toast({ title: "Could not save top sellers", description: message, variant: "destructive" });
    }
  };

  if (isLoading) return <div className="py-12 text-center text-gray-500">Loading top seller settings…</div>;

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Top sellers</h1>
        <Alert variant="destructive">
          <AlertTitle>Could not load merchandising settings</AlertTitle>
          <AlertDescription className="mt-2 flex items-center justify-between gap-4">
            <span>Refresh the page or try loading the current configuration again.</span>
            <Button variant="outline" onClick={() => void refetch()}>Try again</Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Top sellers</h1>
          <p className="mt-1 max-w-2xl text-gray-500">Control the real products shown in the homepage hero. Automatic mode follows completed order volume; curated mode gives you campaign control.</p>
        </div>
        <div className="text-sm text-gray-500">Last saved {new Date(data.updatedAt).toLocaleString("en-ZA")}</div>
      </div>

      {hasEdited && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Unsaved changes</AlertTitle>
          <AlertDescription>The homepage keeps using the last saved lineup until you save this page.</AlertDescription>
        </Alert>
      )}
      {saveError && <Alert variant="destructive"><AlertTitle>Save failed</AlertTitle><AlertDescription>{saveError}</AlertDescription></Alert>}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Merchandising mode</CardTitle>
              <CardDescription>Keep popularity evidence-led, or choose a deliberate lineup for a promotion.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {([
                ["automatic", "Automatic", "Ranked by completed orders"],
                ["curated", "Curated", "Your selected order"],
              ] as const).map(([value, title, description]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setMode(value); markEdited(); }}
                  className={`rounded-xl border p-4 text-left transition-colors ${mode === value ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-gray-200 hover:border-gray-400"}`}
                >
                  <span className="font-bold text-gray-900">{title}</span>
                  <span className="mt-1 block text-sm text-gray-500">{description}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lineup size</CardTitle>
              <CardDescription>Customers swipe through the selected number of products in the homepage hero.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              {([5, 10] as const).map((limit) => (
                <Button
                  key={limit}
                  type="button"
                  variant={displayLimit === limit ? "default" : "outline"}
                  onClick={() => { setDisplayLimit(limit); markEdited(); }}
                >
                  Show {limit}
                </Button>
              ))}
            </CardContent>
          </Card>

          {mode === "automatic" ? (
            <Card>
              <CardHeader>
                <CardTitle>Live ranking preview</CardTitle>
                <CardDescription>Products are ranked by quantity sold in valid orders. Cancelled, failed, and refunded orders are excluded.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {automaticPreview.map((product, index) => (
                  <ProductRow key={product.id} product={product} action={<Badge variant="secondary">#{index + 1}</Badge>} />
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Curated lineup</CardTitle>
                <CardDescription>Choose 5 or 10 active, in-stock products. Use the arrows to set their swipe order.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedProducts.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">Search below and add products to start your lineup.</p>}
                {selectedProducts.map((product, index) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    action={(
                      <div className="flex items-center gap-1">
                        <span className="mr-1 hidden text-xs text-gray-400 sm:inline">#{index + 1}</span>
                        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`Move ${product.name} up`} onClick={() => moveProduct(index, -1)} disabled={index === 0}><ChevronUp className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`Move ${product.name} down`} onClick={() => moveProduct(index, 1)} disabled={index === selectedProducts.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500" aria-label={`Remove ${product.name}`} onClick={() => removeProduct(product.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    )}
                  />
                ))}
                <div className="border-t pt-4">
                  <Label htmlFor="top-seller-search">Find products</Label>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input id="top-seller-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by product name, brand, or category" className="pl-9" />
                  </div>
                  {search.trim().length > 1 && (
                    <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                      {searchLoading ? <p className="py-4 text-center text-sm text-gray-500">Searching…</p> : availableSearchProducts.map((product) => (
                        <ProductRow
                          key={product.id}
                          product={product}
                          action={<Button type="button" size="sm" variant={selectedIds.includes(product.id) ? "secondary" : "outline"} onClick={() => addProduct(product)} disabled={selectedIds.includes(product.id) || selectedIds.length >= 10}>{selectedIds.includes(product.id) ? "Added" : "Add"}</Button>}
                        />
                      ))}
                      {!searchLoading && !availableSearchProducts.length && <p className="py-4 text-center text-sm text-gray-500">No active in-stock products found.</p>}
                    </div>
                  )}
                </div>
                <p className={`text-sm ${canSave ? "text-gray-500" : "font-medium text-red-600"}`}>{selectedIds.length} selected · {canSave ? `Ready to show ${displayLimit}` : `Select at least ${displayLimit} products to save`}</p>
              </CardContent>
            </Card>
          )}

          <Button onClick={() => void save()} disabled={saveMutation.isPending || !canSave} className="min-w-40 gap-2">
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {saveMutation.isPending ? "Saving…" : "Save top sellers"}
          </Button>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Customer-facing preview</CardTitle>
            <CardDescription>{mode === "curated" ? "Your saved order will appear after saving." : "This is the current order-ranked lineup."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {previewProducts.map((product, index) => (
              <div key={product.id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-2.5">
                <span className="w-5 text-center text-xs font-bold text-gray-400">{index + 1}</span>
                <img
                  src={product.imageUrl}
                  alt=""
                  className="h-12 w-12 rounded-md object-cover"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = "/product-placeholder.svg";
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-semibold text-gray-900">{product.name}</p>
                  <p className="text-xs text-gray-500">{formatZAR(product.price)}</p>
                </div>
              </div>
            ))}
            {!previewProducts.length && <p className="py-8 text-center text-sm text-gray-500">No products available for preview yet.</p>}
            <div className="mt-4 flex items-center gap-2 border-t pt-4 text-xs text-gray-500">
              <GripVertical className="h-4 w-4" />
              <span>Customers can swipe on mobile and use arrow controls on desktop.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}