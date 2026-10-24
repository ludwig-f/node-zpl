import data from "@/content/commands.json";
import details from "@/content/command-details.json";
import { anchorOf } from "./anchor";
import { apiFor } from "./api-links";
import { FadeInImage } from "./fade-in-image";

type Command = (typeof data.commands)[number];
type Param = {
  name: string;
  description: string;
  values?: string;
  default?: string;
};

type Details = {
  summary: string;
  syntax: string;
  params?: (Param | [string, string])[];
  example?: string;
};

/** Parameters as objects, whichever shape the data has */
const paramsOf = (info: Details): Param[] =>
  (info.params ?? []).map((param) =>
    Array.isArray(param) ? { name: param[0], description: param[1] } : param
  );

const detailsOf = (code: string) =>
  (details as unknown as Record<string, Details | undefined>)[code];

/** An example's image, rendered at build time, by command code */
type Examples = Record<string, { file: string; width: number; height: number }>;

export function CommandDetails({
  command,
  image,
  showPageLink = false,
}: {
  command: Command;
  image?: Examples[string];
  /** A link to the command's own page, for the table's panels */
  showPageLink?: boolean;
}) {
  const info = detailsOf(command.code);
  if (!info) return null;
  const params = paramsOf(info);
  const hasDefaults = params.some((param) => param.default);
  const api = command.support !== "no" ? apiFor[command.code] : undefined;
  const label =
    "font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-muted";
  const page = `/reference/${anchorOf(command.code)}`;
  return (
    <div className="@container pb-5 pt-1">
      {/* Text on the left, what the example prints on the right */}
      <div className="grid gap-x-8 gap-y-5 text-[14px] leading-[1.55] @[720px]:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 max-w-[68ch] flex-col gap-4">
          <p className="text-ink-2">{info.summary}</p>

          {showPageLink && (
            <a
              href={page}
              className="w-fit text-[13.5px] font-semibold text-accent hover:underline"
            >
              Open the {command.code} page
            </a>
          )}

          <div className="flex flex-col gap-1.5">
            <span className={label}>Format</span>
            <code className="w-fit rounded-[3px] bg-code-inline px-1.5 py-0.5 font-mono text-[13px] text-ink">
              {info.syntax}
            </code>
          </div>

          {params.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-rule">
              <table className="w-full border-separate border-spacing-0 text-left text-[13.5px]">
                <thead>
                  <tr>
                    {["Parameter", "Description", hasDefaults && "Default"]
                      .filter(Boolean)
                      .map((heading) => (
                        <th
                          key={heading as string}
                          className={`border-b border-rule bg-raised px-3 py-1.5 ${label}`}
                        >
                          {heading}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {params.map((param) => (
                    <tr
                      key={param.name}
                      className="align-top [&:last-child>td]:border-b-0"
                    >
                      <td className="border-b border-rule px-3 py-1.5">
                        <code className="font-mono text-[13px] font-semibold text-ink">
                          {param.name}
                        </code>
                      </td>
                      <td className="border-b border-rule px-3 py-1.5 text-ink-2">
                        {param.description}
                        {param.values && (
                          <span className="block text-muted">
                            {param.values}
                          </span>
                        )}
                      </td>
                      {hasDefaults && (
                        <td className="border-b border-rule px-3 py-1.5 text-muted">
                          {param.default}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {info.example && (
            <div className="flex flex-col gap-1.5">
              <span className={label}>Example</span>
              <pre className="overflow-x-auto rounded-md border border-rule-strong bg-code px-3 py-2.5 font-mono text-[13px] leading-[1.7] text-ink">
                {info.example}
              </pre>
            </div>
          )}

          {api && (
            <p className="text-ink-2">
              In zplkit:{" "}
              <a
                href={`/docs/api/label#${api.method.toLowerCase()}`}
                className="font-mono text-[13px] text-accent hover:underline"
              >
                label.{api.method}()
              </a>
              {api.element && (
                <>
                  {" "}
                  or{" "}
                  <a
                    href={`/docs/api/jsx#${api.element.toLowerCase()}`}
                    className="font-mono text-[13px] text-accent hover:underline"
                  >
                    &lt;{api.element}&gt;
                  </a>
                </>
              )}
            </p>
          )}
        </div>

        {image && (
          <div className="@[720px]:sticky @[720px]:top-[calc(var(--fd-header-height,0px)+120px)] @[720px]:self-start">
            {/* The paper only dims in dark mode, so what's shown is what prints */}
            <div className="w-fit max-w-full overflow-hidden rounded-[6px] bg-paper shadow-label">
              <FadeInImage
                src={`/reference/examples/${image.file}`}
                alt={`What the ${command.code} example prints`}
                width={image.width}
                height={image.height}
                loading="lazy"
                className="block h-auto max-w-full mix-blend-multiply"
                style={{ width: image.width * 0.75 }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { detailsOf, paramsOf };
export type { Command, Details, Examples, Param };
