import { NextResponse } from "next/server";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { dbConnect, Log, RentalCatalogue } from "@/db/model";
import { mockDB } from "@/lib/mock-data";
import { partyRentalQuery } from "@/lib/rental-access";

async function profile(id?: string) {
  if (!id) return null;
  try {
    const user = await (await clerkClient()).users.getUser(id);
    return {
      name: user.fullName || [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown user",
      imageUrl: user.imageUrl || "",
    };
  } catch {
    return { name: "Unknown user", imageUrl: "" };
  }
}

function isDiverged(publicLog: any, secretLog: any) {
  if (!publicLog || !secretLog) return false;
  return Math.hypot(
    parseFloat(publicLog.latitude) - parseFloat(secretLog.latitude),
    parseFloat(publicLog.longitude) - parseFloat(secretLog.longitude),
  ) > 0.005;
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const isAdmin = (await currentUser())?.publicMetadata?.role === "admin";

    const rentals = process.env.dev === "development"
      ? mockDB.RentalCatalogue.find().filter((r: any) => isAdmin || r.carOwnerClerkId === userId || r.renteeClerkId === userId)
      : await (async () => {
          await dbConnect();
          return RentalCatalogue.find(isAdmin ? {} : partyRentalQuery(userId)).lean();
        })();

    const imeis = rentals.flatMap((r: any) => [r.carGPSId, r.carGPSSecretId]).filter(Boolean);
    const logs = process.env.dev === "development"
      ? mockDB.Log.find().filter((log: any) => imeis.includes(log.carGPSIMEI))
      : await Log.find({ carGPSIMEI: { $in: imeis } }).sort({ createdAt: -1 }).lean();
    const latest = new Map<string, any>();
    logs
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .forEach((log: any) => { if (!latest.has(log.carGPSIMEI)) latest.set(log.carGPSIMEI, log); });

    const results = await Promise.all(rentals.map(async (rental: any) => ({
      _id: rental._id,
      carName: rental.carName,
      carModel: rental.carModel,
      carImageURL: rental.carImageURLs?.[0] || "",
      carGPSId: rental.carGPSId,
      owner: await profile(rental.carOwnerClerkId),
      renter: await profile(rental.renteeClerkId),
      stolen: isDiverged(latest.get(rental.carGPSId), latest.get(rental.carGPSSecretId)),
    })));

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unable to load monitor" }, { status: 500 });
  }
}
