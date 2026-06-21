import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProducts,
  getListProductsQueryKey,
  getGetFeaturedProductsQueryKey,
  getGetNewArrivalsQueryKey,
  deleteProduct,
} from "@workspace/api-client-react";
import { useAdminHeaders } from "@/hooks/use-admin";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function AdminProducts() {
  const headers = useAdminHeaders();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: productsData, isLoading } = useListProducts({ limit: 200 });

  const handleDelete = async (id: number, name: string) => {
    try {
      await deleteProduct(id, { headers });
      await queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetFeaturedProductsQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetNewArrivalsQueryKey() });
      toast({ title: "Product deleted", description: `"${name}" has been removed.` });
    } catch {
      toast({ title: "Error", description: "Failed to delete product.", variant: "destructive" });
    }
  };

  const products = productsData?.products ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 mt-1">
            {isLoading ? "Loading..." : `${products.length} product${products.length !== 1 ? "s" : ""} in your store`}
          </p>
        </div>
        <Link href="/products/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-14">Image</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="hidden sm:table-cell">Labels</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="w-10 h-10 rounded-md" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-48 mb-1" /><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-28 rounded-full" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-gray-400">
                  <p className="text-base font-medium text-gray-500 mb-1">No products yet</p>
                  <p className="text-sm">Click "Add Product" to create your first product.</p>
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id} className="hover:bg-gray-50/50">
                  <TableCell>
                    <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://placehold.co/100x100/f3f4f6/9ca3af?text=No+Image";
                        }}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-gray-900 leading-tight">{product.name}</div>
                    {!product.inStock && (
                      <span className="inline-block mt-1 text-xs text-red-600 font-medium">Out of stock</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 font-normal text-xs">
                      {product.categoryName || "Uncategorised"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-gray-900 text-sm">{formatPrice(product.price)}</div>
                    {product.originalPrice > product.price && (
                      <div className="text-xs text-gray-400 line-through">
                        {formatPrice(product.originalPrice)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {product.isFeatured && (
                        <Badge className="bg-orange-100 text-orange-700 border-0 text-xs py-0 h-5 font-normal">
                          Featured
                        </Badge>
                      )}
                      {product.isNewArrival && (
                        <Badge className="bg-blue-100 text-blue-700 border-0 text-xs py-0 h-5 font-normal">
                          New
                        </Badge>
                      )}
                      {product.onSale && (
                        <Badge className="bg-green-100 text-green-700 border-0 text-xs py-0 h-5 font-normal">
                          Sale
                        </Badge>
                      )}
                      {product.discountPercent > 0 && (
                        <Badge className="bg-red-100 text-red-700 border-0 text-xs py-0 h-5 font-normal">
                          -{product.discountPercent}%
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/products/${product.id}/edit`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-gray-900"
                          title="Edit product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </Link>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-600"
                            title="Delete product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Product</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{product.name}"? This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(product.id, product.name)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
