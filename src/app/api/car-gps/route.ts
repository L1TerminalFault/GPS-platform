import { NextResponse } from "next/server";
import { dbConnect, CarGPS } from "@/db/model";
import { getMockData } from "@/lib/mock-data";

export async function GET(req: Request) {
  try {
    // if (process.env.NODE_ENV === "development") {
    if (true) {
      return NextResponse.json(getMockData("CarGPS"));
    }
    await dbConnect();
    const results = await CarGPS.find().sort({ createdAt: -1 });
    return NextResponse.json(results);
  } catch (err: any) {
	  console.error("Error: ", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // if (process.env.NODE_ENV === "development") {
    if (true) {
      const data = await req.json();
      return NextResponse.json({ _id: "mock_post_id", ...data, createdAt: new Date() });
    }
    await dbConnect();
    const data = await req.json();
    const transaction = await CarGPS.create(data);
    return NextResponse.json(transaction);
  } catch (err: any) {
	  console.error("Error: ", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    // if (process.env.NODE_ENV === "development") {
    if (true) {
      const data = await req.json();
      return NextResponse.json({ ...data, updatedAt: new Date() });
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
    // if (process.env.NODE_ENV === "development") {
    if (true) {
      return NextResponse.json({ success: true, message: "Mock deleted" });
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
