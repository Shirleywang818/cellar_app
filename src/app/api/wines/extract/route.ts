import { NextResponse } from "next/server";
import {
  extractWineLabel,
  getLabelExtractionMeta,
  isEmptyExtraction,
} from "@/lib/ai/gateway";
import { uploadTempLabelImage } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json(
        { error: "Image file is required." },
        { status: 400 },
      );
    }

    const uploaded = await uploadTempLabelImage(image);
    const fields = await extractWineLabel({
      imageBytes: uploaded.bytes,
      mimeType: uploaded.mimeType,
    });

    return NextResponse.json({
      fields,
      photo_path: uploaded.path,
      extraction_meta: getLabelExtractionMeta(fields),
      fallback: isEmptyExtraction(fields),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to extract wine label.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
