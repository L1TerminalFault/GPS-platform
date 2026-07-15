/** Serialize a rental for API responses based on viewer role. */
export function serializeRental(
  rental: any,
  opts: { isAdmin: boolean; userId: string | null }
) {
  const obj =
    rental && typeof rental.toObject === "function"
      ? rental.toObject()
      : { ...rental };

  if (opts.isAdmin) return obj;

  const isMine =
    !!opts.userId &&
    (obj.carOwnerClerkId === opts.userId || obj.renteeClerkId === opts.userId);

  const {
    carGPSId: _pub,
    carGPSSecretId: _sec,
    carOwnerClerkId: _owner,
    renteeClerkId: _rentee,
    carInitLocation: _location,
    legalDocumentURLs: _documents,
    ...publicFields
  } = obj;

  // The catalogue is public, but tracker, tenancy, and operational details never are.
  // Monitor-specific endpoints authorize access separately.
  return {
    ...publicFields,
    isMine,
    // A party may see the initial location through their own order; it remains
    // absent from public and unrelated catalogue entries.
    ...(isMine && obj.carInitLocation ? { carInitLocation: obj.carInitLocation } : {}),
  };
}

export function partyRentalQuery(userId: string) {
  return {
    $or: [{ carOwnerClerkId: userId }, { renteeClerkId: userId }],
  };
}

export function extractImeis(rentals: any[]): string[] {
  return [
    ...new Set(
      rentals.flatMap((r) => [r.carGPSId, r.carGPSSecretId]).filter(Boolean)
    ),
  ];
}
