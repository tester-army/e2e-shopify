"use client";

import clsx from "clsx";
import Image from "next/image";
import { useState } from "react";

import type { ProductImage } from "@/lib/shopify";

// The mockups' background, shown while a photo loads.
const PHOTO_BACKGROUND = "bg-[#e7e7e7]";

export function ProductGallery({ images }: { images: ProductImage[] }) {
  const [selected, setSelected] = useState(0);
  const image = images[selected];

  return (
    <div className={clsx("grid gap-2", images.length > 1 && "grid-cols-[3rem_minmax(0,1fr)]")}>
      {images.length > 1 && (
        // As tall as the photo; thumbnails that don't fit scroll. 4px of room keeps the focus outline unclipped.
        <div className="relative">
          <div className="absolute -inset-1 flex flex-col gap-2 overflow-y-auto p-1">
            {images.map((thumbnail, index) => (
              <button
                key={thumbnail.url}
                type="button"
                aria-label={thumbnail.altText ?? `Photo ${index + 1}`}
                aria-pressed={index === selected}
                onClick={() => setSelected(index)}
                className={clsx(
                  "size-12 shrink-0 border focus-visible:opacity-100 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-e2e-white-60",
                  index === selected
                    ? "border-e2e-text-bright"
                    : "border-e2e-hairline-strong opacity-60 hover:opacity-100",
                )}
              >
                <Image
                  src={thumbnail.url}
                  alt=""
                  width={thumbnail.width}
                  height={thumbnail.height}
                  sizes="48px"
                  className={clsx("size-full object-cover", PHOTO_BACKGROUND)}
                />
              </button>
            ))}
          </div>
        </div>
      )}
      <Image
        src={image.url}
        alt={image.altText ?? ""}
        width={image.width}
        height={image.height}
        sizes="(min-width: 1024px) 330px, 100vw"
        preload
        className={clsx("aspect-square w-full object-cover", PHOTO_BACKGROUND)}
      />
    </div>
  );
}
