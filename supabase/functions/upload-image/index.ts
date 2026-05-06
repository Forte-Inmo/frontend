import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  ImageMagick,
  initializeImageMagick,
  MagickFormat,
  MagickGeometry,
} from "npm:@imagemagick/magick-wasm@0.0.30";

const wasmBytes = await Deno.readFile(
  new URL("magick.wasm", import.meta.resolve("npm:@imagemagick/magick-wasm@0.0.30"))
);
await initializeImageMagick(wasmBytes);

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/tiff", "image/bmp"];
const MAX_FILE_SIZE = 100 * 1024 * 1024;
const WEB_MAX_LONG_SIDE = 2560;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      },
    });
  }

  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bucket = (formData.get("bucket") as string) ?? "images";
    const folder = (formData.get("folder") as string) ?? "";

    if (!file) return errorResponse("No se encontró el archivo", 400);
    if (!ALLOWED_TYPES.includes(file.type)) return errorResponse(`Tipo no permitido: ${file.type}`, 400);
    if (file.size > MAX_FILE_SIZE) return errorResponse("El archivo supera el límite de 100MB", 400);

    const originalBuffer = await file.arrayBuffer();
    const baseName = sanitizeName(file.name);
    const uuid = crypto.randomUUID();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";

    const safeFolder = folder.split("/").map((s) => sanitizeName(s) || s).join("/");
    const prefix = safeFolder ? `${safeFolder.replace(/\/$/, "")}/` : "";
    const originalPath = `${prefix}originals/${baseName}_${uuid}.${ext}`;

    const { webpBytes, width, height } = await generateWebVersion(new Uint8Array(originalBuffer));
    const webPath = `${prefix}web/${baseName}_${uuid}.webp`;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [origResult, webResult] = await Promise.all([
      supabase.storage.from(bucket).upload(originalPath, originalBuffer, {
        contentType: file.type,
        upsert: false,
      }),
      supabase.storage.from(bucket).upload(webPath, webpBytes, {
        contentType: "image/webp",
        upsert: false,
      }),
    ]);

    if (origResult.error) throw new Error(`Error guardando original: ${origResult.error.message}`);
    if (webResult.error) throw new Error(`Error guardando versión web: ${webResult.error.message}`);

    const { data: { publicUrl: originalUrl } } = supabase.storage.from(bucket).getPublicUrl(originalPath);
    const { data: { publicUrl: webUrl } } = supabase.storage.from(bucket).getPublicUrl(webPath);

    const originalSize = originalBuffer.byteLength;
    const webSize = webpBytes.byteLength;
    const savedPercent = (((originalSize - webSize) / originalSize) * 100).toFixed(1);

    return jsonResponse({
      success: true,
      original: { path: originalPath, url: originalUrl, size: formatBytes(originalSize), format: ext },
      web: {
        path: webPath,
        url: webUrl,
        size: formatBytes(webSize),
        format: "webp",
        dimensions: { width, height },
        savedPercent: `${savedPercent}%`,
      },
    });

  } catch (err) {
    console.error("upload-image error:", err);
    return errorResponse(err instanceof Error ? err.message : "Error interno", 500);
  }
});

async function generateWebVersion(
  uint8: Uint8Array
): Promise<{ webpBytes: Uint8Array; width: number; height: number }> {
  return ImageMagick.read(uint8, (img) => {
    const longSide = Math.max(img.width, img.height);

    if (longSide > WEB_MAX_LONG_SIDE) {
      const ratio = WEB_MAX_LONG_SIDE / longSide;
      const geometry = new MagickGeometry(
        Math.round(img.width * ratio),
        Math.round(img.height * ratio)
      );
      geometry.ignoreAspectRatio = false;
      img.resize(geometry);
    }

    // Calidad 82 — buen balance tamaño/calidad para fotos
    img.quality = 82;

    const width = img.width;
    const height = img.height;

    const webpBytes = img.write(MagickFormat.WebP, (data) => data);
    return { webpBytes, width, height };
  });
}

function sanitizeName(filename: string): string {
  return filename.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "_").toLowerCase().slice(0, 60);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ success: false, error: message }, status);
}