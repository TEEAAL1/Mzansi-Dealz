import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListAdminOrders, updateOrderStatus, deleteOrder, getListAdminOrdersQueryKey } from "@workspace/api-client-react";
import { useAdminHeaders } from "@/hooks/use-admin";
import { formatPrice } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";

const STATUSES = ["pending", "awaiting_payment", "paid", "processing", "packed", "shipped", "delivered", "cancelled", "refunded", "failed"];

export default function AdminOrders() {
  const headers = useAdminHeaders();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteOrderNumber, setDeleteOrderNumber] = useState<string | null>(null);
  
  const { data: ordersData, isLoading } = useListAdminOrders(
    { status: statusFilter === "all" ? undefined : statusFilter as any }, 
    { request: { headers } }
  );

  const handleStatusChange = async (orderNumber: string, newStatus: string) => {
    try {
      await updateOrderStatus(orderNumber, { status: newStatus as any }, { headers });
      queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() });
      toast({ title: "Status updated", description: `Order ${orderNumber} marked as ${newStatus}.` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    }
  };

  const handleDelete = async (orderNumber: string) => {
    try {
      await deleteOrder(orderNumber, { headers });
      await queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() });
      setDeleteConfirmation("");
      setDeleteOrderNumber(null);
      toast({ title: "Order deleted", description: `Order ${orderNumber} was permanently deleted.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete order.";
      toast({ title: "Could not delete order", description: message, variant: "destructive" });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "paid": return "bg-green-100 text-green-800";
      case "processing": return "bg-blue-100 text-blue-800";
      case "shipped": return "bg-purple-100 text-purple-800";
      case "delivered": return "bg-emerald-100 text-emerald-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-gray-500 mt-1">Manage and fulfill customer orders.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            statusFilter === "all" ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          All Orders
        </button>
        {STATUSES.map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize whitespace-nowrap transition-colors ${
              statusFilter === status ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden bg-white shadow-sm border-gray-200">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-[100px]">Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-[160px]">Status</TableHead>
              <TableHead className="w-[72px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32 mb-1" /><Skeleton className="h-3 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-9 w-full rounded-md" /></TableCell>
                </TableRow>
              ))
            ) : ordersData?.orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                  No orders found matching this filter.
                </TableCell>
              </TableRow>
            ) : (
                ordersData?.orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium text-gray-900">#{order.id}</TableCell>
                  <TableCell>
                    <div className="font-medium text-gray-900">{order.customerName}</div>
                    <div className="text-sm text-gray-500">{order.customerEmail}</div>
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">
                    {new Date(order.createdAt).toLocaleString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </TableCell>
                  <TableCell className="text-gray-600">{order.itemCount} items</TableCell>
                  <TableCell className="text-right font-medium text-gray-900">
                    {formatPrice(order.total)}
                  </TableCell>
                    <TableCell>
                    <Select
                      defaultValue={order.status}
                       onValueChange={(val) => handleStatusChange(order.orderNumber, val)}
                    >
                      <SelectTrigger className={`w-[140px] capitalize h-8 ${getStatusColor(order.status)} border-0 font-medium`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                    <TableCell>
                      {["pending", "awaiting_payment", "cancelled", "failed", "refunded"].includes(order.status) && (
                        <AlertDialog
                          open={deleteOrderNumber === order.orderNumber}
                          onOpenChange={(open) => {
                            setDeleteOrderNumber(open ? order.orderNumber : null);
                            if (!open) setDeleteConfirmation("");
                          }}
                        >
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-600" title="Delete order">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete order permanently?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This removes the order, its items, and its payment records. This cannot be undone. Type <strong>{order.orderNumber}</strong> to confirm.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <Input
                              value={deleteConfirmation}
                              onChange={(event) => setDeleteConfirmation(event.target.value)}
                              placeholder={`Type ${order.orderNumber}`}
                              aria-label={`Type ${order.orderNumber} to confirm deletion`}
                              autoComplete="off"
                            />
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                disabled={deleteConfirmation !== order.orderNumber}
                                onClick={(event) => {
                                  event.preventDefault();
                                  void handleDelete(order.orderNumber);
                                }}
                                className="bg-red-600 text-white hover:bg-red-700 disabled:pointer-events-none disabled:opacity-50"
                              >
                                Delete permanently
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
