import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import data from "@/content/commands.json";
import { categoryAnchor } from "@/components/reference/anchor";
import { CommandDetails } from "@/components/reference/command-details";
import { Mark } from "@/components/reference/mark";
import type { Support } from "@/components/reference/mark";
import { commandExamples } from "@/lib/command-examples";
import {
  commandBySlug,
  commandDescription,
  commandSlug,
  neighbors,
} from "@/lib/reference";

export function generateStaticParams() {
  return data.commands.map((command) => ({
    command: commandSlug(command.code),
  }));
}

export async function generateMetadata(
  props: PageProps<"/reference/[command]">
): Promise<Metadata> {
  const { command: slug } = await props.params;
  const command = commandBySlug(slug);
  if (!command) notFound();
  return {
    title: `${command.code} ${command.name}`,
    description: commandDescription(command.code),
    alternates: { canonical: `/reference/${slug}` },
    openGraph: { images: `/og/reference/${slug}/image.png` },
  };
}

const support: Record<Support, string> = {
  yes: "Supported by zplkit",
  partial: "Partly supported by zplkit",
  no: "Not supported by zplkit yet",
};

export default async function CommandPage(
  props: PageProps<"/reference/[command]">
) {
  const { command: slug } = await props.params;
  const command = commandBySlug(slug);
  if (!command) notFound();
  const image = (await commandExamples()).get(command.code);
  const { previous, next } = neighbors(command.code);

  return (
    <main className="@container mx-auto w-full max-w-[1080px] px-[clamp(16px,4cqi,48px)] pb-16 pt-[clamp(24px,4cqi,44px)]">
      <nav
        aria-label="Breadcrumb"
        className="mb-4 flex gap-1.5 text-[14px] text-muted"
      >
        <Link href="/reference" className="hover:text-ink">
          Reference
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href={`/reference#${categoryAnchor(command.category)}`}
          className="hover:text-ink"
        >
          {command.category}
        </Link>
      </nav>

      <h1 className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="font-mono text-[clamp(32px,4cqi,44px)] font-bold leading-[1.05]">
          {command.code}
        </span>
        <span className="text-[clamp(22px,2.6cqi,28px)] font-extrabold leading-[1.15] [font-stretch:108%]">
          {command.name}
        </span>
      </h1>

      <p className="mt-3 flex flex-wrap items-center gap-2 text-[14px] text-ink-2">
        <Mark value={command.support as Support} />
        {support[command.support as Support]}
        {command.note && <span className="text-warn">· {command.note}</span>}
      </p>

      <div className="mt-6 border-t border-rule pt-5">
        <CommandDetails command={command} image={image} />
      </div>

      <nav
        aria-label="Other commands"
        className="mt-8 flex justify-between gap-4 border-t border-rule pt-5 text-[14px]"
      >
        {previous ? (
          <Link
            href={`/reference/${commandSlug(previous.code)}`}
            className="group flex flex-col"
          >
            <span className="text-muted">Previous</span>
            <span className="text-ink group-hover:text-accent">
              <span className="font-mono font-semibold">{previous.code}</span>{" "}
              {previous.name}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/reference/${commandSlug(next.code)}`}
            className="group flex flex-col text-right"
          >
            <span className="text-muted">Next</span>
            <span className="text-ink group-hover:text-accent">
              <span className="font-mono font-semibold">{next.code}</span>{" "}
              {next.name}
            </span>
          </Link>
        )}
      </nav>
    </main>
  );
}
