import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetProduct,
  useListCategories,
  createProduct,
  updateProduct,
  getListProductsQueryKey,
  getGetFeaturedProductsQueryKey,
  getGetNewArrivalsQueryKey,
} from "@workspace/api-client-react";
import { useAdminHeaders } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminProductForm({ params }: { params?: { id?: string } }) {
  const isEdit = !!params?.id && params.id !== "new";
  const productId = isEdit ? parseInt(params.id!) : 0;

  const headers = useAdminHeaders();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: categoriesData } = useListCategories();
  const { data: productData, isLoading: productLoading } = useGetProduct(productId, {
    query: { enabled: isEdit, queryKey: ["product", productId] },
  });

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    originalPrice: "",
    categoryId: "",
    imageUrl: "",
    inStock: true,
    stockCount: "",
    isFeatured: false,
    isNewArrival: false,
    onSale: false,
    tags: "",
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEdit && productData) {
      setFormData({
        name: productData.name,
        description: productData.description || "",
        price: productData.price.toString(),
        originalPrice: productData.originalPrice > productData.price
          ? productData.originalPrice.toString()
          : "",
        categoryId: productData.categoryId?.toString() || "",
        imageUrl: productData.imageUrl,
        inStock: productData.inStock,
        stockCount: productData.stockCount?.toString() || "",
        isFeatured: productData.isFeatured || false,
        isNewArrival: productData.isNewArrival || false,
        onSale: productData.onSale || false,
        tags: productData.tags ? productData.tags.split(",").map((t: string) => t.trim()).join(", ") : "",
      });
    }
  }, [isEdit, productData]);

  const currentPrice = Number(formData.price) || 0;
  const oldPrice = Number(formData.originalPrice) || 0;
  const discountPercent =
    oldPrice > currentPrice && currentPrice > 0
      ? Math.round(((oldPrice - currentPrice) / oldPrice) * 100)
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.categoryId) {
      toast({ title: "Category required", description: "Please select a category.", variant: "destructive" });
      return;
    }
    if (!formData.price || Number(formData.price) <= 0) {
      toast({ title: "Price required", description: "Please enter a valid price.", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    try {
      const effectiveOriginalPrice = formData.originalPrice && Number(formData.originalPrice) > 0
        ? Number(formData.originalPrice)
        : Number(formData.price);

      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        price: Number(formData.price),
        originalPrice: effectiveOriginalPrice,
        categoryId: Number(formData.categoryId),
        imageUrl: formData.imageUrl,
        inStock: formData.inStock,
        stockCount: formData.stockCount ? Number(formData.stockCount) : undefined,
        isFeatured: formData.isFeatured,
        isNewArrival: formData.isNewArrival,
        onSale: formData.onSale,
        tags: formData.tags
          ? formData.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
              .join(",")
          : undefined,
      };

      if (isEdit) {
        await updateProduct(productId, payload, { headers });
        toast({ title: "Product updated", description: "Your changes have been saved." });
      } else {
        await createProduct(payload, { headers });
        toast({ title: "Product created", description: "The product has been added to your store." });
      }

      await queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetFeaturedProductsQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetNewArrivalsQueryKey() });
      setLocation("/admin/products");
    } catch (error: unknown) {
      const msg =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: string }).message)
          : "Failed to save product.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isEdit && productLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/products")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? "Edit Product" : "Add Product"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Samsung Galaxy Buds Pro"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the product — features, specs, what's in the box..."
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Current Price (R) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="originalPrice">
                    Old / Original Price (R)
                    <span className="ml-1 text-xs text-gray-400 font-normal">optional</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="originalPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.originalPrice}
                      onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                      placeholder="0.00"
                    />
                    {discountPercent > 0 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                        {discountPercent}% OFF
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    Set a higher old price to show a strikethrough discount
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Product Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL *</Label>
                <Input
                  id="imageUrl"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  required
                />
                <p className="text-xs text-gray-400">Paste a direct link to a product image</p>
              </div>
              {formData.imageUrl && (
                <div className="mt-2 border rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center h-48 w-full max-w-xs">
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    className="max-h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                    onLoad={(e) => {
                      (e.target as HTMLImageElement).style.display = "block";
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organisation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(val) => setFormData({ ...formData, categoryId: val })}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesData?.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="summer, tech, sale"
                />
                <p className="text-xs text-gray-400">Comma separated</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>In Stock</Label>
                  <p className="text-xs text-gray-400 mt-0.5">Available for purchase</p>
                </div>
                <Switch
                  checked={formData.inStock}
                  onCheckedChange={(c) => setFormData({ ...formData, inStock: c })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stockCount">Stock Count</Label>
                <Input
                  id="stockCount"
                  type="number"
                  min="0"
                  value={formData.stockCount}
                  onChange={(e) => setFormData({ ...formData, stockCount: e.target.value })}
                  placeholder="Leave blank for unlimited"
                  disabled={!formData.inStock}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Visibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Label className="text-sm font-medium">Featured Product</Label>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Shows in "Today's Top Deals" on the homepage
                  </p>
                </div>
                <Switch
                  checked={formData.isFeatured}
                  onCheckedChange={(c) => setFormData({ ...formData, isFeatured: c })}
                />
              </div>

              <div className="flex items-start justify-between gap-3">
                <div>
                  <Label className="text-sm font-medium">New Arrival</Label>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Shows in the "New Arrivals" section
                  </p>
                </div>
                <Switch
                  checked={formData.isNewArrival}
                  onCheckedChange={(c) => setFormData({ ...formData, isNewArrival: c })}
                />
              </div>

              <div className="flex items-start justify-between gap-3">
                <div>
                  <Label className="text-sm font-medium">Sale / Deal</Label>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Appears in the "On Sale" filter and shows a sale badge
                  </p>
                </div>
                <Switch
                  checked={formData.onSale}
                  onCheckedChange={(c) => setFormData({ ...formData, onSale: c })}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/admin/products")}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="gap-2 min-w-[120px]">
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? "Saving..." : "Save Product"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
