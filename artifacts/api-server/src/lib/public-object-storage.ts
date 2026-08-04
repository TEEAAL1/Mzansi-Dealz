const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

type StorageLocation = {
  bucketName: string;
  objectPrefix: string;
};

function parseStorageLocation(rawPath: string): StorageLocation {
  const normalized = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length < 2) throw new Error("Invalid public object storage path.");
  return {
    bucketName: parts[0],
    objectPrefix: parts.slice(1).join("/").replace(/\/+$/, ""),
  };
}

function getPublicStorageLocations(): StorageLocation[] {
  return (process.env.PUBLIC_OBJECT_SEARCH_PATHS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map(parseStorageLocation);
}

async function signObjectUrl(
  location: StorageLocation,
  objectName: string,
  method: "GET" | "PUT",
): Promise<string> {
  const response = await fetch(`${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: location.bucketName,
      object_name: `${location.objectPrefix}/${objectName}`.replace(/^\/+/, ""),
      method,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Object storage signing failed with HTTP ${response.status}.`);
  const payload = await response.json() as { signed_url?: string };
  if (!payload.signed_url) throw new Error("Object storage did not return a signed URL.");
  return payload.signed_url;
}

export async function getPublicObjectResponse(filePath: string): Promise<Response | null> {
  if (!filePath || filePath.includes("..") || filePath.startsWith("/")) return null;
  const locations = getPublicStorageLocations();
  for (const location of locations) {
    const signedUrl = await signObjectUrl(location, filePath, "GET");
    const response = await fetch(signedUrl, {
      signal: AbortSignal.timeout(30_000),
      redirect: "follow",
    });
    if (response.ok) return response;
    if (response.status !== 404) {
      throw new Error(`Object storage returned HTTP ${response.status}.`);
    }
  }
  return null;
}

export function hasPublicObjectStorage(): boolean {
  return getPublicStorageLocations().length > 0;
}