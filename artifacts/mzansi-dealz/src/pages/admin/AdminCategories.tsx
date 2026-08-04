import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  createCategory,
  deleteCategory,
  getListCategoriesQueryKey,
  useListCategories,
} from "@workspace/api-client-react";
import { useAdminHeaders } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function toSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function AdminCategories() {
  const headers = useAdminHeaders();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: categories, isLoading } = useListCategories();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setIsSaving(true);
    try {
      await createCategory(
        {
          name: trimmedName,
          slug: toSlug(trimmedName),
          description: description.trim() || undefined,
        },
        { headers },
      );
      await queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      setName("");
      setDescription("");
      toast({ title: "Category created", description: `${trimmedName} is ready to use.` });
    } catch (error) {
      toast({
        title: "Could not create category",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number, categoryName: string) => {
    if (!window.confirm(`Delete "${categoryName}"? Categories with products cannot be deleted.`)) return;
    setDeletingId(id);
    try {
      await deleteCategory(id, { headers });
      await queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      toast({ title: "Category deleted", description: `${categoryName} has been removed.` });
    } catch (error) {
      toast({
        title: "Could not delete category",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <p className="mt-1 text-gray-500">Organise products into clear, searchable collections.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add category</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Travel & Outdoors"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">Description</Label>
              <Input
                id="category-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional description"
              />
            </div>
            <Button type="submit" disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            [1, 2, 3].map((item) => <Skeleton key={item} className="h-12 w-full" />)
          ) : categories?.length ? (
            categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900">{category.name}</p>
                  <p className="text-sm text-gray-500">
                    {category.productCount} product{category.productCount === 1 ? "" : "s"}
                    {category.description ? ` · ${category.description}` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-red-600"
                  title="Delete category"
                  disabled={deletingId === category.id}
                  onClick={() => handleDelete(category.id, category.name)}
                >
                  {deletingId === category.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-sm text-gray-500">No categories yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}