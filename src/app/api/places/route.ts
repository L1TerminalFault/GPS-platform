import { NextResponse } from "next/server";

export type PlaceResult = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  kind: string;
};

function classify(tags: Record<string, string> = {}): { category: string; kind: string } {
  const amenity = tags.amenity || "";
  const shop = tags.shop || "";
  const tourism = tags.tourism || "";
  const highway = tags.highway || "";

  if (amenity === "fuel" || amenity === "charging_station") return { category: "fuel", kind: amenity };
  if (["restaurant", "fast_food", "food_court"].includes(amenity)) return { category: "food", kind: amenity };
  if (["cafe", "bar", "biergarten", "pub"].includes(amenity)) return { category: "cafe", kind: amenity };
  if (amenity === "hospital" || amenity === "clinic" || amenity === "doctors") return { category: "health", kind: amenity };
  if (amenity === "pharmacy") return { category: "health", kind: amenity };
  if (amenity === "atm" || amenity === "bank") return { category: "bank", kind: amenity };
  if (amenity === "parking" || highway === "parking") return { category: "parking", kind: "parking" };
  if (tourism === "hotel" || amenity === "hotel" || tourism === "guest_house") return { category: "lodging", kind: tourism || amenity };
  if (shop) return { category: "shop", kind: shop };
  if (tourism) return { category: "tourism", kind: tourism };
  if (amenity) return { category: "place", kind: amenity };
  return { category: "place", kind: "place" };
}

function placeName(tags: Record<string, string> = {}, fallback: string) {
  return tags.name || tags.brand || tags.operator || fallback;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || "nearby";

    if (mode === "search") {
      const q = (searchParams.get("q") || "").trim();
      if (!q) return NextResponse.json([]);

      const url =
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&addressdetails=0` +
        `&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "gps-platform/1.0 (place search)",
          Accept: "application/json",
        },
      });
      if (!res.ok) return NextResponse.json([]);
      const json = await res.json();
      const results: PlaceResult[] = (Array.isArray(json) ? json : []).map((item: any, i: number) => ({
        id: `search-${item.place_id || i}`,
        name: item.display_name?.split(",").slice(0, 2).join(",").trim() || item.name || "Place",
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        category: "search",
        kind: item.type || item.class || "search",
      }));
      return NextResponse.json(results);
    }

    const lat = parseFloat(searchParams.get("lat") || "");
    const lng = parseFloat(searchParams.get("lng") || "");
    const radius = Math.min(Math.max(parseInt(searchParams.get("radius") || "1200", 10), 300), 3000);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
    }

    const query = `
      [out:json][timeout:20];
      (
        node["amenity"~"restaurant|cafe|fast_food|fuel|charging_station|hospital|clinic|pharmacy|atm|bank|parking|hotel|bar"](around:${radius},${lat},${lng});
        node["tourism"~"hotel|museum|attraction"](around:${radius},${lat},${lng});
        node["shop"](around:${radius},${lat},${lng});
      );
      out body ${40};
    `;

    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": "gps-platform/1.0 (nearby places)",
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!res.ok) {
      return NextResponse.json([]);
    }

    const json = await res.json();
    const elements = Array.isArray(json.elements) ? json.elements : [];
    const places: PlaceResult[] = elements
      .filter((el: any) => el.type === "node" && el.lat != null && el.lon != null)
      .map((el: any) => {
        const tags = el.tags || {};
        const { category, kind } = classify(tags);
        return {
          id: `osm-${el.id}`,
          name: placeName(tags, kind.replace(/_/g, " ")),
          lat: el.lat,
          lng: el.lon,
          category,
          kind,
        } as PlaceResult;
      })
      .filter((p: PlaceResult) => p.name);

    return NextResponse.json(places);
  } catch (error: any) {
    console.error("Places API error:", error);
    return NextResponse.json({ error: error.message || "Failed to load places" }, { status: 500 });
  }
}
