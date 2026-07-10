import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "";

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
  return cached.conn;
}

// INFO: Schemas
const orderSchema = new mongoose.Schema({
  userClerkId: String, // ClerkId
  rentCatalogueId: String, // MongoDB ObjectId
  status: String, // "Pending" | "Delivered" | "Cancelled"
  details: String,
  __more: String,
}, { timestamps: true });

const rentalCatalogueSchema = new mongoose.Schema({
  carOwnerClerkId: String, // ClerkId
  renteeClerkId: String, // ClerkId

  carImageURL: String,
  carName: String,
  carModel: String,
  description: String,
  moreDetails: String,

  pricePerMonth: Number,
  carGPSId: String, // MongoDB ObjectId
  lastServiceDate: Date,
  carInitLocation: String, // "lat, long"
  maxRadOfBoundFromInitLoc: Number, // meters
  isRented: Boolean,
  __more: String,
}, { timestamps: true });

const carGPSSchema = new mongoose.Schema({
  carGPSIMEI: String,
  renteeClerkId: String, // ClerkId
  secretGPS: Boolean,
  __more: String,
}, { timestamps: true });

const logSchema = new mongoose.Schema({
  carGPSIMEI: String,
  latitude: String,
  longitude: String,
  __more: String,
}, { timestamps: true });

// INFO: Interfaces
export const Order = 
  mongoose.models.Order || 
  mongoose.model("Order", orderSchema);

export const RentalCatalogue = 
  mongoose.models.RentalCatalogue || 
  mongoose.model("RentalCatalogue", rentalCatalogueSchema);

export const CarGPS =
  mongoose.models.CarGPS ||
  mongoose.model("CarGPS", carGPSSchema);

export const Log =
  mongoose.models.Log ||
  mongoose.model("Log", logSchema);
