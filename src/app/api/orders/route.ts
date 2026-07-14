import { NextResponse } from "next/server";
import { dbConnect, Order } from "@/db/model";
import { auth, currentUser } from "@clerk/nextjs/server";
import { mockDB } from "@/lib/mock-data";

export async function GET(req: Request) {
  try {
    if (process.env.dev === "development") {
      const { userId, sessionClaims } = await auth();
      console.log(userId);
      if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const role = (await currentUser())?.publicMetadata?.role;
      let filter: any = {};
      if (role !== "admin") {
        filter.userClerkId = userId;
      }
      const results = mockDB.Order.find(filter).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return NextResponse.json(results);
    }
    await dbConnect();
    
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (await currentUser())?.publicMetadata?.role;
    let filter = {};
    if (role !== "admin") {
      filter = { userClerkId: userId };
    }

    const results = await Order.find(filter).sort({ createdAt: -1 });
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
    const data = await req.json();
    if (!data.rentCatalogueId) return NextResponse.json({ error: "Rental ID required" }, { status: 400 });
    if (process.env.dev === "development") {
      const rental = mockDB.RentalCatalogue.findById(data.rentCatalogueId);
      if (!rental || rental.isRented) return NextResponse.json({ error: "Rental is unavailable" }, { status: 409 });
      return NextResponse.json(mockDB.Order.create({ rentCatalogueId: data.rentCatalogueId, details: data.details || "", userClerkId: userId, status: "Pending" }));
    }
    await dbConnect();
    const rental = await (await import("@/db/model")).RentalCatalogue.findById(data.rentCatalogueId);
    if (!rental || rental.isRented) return NextResponse.json({ error: "Rental is unavailable" }, { status: 409 });
    const result = await Order.create({ rentCatalogueId: data.rentCatalogueId, details: data.details || "", userClerkId: userId, status: "Pending" });
    return NextResponse.json(result);
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
    const data = await req.json();
    const { _id, status } = data;
    if (!_id || !status) return NextResponse.json({ error: "Order ID and status required" }, { status: 400 });
    if (status === "Delivered") return NextResponse.json({ error: "Deliver orders from the rental assignment page" }, { status: 400 });
    if (status !== "Cancelled") return NextResponse.json({ error: "Only pending orders can be cancelled here" }, { status: 400 });

    if (process.env.dev === "development") {
      const order = mockDB.Order.findById(_id);
      if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (role !== "admin" && order.userClerkId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      return NextResponse.json(mockDB.Order.findByIdAndUpdate(_id, { status }));
    }
    await dbConnect();
    const order = await Order.findById(_id);
    if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (role !== "admin" && order.userClerkId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const result = await Order.findByIdAndUpdate(_id, { status }, { new: true });
    return NextResponse.json(result);
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
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    if (process.env.dev === "development") {
      const order = mockDB.Order.findById(id);
      if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (role !== "admin" && order.userClerkId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      mockDB.Order.findByIdAndDelete(id);
      return NextResponse.json({ success: true });
    }
    await dbConnect();
    const order = await Order.findById(id);
    if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (role !== "admin" && order.userClerkId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await Order.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
	  console.error("Error: ", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
