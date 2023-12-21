import { type NextRequest, NextResponse } from "next/server"

import { put } from "@vercel/blob"

export async function POST(request: NextRequest): Promise<NextResponse> {
	if (request.body === null) return new NextResponse(null, { status: 400 })

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
	const blob = await put(new Date().toString(), request.body, {
		access: "public",
	})

	return NextResponse.json(blob)
}
