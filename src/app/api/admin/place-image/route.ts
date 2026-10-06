import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { ConvexError } from "convex/values";
import { NextRequest, NextResponse } from "next/server";

async function client() {
  const { userId, getToken } = await auth();
  if (!userId) return null;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("Convex no está configurado");
  const token = await getToken({ template: "convex" });
  if (!token) throw new Error("Falta configurar la plantilla JWT convex en Clerk");
  const convex = new ConvexHttpClient(url);
  convex.setAuth(token);
  return convex;
}

function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof ConvexError && typeof error.data === "string" ? error.data : "No se pudo guardar la imagen. Comprueba Convex y la configuración JWT de Clerk" }, { status: error instanceof ConvexError ? 400 : 503 });
}

export async function GET(request: NextRequest) {
  try {
    const convex = await client();
    if (!convex) return NextResponse.json({ allowed: false, eligible: false });
    const slug = request.nextUrl.searchParams.get("slug");
    if (!slug || slug.length > 300) return NextResponse.json({ error: "Restaurante inválido" }, { status: 400 });
    return NextResponse.json(await convex.query(makeFunctionReference<"query">("placeImages:status"), { slug }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Origen no autorizado" }, { status: 403 });
  try {
    const convex = await client();
    if (!convex) return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 }); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
    const values = body as Record<string, unknown>;
    if (typeof values.slug !== "string" || !values.slug || values.slug.length > 300) return NextResponse.json({ error: "Restaurante inválido" }, { status: 400 });
    const slug = values.slug;
    const status = await convex.query(makeFunctionReference<"query">("placeImages:status"), { slug });
    if (!status.allowed) return NextResponse.json({ error: "Solo el administrador puede subir imágenes" }, { status: 403 });
    if (!status.eligible) return NextResponse.json({ error: "Este restaurante ya tiene una reseña manual o no está publicado" }, { status: 409 });
    if (values.operation === "upload") {
      const uploadUrl = await convex.mutation(makeFunctionReference<"mutation">("placeImages:uploadUrl"), { slug });
      return NextResponse.json({ uploadUrl });
    }
    if (values.operation !== "save" || typeof values.storageId !== "string" || !values.storageId || values.storageId.length > 200) return NextResponse.json({ error: "Imagen inválida" }, { status: 400 });
    return NextResponse.json(await convex.mutation(makeFunctionReference<"mutation">("placeImages:save"), { slug, storageId: values.storageId }));
  } catch (error) { return failure(error); }
}
