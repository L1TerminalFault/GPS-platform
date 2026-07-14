import { NextResponse } from "next/server";

const cache = new Map<string, string>();

function cacheKey(lat: number, lng: number) {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

function shortNameFromNominatim(data: any): string | null {
  if (!data) return null;
  const addr = data.address || {};
  const neighborhood =
    addr.neighbourhood || addr.suburb || addr.quarter || addr.road || addr.amenity;
  const locality = addr.city || addr.town || addr.village || addr.county;
  const admin = addr.state;

  if (neighborhood && locality) return `${neighborhood}, ${locality}`;
  if (locality && admin) return `${locality}, ${admin}`;
  if (locality) return locality;
  if (neighborhood) return neighborhood;
  if (admin) return admin;
  if (data.name) return String(data.name);
  if (data.display_name) {
    return String(data.display_name).split(",").slice(0, 2).join(",").trim();
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") || "");
    const lng = parseFloat(searchParams.get("lng") || "");

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
    }

    const key = cacheKey(lat, lng);
    if (cache.has(key)) {
      return NextResponse.json({ name: cache.get(key) });
    }

    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "gps-platform/1.0 (fleet reverse-geocode)",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { name: null, fallback: `${lat.toFixed(4)}, ${lng.toFixed(4)}` },
        { status: 200 }
      );
    }

    const json = await res.json();
    const name = shortNameFromNominatim(json);

    if (!name) {
      return NextResponse.json({ name: null, fallback: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
    }

    cache.set(key, name);
    return NextResponse.json({ name });
  } catch (error: any) {
    console.error("Geocode error:", error);
    return NextResponse.json({ error: error.message || "Geocode failed" }, { status: 500 });
  }
}
