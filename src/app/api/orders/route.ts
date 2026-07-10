import { NextResponse } from "next/server";
import { dbConnect, Order } from "@/db/model";
import { getMockData } from "@/lib/mock-data";

export async function GET(req: Request) {
  try {
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json(getMockData("Order"));
    }
    await dbConnect();
    const results = await Order.find().sort({ createdAt: -1 });
    return NextResponse.json(results);
  } catch (err: any) {
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
    const result = await Order.create(data);
    return NextResponse.json(result);
  } catch (err: any) {
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
    const result = await Order.findByIdAndUpdate(_id, updateData, { new: true });
    return NextResponse.json(result);
  } catch (err: any) {
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
    await Order.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
