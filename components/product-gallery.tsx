"use client";

import clsx from "clsx";
import Image from "next/image";
import { useState } from "react";

import type { ProductImage } from "@/lib/shopify";

// The mockups' own background, shown while a photo loads.
const PHOTO_BACKGROUND = "bg-[#e7e7e7]";

// Opens on the featured image, with a thumbnail for every image.
export function ProductGallery({
  images,
  featuredImageUrl,
}: {
  images: ProductImage[];
  featuredImageUrl: string | null;
}) {
  const [selected, setSelected] = useState(() =>
    Math.max(
      0,
      images.findIndex(({ url }) => url === featuredImageUrl),
    ),
  );
  const image = images[selected];

  return (
    <div className="flex flex-col gap-2">
      <Image
        src={image.url}
        alt={image.altText ?? ""}
        width={image.width}
        height={image.height}
        sizes="(min-width: 1024px) 380px, 100vw"
        preload
        className={clsx("aspect-square w-full object-cover", PHOTO_BACKGROUND)}
      />
      {images.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {images.map((thumbnail, index) => (
            <button
              key={thumbnail.url}
              type="button"
              aria-label={thumbnail.altText ?? `Photo ${index + 1}`}
              aria-pressed={index === selected}
              onClick={() => setSelected(index)}
              className={clsx(
                "size-14 ring-1 transition-[box-shadow,opacity] motion-reduce:transition-none",
                "focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-e2e-white-60",
                index === selected ? "ring-e2e-text-bright" : "opacity-60 ring-e2e-hairline-strong hover:opacity-100",
              )}
            >
              <Image
                src={thumbnail.url}
                alt=""
                width={thumbnail.width}
                height={thumbnail.height}
                sizes="56px"
                className={clsx("size-full object-cover", PHOTO_BACKGROUND)}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
