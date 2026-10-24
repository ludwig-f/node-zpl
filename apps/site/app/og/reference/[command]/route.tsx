import { notFound } from "next/navigation";
import { generateOGImage } from "fumadocs-ui/og";
import data from "@/content/commands.json";
import { appName } from "@/lib/shared";
import {
  commandBySlug,
  commandDescription,
  commandSlug,
} from "@/lib/reference";

export const revalidate = false;

/** The link preview for a command's page: /og/reference/BC/image.png */
export async function GET(
  _req: Request,
  { params }: RouteContext<"/og/reference/[command]">
) {
  const { command: slug } = await params;
  const command = commandBySlug(slug);
  if (!command) notFound();

  return generateOGImage({
    title: `${command.code} ${command.name}`,
    description: commandDescription(command.code),
    site: appName,
  });
}

export function generateStaticParams() {
  return data.commands.map((command) => ({
    command: commandSlug(command.code),
  }));
}
