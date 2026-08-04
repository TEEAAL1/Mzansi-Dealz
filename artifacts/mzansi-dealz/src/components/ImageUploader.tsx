import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, ImageIcon, X } from "lucide-react";
import { apiUrl, setCsrfToken } from "@workspace/api-client-react";

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
}

export default function ImageUploader({ value, onChange }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refreshAdminCsrfToken = async () => {
    const sessionResponse = await fetch(apiUrl("/api/admin/session"), {
      credentials: "include",
      cache: "no-store",
    });
    const session = (await sessionResponse.json().catch(() => ({}))) as {
      authenticated?: boolean;
      csrfToken?: string;
    };

    if (!sessionResponse.ok || !session.authenticated || !session.csrfToken) {
      throw new Error("Your admin session has expired. Please sign in again.");
    }

    setCsrfToken(session.csrfToken);
    return session.csrfToken;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const upload = (csrfToken: string) =>
        fetch(apiUrl("/api/uploads"), {
          method: "POST",
          credentials: "include",
          headers: { "x-csrf-token": csrfToken },
          body: formData,
        });

      // Read the token from the API session first. This avoids using a stale
      // browser-side token when the frontend and API are on different hosts.
      let res = await upload(await refreshAdminCsrfToken());

      // A session can rotate between the session check and upload. Refresh
      // once and retry rather than making the admin re-enter their password.
      if (res.status === 403) {
        res = await upload(await refreshAdminCsrfToken());
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      onChange(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleClear = () => {
    onChange("");
    setError(null);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="imageUrl">Product Image URL *</Label>
        <div className="flex gap-2">
          <Input
            id="imageUrl"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://example.com/image.jpg"
            required
            className="flex-1"
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={isUploading}
            className="gap-2"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Upload
          </Button>
          {value && (
            <Button type="button" variant="outline" size="icon" onClick={handleClear} className="shrink-0">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        <p className="text-xs text-gray-400">
          Paste a URL or upload an image file (max 5MB, JPG/PNG/WebP)
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {value && (
        <div className="border rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center h-48 w-full max-w-xs">
          <img
            src={value}
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
    </div>
  );
}
