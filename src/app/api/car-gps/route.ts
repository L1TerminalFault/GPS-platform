import { NextResponse } from "next/server";
import { dbConnect, CarGPS, CarGPSSecret, RentalCatalogue } from "@/db/model";
import { auth, currentUser } from "@clerk/nextjs/server";
import { mockDB } from "@/lib/mock-data";

export async function GET(req: Request) {
	console.log("dev: ", process.env.dev);
  try {
    if (process.env.dev === "development") {
      const { userId } = await auth();
      if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const role = (await currentUser())?.publicMetadata?.role;
      const rentals = role === "admin" ? [] : mockDB.RentalCatalogue.find({ renteeClerkId: userId });
      const imeis = rentals.flatMap((r: any) => [r.carGPSId, r.carGPSSecretId]).filter(Boolean);
      const matches = (gps: any) => role === "admin" || imeis.includes(gps.carGPSIMEI);
      const pubResults = mockDB.CarGPS.find().filter(matches).map((r: any) => ({ ...r, secretGPS: false }));
      const secResults = mockDB.CarGPSSecret.find().filter(matches).map((r: any) => ({ ...r, secretGPS: true }));
      const results = [...pubResults, ...secResults].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return NextResponse.json(results);
    }
    await dbConnect();

    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (await currentUser())?.publicMetadata?.role;
    let filter: any = {};
    if (role !== "admin") {
      const rentals = await RentalCatalogue.find({ renteeClerkId: userId }).lean();
      const imeis = rentals.flatMap((r: any) => [r.carGPSId, r.carGPSSecretId]).filter(Boolean);
      filter = { carGPSIMEI: { $in: imeis } };
    }
    
    const pubResults = await CarGPS.find(filter).lean();
    const secResults = await CarGPSSecret.find(filter).lean();
    const results = [
      ...pubResults.map((r: any) => ({ ...r, secretGPS: false })),
      ...secResults.map((r: any) => ({ ...r, secretGPS: true }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json(results);
  } catch (err: any) {
	  console.error("Error: ", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (await currentUser())?.publicMetadata?.role;
    if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const data = await req.json();
    const isSecret = data.secretGPS === true;
    delete data.secretGPS;

    let transaction;
    if (process.env.dev === "development") {
      transaction = isSecret ? mockDB.CarGPSSecret.create(data) : mockDB.CarGPS.create(data);
    } else {
      await dbConnect();
      transaction = isSecret ? await CarGPSSecret.create(data) : await CarGPS.create(data);
    }

    return NextResponse.json(transaction);
  } catch (err: any) {
	  console.error("Error: ", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (await currentUser())?.publicMetadata?.role;
    if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (process.env.dev === "development") {
      const data = await req.json();
      const { _id, ...updateData } = data;
      return NextResponse.json(mockDB.CarGPS.findByIdAndUpdate(_id, updateData));
    }
    await dbConnect();
    const data = await req.json();
    const { _id, ...updateData } = data;
    const transaction = await CarGPS.findByIdAndUpdate(_id, updateData, { new: true });
    return NextResponse.json(transaction);
  } catch (err: any) {
	  console.error("Error: ", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (await currentUser())?.publicMetadata?.role;
    if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (process.env.dev === "development") {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get("id");
      if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
      mockDB.CarGPS.findByIdAndDelete(id);
      return NextResponse.json({ success: true });
    }
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await CarGPS.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
	  console.error("Error: ", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
