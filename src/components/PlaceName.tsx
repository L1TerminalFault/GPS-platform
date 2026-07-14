"use client";

import { useEffect, useState } from "react";

const clientCache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

export function parseLatLng(input?: string | null): { lat: number; lng: number } | null {
  if (!input?.trim()) return null;
  const parts = input.split(/[,\s]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

function cacheKey(lat: number, lng: number) {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

async function fetchPlaceName(lat: number, lng: number): Promise<string | null> {
  const key = cacheKey(lat, lng);
  if (clientCache.has(key)) return clientCache.get(key)!;
  if (inflight.has(key)) return inflight.get(key)!;

  const promise = fetch(`/api/geocode?lat=${lat}&lng=${lng}`)
    .then(async (r) => {
      const json = await r.json();
      const name = (json.name || json.fallback || null) as string | null;
      if (name) clientCache.set(key, name);
      return name;
    })
    .catch(() => null)
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

type PlaceNameProps = {
  lat?: number | string | null;
  lng?: number | string | null;
  coords?: string | null;
  className?: string;
  fallback?: string;
};

export function PlaceName({ lat, lng, coords, className, fallback = "—" }: PlaceNameProps) {
  const parsed =
    lat != null && lng != null && `${lat}`.trim() !== "" && `${lng}`.trim() !== ""
      ? { lat: parseFloat(String(lat)), lng: parseFloat(String(lng)) }
      : parseLatLng(coords);

  const valid =
    parsed && !Number.isNaN(parsed.lat) && !Number.isNaN(parsed.lng) ? parsed : null;

  const [name, setName] = useState<string | null>(() => {
    if (!valid) return null;
    return clientCache.get(cacheKey(valid.lat, valid.lng)) ?? null;
  });
  const [loading, setLoading] = useState(!name && !!valid);

  useEffect(() => {
    if (!valid) {
      setName(null);
      setLoading(false);
      return;
    }
    const key = cacheKey(valid.lat, valid.lng);
    if (clientCache.has(key)) {
      setName(clientCache.get(key)!);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchPlaceName(valid.lat, valid.lng).then((n) => {
      if (!cancelled) {
        setName(n);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [valid?.lat, valid?.lng]);

  if (!valid) return <span className={className}>{fallback}</span>;
  if (loading && !name) {
    return <span className={`${className ?? ""} opacity-50 animate-pulse`}>Locating…</span>;
  }
  return <span className={className}>{name || fallback}</span>;
}
