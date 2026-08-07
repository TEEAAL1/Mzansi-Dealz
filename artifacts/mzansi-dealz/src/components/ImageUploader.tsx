import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Star, Trash2, Upload, GripVertical } from "lucide-react";
import { apiUrl, setCsrfToken } from "@workspace/api-client-react";

interface ImageUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
}

export default function ImageUploader({ value, onChange }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const refreshAdminCsrfToken = async () => {
    const response = await fetch(apiUrl("/api/admin/session"), { credentials: "include", cache: "no-store" });
    const session = await response.json().catch(() => ({})) as { authenticated?: boolean; csrfToken?: string };
    if (!response.ok || !session.authenticated || !session.csrfToken) throw new Error("Your admin session has expired. Please sign in again.");
    setCsrfToken(session.csrfToken);
    return session.csrfToken;
  };

  const uploadFiles = async (files: File[]) => {
    if (!files.length) return;
    setIsUploading(true);
    setError(null);
    try {
      const body = new FormData();
      files.slice(0, Math.max(0, 12 - value.length)).forEach((file) => body.append("images", file));
      const upload = (csrfToken: string) => fetch(apiUrl("/api/uploads"), {
        method: "POST",
        credentials: "include",
        headers: { "x-csrf-token": csrfToken },
        body,
      });
      let response = await upload(await refreshAdminCsrfToken());
      if (response.status === 403) response = await upload(await refreshAdminCsrfToken());
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Upload failed");
      const data = await response.json() as { urls?: string[]; url?: string };
      const urls = data.urls?.length ? data.urls : data.url ? [data.url] : [];
      onChange([...value, ...urls].slice(0, 12));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeImage = async (url: string) => {
    setError(null);
    onChange(value.filter((item) => item !== url));
    if (!url.includes("/uploads/")) return;
    try {
      const csrfToken = await refreshAdminCsrfToken();
      const response = await fetch(apiUrl("/api/uploads"), {
        method: "DELETE",
        credentials: "include",
        headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) throw new Error("The image could not be deleted.");
    } catch (cause) {
      onChange(value);
      setError(cause instanceof Error ? cause.message : "The image could not be deleted.");
    }
  };

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>Product images *</Label>
          <p className="mt-1 text-xs text-muted-foreground">The first image is featured. Drag to reorder.</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => void uploadFiles(Array.from(event.target.files ?? []))} className="hidden" />
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={isUploading || value.length >= 12} className="gap-2">
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload images
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="imageUrl">Featured image URL</Label>
        <Input id="imageUrl" value={value[0] ?? ""} onChange={(event) => onChange([event.target.value, ...value.slice(1)].filter(Boolean))} placeholder="https://example.com/image.jpg" required />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {value.map((url, index) => (
            <div
              key={`${url}-${index}`}
              draggable
              onDragStart={() => setDraggedIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => { if (draggedIndex !== null) reorder(draggedIndex, index); setDraggedIndex(null); }}
              className="group relative overflow-hidden rounded-xl border border-border bg-muted"
            >
              <img src={url} alt={`Product image ${index + 1}`} className="aspect-square w-full object-cover" onError={(event) => { event.currentTarget.src = "/product-placeholder.svg"; }} />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-foreground/75 p-2 text-primary-foreground">
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase"><GripVertical className="h-3 w-3" /> {index === 0 ? "Featured" : `Image ${index + 1}`}</span>
                <div className="flex gap-1">
                  {index > 0 && <button type="button" aria-label="Set as featured image" onClick={() => reorder(index, 0)} className="rounded p-1 hover:bg-primary"><Star className="h-3.5 w-3.5" /></button>}
                  <button type="button" aria-label={`Delete image ${index + 1}`} onClick={() => void removeImage(url)} className="rounded p-1 hover:bg-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">Up to 12 images, max 5MB each. JPG, PNG or WebP.</p>
    </div>
  );
}