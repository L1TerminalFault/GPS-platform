import { NextResponse } from "next/server";
import { dbConnect, Order, RentalCatalogue } from "@/db/model";
import { auth, currentUser } from "@clerk/nextjs/server";
import { mockDB } from "@/lib/mock-data";
import { serializeRental } from "@/lib/rental-access";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    const role = userId ? (await currentUser())?.publicMetadata?.role : undefined;
    const isAdmin = role === "admin";
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (process.env.dev === "development") {
      if (id) {
        const res = mockDB.RentalCatalogue.findById(id);
        if (!res) return NextResponse.json({ error: "Not found" }, { status: 404 });
        // if (!isAdmin && res.isRented && res.carOwnerClerkId !== userId && res.renteeClerkId !== userId) {
        //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        // }
        return NextResponse.json(serializeRental(res, { isAdmin, userId }));
      }
      let results = mockDB.RentalCatalogue.find();
      // if (!isAdmin) {
      //    results = results.filter((r: any) => !r.isRented || r.carOwnerClerkId === userId || r.renteeClerkId === userId);
      // }
      results.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return NextResponse.json(results.map((r: any) => serializeRental(r, { isAdmin, userId })));
    }
    const filter = {};

    if (id) {
      const result = await RentalCatalogue.findById(id);
      if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(serializeRental(result, { isAdmin, userId }));
    }
    const results = await RentalCatalogue.find(filter).sort({ createdAt: -1 });
    return NextResponse.json(results.map((r: any) => serializeRental(r, { isAdmin, userId })));
  } catch (err: any) {
	  console.error("Error: ", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (process.env.dev === "development") {
      const data = await req.json();
      return NextResponse.json(mockDB.RentalCatalogue.create({ ...data, carOwnerClerkId: userId }));
    }
    await dbConnect();
    const data = await req.json();
    const result = await RentalCatalogue.create({ ...data, carOwnerClerkId: userId });
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
    if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const data = await req.json();
    const { action, orderId, publicGPSIMEI, secretGPSIMEI } = data;

    if (action === "deliver-order") {
      if (!orderId || !publicGPSIMEI?.trim() || !secretGPSIMEI?.trim()) {
        return NextResponse.json({ error: "Order ID and both GPS IMEIs are required" }, { status: 400 });
      }
      if (publicGPSIMEI.trim() === secretGPSIMEI.trim()) {
        return NextResponse.json({ error: "Public and secret GPS IMEIs must be different" }, { status: 400 });
      }

      if (process.env.dev === "development") {
        const order = mockDB.Order.findById(orderId);
        if (!order || order.status?.toLowerCase() !== "pending") return NextResponse.json({ error: "Pending order not found" }, { status: 409 });
        const rental = mockDB.RentalCatalogue.findById(order.rentCatalogueId);
        if (!rental || rental.isRented) return NextResponse.json({ error: "Rental is no longer available" }, { status: 409 });
        const updatedRental = mockDB.RentalCatalogue.findByIdAndUpdate(rental._id, {
          isRented: true, renteeClerkId: order.userClerkId,
          carGPSId: publicGPSIMEI.trim(), carGPSSecretId: secretGPSIMEI.trim(),
        });
        const updatedOrder = mockDB.Order.findByIdAndUpdate(orderId, { status: "Delivered" });
        return NextResponse.json({ rental: updatedRental, order: updatedOrder });
      }

      await dbConnect();
      const order = await Order.findById(orderId);
      if (!order || order.status?.toLowerCase() !== "pending") return NextResponse.json({ error: "Pending order not found" }, { status: 409 });
      const rental = await RentalCatalogue.findById(order.rentCatalogueId);
      if (!rental || rental.isRented) return NextResponse.json({ error: "Rental is no longer available" }, { status: 409 });
      rental.set({ isRented: true, renteeClerkId: order.userClerkId, carGPSId: publicGPSIMEI.trim(), carGPSSecretId: secretGPSIMEI.trim() });
      order.status = "Delivered";
      await Promise.all([rental.save(), order.save()]);
      return NextResponse.json({ rental, order });
    }

    if (action === "unrent") {
      const rentalId = data._id;
      if (!rentalId) return NextResponse.json({ error: "Rental ID required" }, { status: 400 });

      if (process.env.dev === "development") {
        const rental = mockDB.RentalCatalogue.findById(rentalId);
        if (!rental) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!rental.isRented) return NextResponse.json({ error: "Rental is not currently rented" }, { status: 409 });
        const updated = mockDB.RentalCatalogue.findByIdAndUpdate(rentalId, {
          isRented: false,
          renteeClerkId: "",
        });
        return NextResponse.json(updated);
      }

      await dbConnect();
      const rental = await RentalCatalogue.findById(rentalId);
      if (!rental) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (!rental.isRented) return NextResponse.json({ error: "Rental is not currently rented" }, { status: 409 });
      rental.set({ isRented: false, renteeClerkId: "" });
      await rental.save();
      return NextResponse.json(rental);
    }

    if (action === "update-gps") {
      const rentalId = data._id;
      if (!rentalId) return NextResponse.json({ error: "Rental ID required" }, { status: 400 });
      if (!publicGPSIMEI?.trim() || !secretGPSIMEI?.trim()) {
        return NextResponse.json({ error: "Both GPS IMEIs are required" }, { status: 400 });
      }
      if (publicGPSIMEI.trim() === secretGPSIMEI.trim()) {
        return NextResponse.json({ error: "Public and secret GPS IMEIs must be different" }, { status: 400 });
      }

      if (process.env.dev === "development") {
        const rental = mockDB.RentalCatalogue.findById(rentalId);
        if (!rental) return NextResponse.json({ error: "Not found" }, { status: 404 });
        const updated = mockDB.RentalCatalogue.findByIdAndUpdate(rentalId, {
          carGPSId: publicGPSIMEI.trim(),
          carGPSSecretId: secretGPSIMEI.trim(),
        });
        return NextResponse.json(updated);
      }

      await dbConnect();
      const rental = await RentalCatalogue.findById(rentalId);
      if (!rental) return NextResponse.json({ error: "Not found" }, { status: 404 });
      rental.set({
        carGPSId: publicGPSIMEI.trim(),
        carGPSSecretId: secretGPSIMEI.trim(),
      });
      await rental.save();
      return NextResponse.json(rental);
    }

    if ("isRented" in data || "renteeClerkId" in data || "carGPSId" in data || "carGPSSecretId" in data) {
      return NextResponse.json({ error: "Rental assignment is only allowed through the delivery workflow" }, { status: 400 });
    }

    if (process.env.dev === "development") {
      const { _id, ...updateData } = data;
      return NextResponse.json(mockDB.RentalCatalogue.findByIdAndUpdate(_id, updateData));
    }
    await dbConnect();
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
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (await currentUser())?.publicMetadata?.role;
    if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (process.env.dev === "development") {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get("id");
      if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
      mockDB.RentalCatalogue.findByIdAndDelete(id);
      return NextResponse.json({ success: true });
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
