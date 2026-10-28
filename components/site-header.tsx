import Image from "next/image";
import Link from "next/link";

const E2E_DOCS_URL = "https://e2e.tester.army/docs";

export function SiteHeader() {
  return (
    <header className="px-6 pt-6 sm:px-10">
      <div className="mx-auto flex h-9 max-w-300 items-center justify-between">
        <Link href="/" aria-label="Home" className="flex items-center gap-2.5 sm:gap-3">
          <Image
            src="/e2e/logo-white.png"
            alt=""
            width={168}
            height={168}
            sizes="32px"
            preload
            className="size-8 object-contain"
          />
          <span aria-hidden="true" className="type-brand-slash text-e2e-text-primary">
            /
          </span>
          <span className="type-brand text-e2e-text-primary">e2e</span>
        </Link>
        <a
          href={E2E_DOCS_URL}
          target="_blank"
          rel="noreferrer"
          className="type-nav text-e2e-text-soft transition-colors hover:text-e2e-text-bright motion-reduce:transition-none"
        >
          docs
        </a>
      </div>
    </header>
  );
}
