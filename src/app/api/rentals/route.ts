import { NextResponse } from "next/server";
import { dbConnect, RentalCatalogue } from "@/db/model";
import { getMockData } from "@/lib/mock-data";

export async function GET(req: Request) {
  try {
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json(getMockData("RentalCatalogue"));
    }
    await dbConnect();
    const results = await RentalCatalogue.find().sort({ createdAt: -1 });
    return NextResponse.json(results);
  } catch (err: any) {
	  console.error("Error: ", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (process.env.NODE_ENV === "development") {
      const data = await req.json();
      return NextResponse.json({ _id: "mock_post_id", ...data, createdAt: new Date() });
    }
    await dbConnect();
    const data = await req.json();
    const result = await RentalCatalogue.create(data);
    return NextResponse.json(result);
  } catch (err: any) {
	  console.error("Error: ", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    if (process.env.NODE_ENV === "development") {
      const data = await req.json();
      return NextResponse.json({ ...data, updatedAt: new Date() });
    }
    await dbConnect();
    const data = await req.json();
    const { _id, ...updateData } = data;
    const result = await RentalCatalogue.findByIdAndUpdate(_id, updateData, { new: true });
    return NextResponse.json(result);
  } catch (err: any) {
	  console.error("Error: ", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({ success: true, message: "Mock deleted" });
    }
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await RentalCatalogue.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
	  console.error("Error: ", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
