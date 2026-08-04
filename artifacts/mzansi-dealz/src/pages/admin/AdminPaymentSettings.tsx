import { useEffect, useState } from "react";
import { apiUrl } from "@workspace/api-client-react";
import { useAdminHeaders } from "@/hooks/use-admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

type Settings = {
  currency: "ZAR";
  defaultGateway: "yoco" | "payfast";
  yocoEnabled: boolean;
  payfastEnabled: boolean;
  payfastSandbox: boolean;
  yocoConfigured: boolean;
  payfastConfigured: boolean;
  emailConfigured: boolean;
};

const initialSettings: Settings = {
  currency: "ZAR",
  defaultGateway: "yoco",
  yocoEnabled: false,
  payfastEnabled: false,
  payfastSandbox: true,
  yocoConfigured: false,
  payfastConfigured: false,
  emailConfigured: false,
};

export default function AdminPaymentSettings() {
  const headers = useAdminHeaders();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(apiUrl("/api/admin/payment-settings"), { credentials: "include", headers })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load payment settings");
        return response.json();
      })
      .then((data: Settings) => setSettings(data))
      .catch((error) => toast({ title: "Could not load settings", description: error.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch(apiUrl("/api/admin/payment-settings"), {
        method: "PUT",
        credentials: "include",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          currency: settings.currency,
          defaultGateway: settings.defaultGateway,
          yocoEnabled: settings.yocoEnabled,
          payfastEnabled: settings.payfastEnabled,
          payfastSandbox: settings.payfastSandbox,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save settings");
      setSettings(data);
      toast({ title: "Payment settings saved" });
    } catch (error) {
      toast({ title: "Could not save settings", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-12 text-center text-gray-500">Loading payment settings…</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment settings</h1>
        <p className="mt-1 text-gray-500">Choose which hosted gateway customers can use. Secret keys stay in server configuration.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gateway readiness</CardTitle>
          <CardDescription>Both credentials and webhook secrets are required before a gateway can process payments.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-4">
            <div className="font-semibold">Yoco</div>
            <Badge className={settings.yocoConfigured ? "mt-2 bg-green-100 text-green-800" : "mt-2 bg-yellow-100 text-yellow-800"}>
              {settings.yocoConfigured ? "Configured" : "Credentials needed"}
            </Badge>
          </div>
          <div className="rounded-lg border p-4">
            <div className="font-semibold">PayFast</div>
            <Badge className={settings.payfastConfigured ? "mt-2 bg-green-100 text-green-800" : "mt-2 bg-yellow-100 text-yellow-800"}>
              {settings.payfastConfigured ? "Configured" : "Credentials needed"}
            </Badge>
          </div>
          <div className="rounded-lg border p-4">
            <div className="font-semibold">Email</div>
            <Badge className={settings.emailConfigured ? "mt-2 bg-green-100 text-green-800" : "mt-2 bg-gray-100 text-gray-700"}>
              {settings.emailConfigured ? "Configured" : "Optional"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Checkout gateways</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <label className="flex items-center justify-between gap-4">
            <span><strong>Enable Yoco</strong><span className="block text-sm text-gray-500">Recommended hosted checkout for card and wallet payments.</span></span>
            <Switch checked={settings.yocoEnabled} onCheckedChange={(checked) => setSettings({ ...settings, yocoEnabled: checked })} disabled={!settings.yocoConfigured} />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span><strong>Enable PayFast</strong><span className="block text-sm text-gray-500">Use PayFast hosted checkout and signed ITN notifications.</span></span>
            <Switch checked={settings.payfastEnabled} onCheckedChange={(checked) => setSettings({ ...settings, payfastEnabled: checked })} disabled={!settings.payfastConfigured} />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span><strong>PayFast sandbox mode</strong><span className="block text-sm text-gray-500">Keep enabled until the merchant account is ready for live payments.</span></span>
            <Switch checked={settings.payfastSandbox} onCheckedChange={(checked) => setSettings({ ...settings, payfastSandbox: checked })} disabled={!settings.payfastConfigured} />
          </label>
          <div className="border-t pt-5">
            <div className="mb-2 text-sm font-semibold">Default gateway</div>
            <div className="flex gap-2">
              {(["yoco", "payfast"] as const).map((gateway) => (
                <Button key={gateway} type="button" variant={settings.defaultGateway === gateway ? "default" : "outline"} onClick={() => setSettings({ ...settings, defaultGateway: gateway })}>
                  {gateway === "yoco" ? "Yoco" : "PayFast"}
                </Button>
              ))}
            </div>
          </div>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save payment settings"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}