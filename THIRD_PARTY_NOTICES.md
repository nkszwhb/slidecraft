# Third-party notices

SlideCraft is MIT-licensed. It depends on open-source packages and distributes a
self-contained OfficeCLI binary in Docker images.

This is a summary, not a replacement for the license files shipped by each
package. Generate a complete inventory with:

```bash
pnpm licenses list
```

## Runtime dependencies

| Component | License | Notes |
| --- | --- | --- |
| Nuxt / Vue / Nitro | MIT | Web framework and SSR |
| PptxGenJS | MIT | Deterministic PPTX generation |
| OfficeCLI (`@officecli/officecli`) | Apache-2.0 | PPTX inspection, animation mutation, validation |
| ICU (`libicu72`) | Unicode-DFS-2016 | .NET globalization runtime required by OfficeCLI |
| pg-boss | MIT | PostgreSQL-backed job queue |
| postgres | MIT | PostgreSQL client |
| Zod | MIT | Runtime schemas |
| JSZip | MIT | PPTX ZIP inspection |
| unpdf | MIT | PDF text extraction |
| Lucide | ISC | Icons |
| Inter Variable (`@fontsource-variable/inter`) | SIL OFL 1.1 | Web font |
| dotenv | BSD-2-Clause | Environment loading |

## Container image

The Docker image includes the OfficeCLI binary downloaded by its package
installer. If you redistribute the image, retain the OfficeCLI Apache-2.0
license and notice files from `node_modules/@officecli/officecli`.

## Model providers

SlideCraft does not bundle model weights or provider SDKs. Users connect their
own OpenAI-compatible or Anthropic-compatible endpoints and remain responsible
for the provider's terms, data processing, and usage costs.

## Fonts in generated decks

Generated PPTX files reference the theme font names (for example Inter Variable
or Georgia). PowerPoint substitutes a local fallback when the named font is not
installed. SlideCraft does not embed font binaries in generated decks.
