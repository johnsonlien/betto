"use server";

import { prisma } from "@/lib/prisma";
import { requireEditAccess } from "@/lib/actions/require-edit-access";

export async function createLocation(
  calendarId: string,
  input: { name: string; lat: number; lng: number; address?: string; city?: string | null }
) {
  await requireEditAccess(calendarId);

  const name = input.name.trim();
  if (!name) throw new Error("Location name is required");
  if (Number.isNaN(input.lat) || Number.isNaN(input.lng)) throw new Error("Pick a point on the map");

  return prisma.location.create({
    data: {
      calendarId,
      name,
      lat: input.lat,
      lng: input.lng,
      address: input.address?.trim() || null,
      city: input.city?.trim() || null,
    },
  });
}
