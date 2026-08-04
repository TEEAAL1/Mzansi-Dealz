import { useState } from "react";
import { apiUrl } from "@workspace/api-client-react";
import { useAdminHeaders } from "@/hooks/use-admin";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, RefreshCw, RotateCcw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type Payment = {
  id: number;
  orderId: number;
  gateway: string;
  status: string;
  providerPaymentId: string | null;
  reference: string;
  amount: string;
  currency: string;
  customerEmail: string;
  createdAt: string;
};

export default function AdminPayments() {
  const headers = useAdminHeaders();
  const queryClient = useQueryClient();
  const [refunding, setRefunding] = useState<number | null>(null);

  const paymentsQuery = useQuery({
    queryKey: ["/api/admin/payments"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/admin/payments"), { credentials: "include", headers });
      if (!response.ok) throw new Error("Could not load payments");
      return (await response.json()) as { payments: Payment[] };
    },
  });

  const refund = async (payment: Payment) => {
    if (!window.confirm(`Refund ${formatPrice(Number(payment.amount))} for ${payment.reference}?`)) return;
    setRefunding(payment.id);
    try {
      const response = await fetch(apiUrl(`/api/admin/payments/${payment.id}/refund`), {
        method: "POST",
        credentials: "include",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Refund failed");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/payments"] });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Refund failed");
    } finally {
      setRefunding(null);
    }
  };

  const exportPayments = async () => {
    const response = await fetch(apiUrl("/api/admin/payments/export.csv"), {
      credentials: "include",
      headers,
    });
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mzansi-payments.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const statusClass = (status: string) => {
    if (status === "paid") return "bg-green-100 text-green-800";
    if (status === "refunded") return "bg-purple-100 text-purple-800";
    if (status === "failed") return "bg-red-100 text-red-800";
    return "bg-yellow-100 text-yellow-800";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="mt-1 text-gray-500">Review gateway payments, refunds, and settlement references.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportPayments}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => paymentsQuery.refetch()} disabled={paymentsQuery.isFetching}>
            <RefreshCw className={`h-4 w-4 ${paymentsQuery.isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Gateway</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentsQuery.isLoading ? (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-gray-500">Loading payments…</TableCell></TableRow>
              ) : paymentsQuery.data?.payments.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-gray-500">No payment records yet.</TableCell></TableRow>
              ) : (
                paymentsQuery.data?.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.reference}</TableCell>
                    <TableCell className="capitalize">{payment.gateway}</TableCell>
                    <TableCell className="text-sm text-gray-600">{payment.customerEmail}</TableCell>
                    <TableCell className="text-sm text-gray-500">{new Date(payment.createdAt).toLocaleString()}</TableCell>
                    <TableCell><Badge className={`capitalize ${statusClass(payment.status)}`}>{payment.status}</Badge></TableCell>
                    <TableCell className="text-right font-medium">{formatPrice(Number(payment.amount))}</TableCell>
                    <TableCell className="text-right">
                      {payment.status === "paid" && payment.gateway === "yoco" && (
                        <Button size="sm" variant="outline" onClick={() => refund(payment)} disabled={refunding === payment.id}>
                          <RotateCcw className="h-4 w-4" /> {refunding === payment.id ? "Refunding…" : "Refund"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}