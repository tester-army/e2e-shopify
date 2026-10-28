import Image from "next/image";

export default function Home() {
  return (
    <div className="bg-zinc-50 dark:bg-black flex flex-1 flex-col items-center justify-center font-sans">
      <main className="bg-white dark:bg-black flex w-full max-w-3xl flex-1 flex-col items-center justify-between px-16 py-32 sm:items-start">
        <Image
          className="h-5 w-[100px] dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="text-black dark:text-zinc-50 max-w-xs text-3xl leading-10 font-semibold tracking-tight">
            To get started, edit the{" "}
            <code className="bg-black/[.06] dark:bg-white/[.08] rounded px-1.5 py-0.5 font-mono text-[0.9em]">
              page.tsx
            </code>{" "}
            file.
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-md text-lg leading-8">
            Looking for a starting point or more instructions? Head over to{" "}
            <a
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="text-zinc-950 dark:text-zinc-50 font-medium"
            >
              Templates
            </a>{" "}
            or the{" "}
            <a
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="text-zinc-950 dark:text-zinc-50 font-medium"
            >
              Learning
            </a>{" "}
            center.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="bg-foreground text-background flex h-12 w-full items-center justify-center gap-2 rounded-full px-5 transition-colors hover:bg-[#383838] md:w-[158px] dark:hover:bg-[#ccc]"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="h-[14px] w-4 dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={14}
            />
            Deploy Now
          </a>
          <a
            className="border-black/[.08] hover:bg-black/[.04] dark:border-white/[.145] flex h-12 w-full items-center justify-center rounded-full border border-solid px-5 transition-colors hover:border-transparent md:w-[158px] dark:hover:bg-[#1a1a1a]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
