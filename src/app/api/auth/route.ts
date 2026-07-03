import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.url;

  if (!token) {
    return NextResponse.redirect(new URL('/?error=invalid_token', baseUrl));
  }

  const session = await prisma.session.findUnique({
    where: { id: token },
    include: { user: true }
  });

  if (!session || session.expiresAt < new Date()) {
    return NextResponse.redirect(new URL('/?error=expired', baseUrl));
  }

  // Set HTTP-Only cookie
  const cookieStore = await cookies();
  cookieStore.set('sessionId', session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: session.expiresAt,
  });

  return NextResponse.redirect(new URL('/', baseUrl));
}
