import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadPhotoToR2, deletePhotoFromR2, extractR2KeyFromUrl } from "@/lib/r2";
import { withRateLimit, createRateLimitResponse } from "@/lib/rate-limit";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ============================================
    // RATE LIMITING: FILE_UPLOAD
    // Max 10 uploads per hour, block for 1 hour
    // User-based rate limiting for accuracy
    // ============================================
    const rateLimitResult = await withRateLimit(
      request,
      "FILE_UPLOAD",
      session.user.id
    );
    if (rateLimitResult instanceof NextResponse) {
      return rateLimitResult;
    }

    const formData = await request.formData();
    const file = formData.get("photo") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WebP images are allowed." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get current user
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { photoUrl: true },
    });

    // Delete old photo if exists
    if (user?.photoUrl) {
      const oldKey = extractR2KeyFromUrl(user.photoUrl);
      if (oldKey) {
        try {
          await deletePhotoFromR2(oldKey);
        } catch (error) {
          console.warn("Failed to delete old photo:", error);
          // Continue even if deletion fails
        }
      }
    }

    // Upload new photo to R2
    const { url } = await uploadPhotoToR2(
      buffer,
      file.name,
      session.user.id,
      file.type
    );

    // Update user record
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: { photoUrl: url },
      select: {
        id: true,
        name: true,
        email: true,
        photoUrl: true,
        role: true,
      },
    });

    return createRateLimitResponse(
      {
        success: true,
        photoUrl: url,
        user: updatedUser,
      },
      rateLimitResult
    );
  } catch (error) {
    console.error("Error uploading photo:", error);
    
    if (error instanceof Error && error.message.includes("R2 is not configured")) {
      return NextResponse.json(
        { error: "Photo upload is not configured. Please contact administrator." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { photoUrl: true },
    });

    if (!user?.photoUrl) {
      return NextResponse.json(
        { error: "No photo to delete" },
        { status: 404 }
      );
    }

    // Delete photo from R2
    const key = extractR2KeyFromUrl(user.photoUrl);
    if (key) {
      try {
        await deletePhotoFromR2(key);
      } catch (error) {
        console.warn("Failed to delete photo from R2:", error);
        // Continue even if R2 deletion fails
      }
    }

    // Update user record
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: { photoUrl: null },
      select: {
        id: true,
        name: true,
        email: true,
        photoUrl: true,
        role: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error deleting photo:", error);
    return NextResponse.json(
      { error: "Failed to delete photo" },
      { status: 500 }
    );
  }
}
