import { NextResponse } from "next/server";
import { resolveApiOrigin } from "@/lib/api-origin";

export async function GET(request: Request) {
  const apiOrigin = resolveApiOrigin(new URL(request.url));
  if (!apiOrigin) {
    return NextResponse.json({ pricing: {} }, { status: 200 });
  }
  try {
    const response = await fetch(`${apiOrigin}/api/billing/plans`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return NextResponse.json({ pricing: {} }, { status: 200 });
    }
    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ pricing: {} }, { status: 200 });
  }
}
