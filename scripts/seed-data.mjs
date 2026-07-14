import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI);

const carGPSSchema = new mongoose.Schema({
  carGPSIMEI: String,
  renteeClerkId: String,
  secretGPS: Boolean,
  __more: String,
}, { timestamps: true });

const rentalCatalogueSchema = new mongoose.Schema({
  carOwnerClerkId: String,
  renteeClerkId: String,
  carImageURLs: [String],
  carName: String,
  carModel: String,
  legalDocumentURLs: [String],
  description: String,
  moreDetails: String,
  pricePerMonth: Number,
  carGPSId: String,
  lastServiceDate: Date,
  carInitLocation: String,
  maxRadOfBoundFromInitLoc: Number,
  isRented: Boolean,
  __more: String,
}, { timestamps: true });

const CarGPS = mongoose.models.CarGPS || mongoose.model("CarGPS", carGPSSchema);
const RentalCatalogue = mongoose.models.RentalCatalogue || mongoose.model("RentalCatalogue", rentalCatalogueSchema);

async function seed() {
  try {
    console.log("Emptying old db models...");
    await CarGPS.deleteMany({});
    await RentalCatalogue.deleteMany({});

    console.log("Uploading random placeholder image to Cloudinary...");
    // Uploading a simple placeholder to Cloudinary
    const imgRes = await cloudinary.uploader.upload('https://via.placeholder.com/600x400.png?text=Tracker+Car', {
      folder: 'gps_platform_cars'
    });
    console.log("Uploaded mock image: ", imgRes.secure_url);

    const imeiBase = Array.from({ length: 15 }, () => Math.floor(Math.random() * 10)).join('');

    console.log("Seeding CarGPS...");
    const primaryGps = await CarGPS.create({
      carGPSIMEI: imeiBase,
      renteeClerkId: "mock_rentee_user_1",
      secretGPS: false
    });
    const backupGps = await CarGPS.create({
      carGPSIMEI: "SEC_" + imeiBase,
      renteeClerkId: "mock_rentee_user_1",
      secretGPS: true
    });

    console.log("Seeding RentalCatalogue...");
    await RentalCatalogue.create({
      carOwnerClerkId: "mock_owner_user_1",
      renteeClerkId: "mock_rentee_user_1",
      carImageURLs: [imgRes.secure_url],
      carName: "Toyota Corolla",
      carModel: "2021",
      legalDocumentURLs: [],
      description: "A very reliable tracking demo car.",
      moreDetails: "Seeded from mock script.",
      pricePerMonth: 450,
      carGPSId: primaryGps._id.toString(),
      lastServiceDate: new Date(),
      carInitLocation: "9.0300, 38.7400",
      maxRadOfBoundFromInitLoc: 50000,
      isRented: true
    });

    console.log("Seed successful.");
    process.exit(0);

  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

seed();
