import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Asset AI analysis disabled",
    },
    { status: 200 }
  );
}