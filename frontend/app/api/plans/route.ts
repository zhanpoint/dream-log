import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

export async function GET() {
  if (!API_URL) {
    return NextResponse.json({ pricing: {} }, { status: 200 });
  }
  try {
    const response = await fetch(`${API_URL}/api/billing/plans`, {
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
