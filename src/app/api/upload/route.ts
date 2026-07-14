import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const { data, folder } = await req.json();
    if (!data) return NextResponse.json({ error: "Missing file data" }, { status: 400 });

    const result = await cloudinary.uploader.upload(data, {
      folder: folder || "gps_platform",
      resource_type: "auto",
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (error: any) {
    console.error("Cloudinary Upload Error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload to Cloudinary" }, { status: 500 });
  }
}
