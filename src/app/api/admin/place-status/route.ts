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
  if (error instanceof ConvexError && typeof error.data === "string") return NextResponse.json({ error: error.data }, { status: 400 });
  return NextResponse.json({ error: "No se pudo actualizar el restaurante. Comprueba Convex y la configuración JWT de Clerk" }, { status: 503 });
}

export async function GET(request: NextRequest) {
  try {
    const convex = await client();
    if (!convex) return NextResponse.json({ allowed: false, canDelete: false });
    const slug = request.nextUrl.searchParams.get("slug");
    if (!slug || slug.length > 300) return NextResponse.json({ error: "Restaurante inválido" }, { status: 400 });
    return NextResponse.json(await convex.query(makeFunctionReference<"query">("placeAdmin:status"), { slug }), { headers: { "Cache-Control": "no-store" } });
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
    if (typeof values.slug !== "string" || !values.slug || values.slug.length > 300) {
      return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
    }
    if (values.operation === "markPermanentlyClosed") {
      return NextResponse.json(await convex.mutation(makeFunctionReference<"mutation">("placeAdmin:markPermanentlyClosed"), { slug: values.slug }));
    }
    if (values.operation === "setNoPhotoFound" && typeof values.noPhotoFound === "boolean") {
      return NextResponse.json(await convex.mutation(makeFunctionReference<"mutation">("placeAdmin:setNoPhotoFound"), { slug: values.slug, noPhotoFound: values.noPhotoFound }));
    }
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  } catch (error) { return failure(error); }
}
