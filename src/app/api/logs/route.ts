import { NextResponse } from "next/server";
import { dbConnect, Log, RentalCatalogue } from "@/db/model";
import { auth, currentUser } from "@clerk/nextjs/server";
import { mockDB } from "@/lib/mock-data";

export async function GET(req: Request) {
  try {
    if (process.env.dev === "development") {
      const { userId } = await auth();
      if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const role = (await currentUser())?.publicMetadata?.role;
      let results = mockDB.Log.find();
      if (role !== "admin") {
        const userRentals = mockDB.RentalCatalogue.find({ renteeClerkId: userId });
        const imeis = userRentals.flatMap((r: any) => [r.carGPSId, r.carGPSSecretId]).filter(Boolean);
        results = results.filter((l: any) => imeis.includes(l.carGPSIMEI));
      }
      results.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return NextResponse.json(results);
    }
    await dbConnect();
    
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (await currentUser())?.publicMetadata?.role;
    let filter = {};
    if (role !== "admin") {
      const userRentals = await RentalCatalogue.find({ renteeClerkId: userId }).lean();
      const imeis = userRentals.flatMap((r: any) => [r.carGPSId, r.carGPSSecretId]).filter(Boolean);
      filter = { carGPSIMEI: { $in: imeis } };
    }

    const results = await Log.find(filter).sort({ createdAt: -1 });
    return NextResponse.json(results);
  } catch (err: any) {
	  console.error("Error: ", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (process.env.dev === "development") {
      const data = await req.json();
      if (Array.isArray(data)) {
         const results = data.map(d => mockDB.Log.create(d));
         return NextResponse.json(results);
      }
      return NextResponse.json(mockDB.Log.create(data));
    }
    await dbConnect();
    const data = await req.json();
    let result;
    if (Array.isArray(data)) {
        result = await Log.insertMany(data);
    } else {
        result = await Log.create(data);
    }
    return NextResponse.json(result);
  } catch (err: any) {
	  console.error("Error: ", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    if (process.env.dev === "development") {
      const data = await req.json();
      const { _id, ...updateData } = data;
      return NextResponse.json(mockDB.Log.findByIdAndUpdate(_id, updateData));
    }
    await dbConnect();
    const data = await req.json();
    const { _id, ...updateData } = data;
    const result = await Log.findByIdAndUpdate(_id, updateData, { new: true });
    return NextResponse.json(result);
  } catch (err: any) {
	  console.error("Error: ", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (process.env.dev === "development") {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get("id");
      if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
      mockDB.Log.findByIdAndDelete(id);
      return NextResponse.json({ success: true });
    }
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await Log.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
	  console.error("Error: ", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
