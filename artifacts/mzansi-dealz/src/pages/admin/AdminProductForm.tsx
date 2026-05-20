import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetProduct, useListCategories, createProduct, updateProduct, getListProductsQueryKey } from "@workspace/api-client-react";
import { useAdminHeaders } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Loader2, Image as ImageIcon } from "lucide-react";
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
    query: { enabled: isEdit, queryKey: ['product', productId] }
  });

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    compareAtPrice: "",
    categoryId: "",
    imageUrl: "",
    inStock: true,
    stockCount: "",
    featured: false,
    newArrival: false,
    tags: "",
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEdit && productData) {
      setFormData({
        name: productData.name,
        description: productData.description || "",
        price: productData.price.toString(),
        compareAtPrice: productData.compareAtPrice?.toString() || "",
        categoryId: productData.categoryId?.toString() || "",
        imageUrl: productData.imageUrl,
        inStock: productData.inStock,
        stockCount: productData.stockCount?.toString() || "",
        featured: productData.featured || false,
        newArrival: productData.newArrival || false,
        tags: productData.tags?.join(", ") || "",
      });
    }
  }, [isEdit, productData]);

  const discountPercent = formData.price && formData.compareAtPrice && Number(formData.compareAtPrice) > Number(formData.price)
    ? Math.round(((Number(formData.compareAtPrice) - Number(formData.price)) / Number(formData.compareAtPrice)) * 100)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
        compareAtPrice: formData.compareAtPrice ? Number(formData.compareAtPrice) : undefined,
        categoryId: formData.categoryId ? Number(formData.categoryId) : undefined,
        imageUrl: formData.imageUrl,
        inStock: formData.inStock,
        stockCount: formData.stockCount ? Number(formData.stockCount) : undefined,
        featured: formData.featured,
        newArrival: formData.newArrival,
        tags: formData.tags ? formData.tags.split(",").map(t => t.trim()).filter(Boolean) : undefined,
      };

      if (isEdit) {
        await updateProduct(productId, payload, { headers });
        toast({ title: "Product updated", description: "Your changes have been saved." });
      } else {
        await createProduct(payload, { headers });
        toast({ title: "Product created", description: "The product has been added to your store." });
      }

      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      setLocation("/admin/products");
    } catch (error) {
      toast({ title: "Error", description: "Failed to save product.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isEdit && productLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/products")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">{isEdit ? "Edit Product" : "Add Product"}</h1>
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
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})} 
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL *</Label>
                <Input 
                  id="imageUrl" 
                  value={formData.imageUrl} 
                  onChange={(e) => setFormData({...formData, imageUrl: e.target.value})} 
                  placeholder="https://..."
                  required 
                />
              </div>
              {formData.imageUrl && (
                <div className="mt-4 border rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center h-48 w-full max-w-sm">
                  <img 
                    src={formData.imageUrl} 
                    alt="Preview" 
                    className="max-h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                    onLoad={(e) => {
                      (e.target as HTMLImageElement).style.display = 'block';
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Sale Price (R) *</Label>
                <Input 
                  id="price" 
                  type="number" 
                  step="0.01" 
                  min="0"
                  value={formData.price} 
                  onChange={(e) => setFormData({...formData, price: e.target.value})} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="compareAtPrice">Compare-at Price (R)</Label>
                <div className="relative">
                  <Input 
                    id="compareAtPrice" 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={formData.compareAtPrice} 
                    onChange={(e) => setFormData({...formData, compareAtPrice: e.target.value})} 
                  />
                  {discountPercent > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                      {discountPercent}% OFF
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.categoryId} onValueChange={(val) => setFormData({...formData, categoryId: val})}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesData?.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input 
                  id="tags" 
                  value={formData.tags} 
                  onChange={(e) => setFormData({...formData, tags: e.target.value})} 
                  placeholder="e.g. summer, tech, sale"
                />
                <p className="text-xs text-gray-500">Comma separated</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inventory & Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>In Stock</Label>
                  <p className="text-sm text-gray-500">Available for purchase</p>
                </div>
                <Switch 
                  checked={formData.inStock} 
                  onCheckedChange={(c) => setFormData({...formData, inStock: c})} 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stockCount">Stock Count</Label>
                <Input 
                  id="stockCount" 
                  type="number" 
                  min="0"
                  value={formData.stockCount} 
                  onChange={(e) => setFormData({...formData, stockCount: e.target.value})} 
                  disabled={!formData.inStock}
                />
              </div>

              <div className="pt-4 border-t space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="featured"
                    checked={formData.featured} 
                    onCheckedChange={(c) => setFormData({...formData, featured: c})} 
                  />
                  <Label htmlFor="featured" className="font-normal">Featured Product</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="newArrival"
                    checked={formData.newArrival} 
                    onCheckedChange={(c) => setFormData({...formData, newArrival: c})} 
                  />
                  <Label htmlFor="newArrival" className="font-normal">Mark as New Arrival</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setLocation("/admin/products")} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Product
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
