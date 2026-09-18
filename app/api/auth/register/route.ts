import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { message: "El registro público está desactivado. Pide acceso al administrador." },
    { status: 403 },
  );
}
