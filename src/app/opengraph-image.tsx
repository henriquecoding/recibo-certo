import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Imagem social (Open Graph / Twitter) gerada no build/runtime — sem binários no
// repo. Aplicada por convenção do Next a todas as páginas sem imagem própria.
//
// A marca aqui é a MESMA do site (favicon /icon.svg e topo da nav): o recibo
// estilizado, embebido como data URI e rasterizado pelo next/og (resvg respeita
// o `transform`). Nada de placeholders — é o logótipo real. A tipografia é a da
// casa: Playfair Display (títulos) + DM Sans (corpo), carregadas de ficheiros
// versionados em `_og/` com fallback seguro para nunca partir a imagem.

export const runtime = "nodejs";
export const alt =
  "ReciboCerto — Simuladores de IRS, Recibos Verdes, Salário Líquido e Empresa 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Logótipo real (idêntico a /icon.svg). Rasterizado a partir do SVG.
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><path d="M401.84268 287.255L401.84268 79.756226C401.84268 75.90643 400.31332 72.21445 397.59122 69.49222C394.869 66.76999 391.177 65.24078 387.3272 65.24078L97.87232 65.24078L401.84274 287.255Z" fill="#0F3F25" transform="matrix(1,0,0,-1,0,500)"/><path d="M104.227554 46.98886C98.07467 42.39264 89.85445 41.66342 82.988556 45.104645C76.122665 48.545868 71.787445 55.567963 71.787445 63.247986C71.787445 160.30798 71.787445 398.2334 71.787445 398.2334C71.787445 413.8345 77.985 428.79663 89.01666 439.82828C100.04833 450.85995 115.010445 457.0575 130.61156 457.0575L404.59134 457.0575C410.8561 457.0575 416.86432 454.56885 421.2942 450.13895C425.72412 445.70908 428.21274 439.70084 428.21274 433.43607L428.21274 297.57184C428.21274 292.18018 425.66888 287.1045 421.34927 283.87784C381.9175 254.4224 183.21007 105.988495 104.227615 46.98886Z" fill="#05815F" transform="matrix(1,0,0,-1,0,500)"/><path d="M133.27333 50.53769C131.81955 49.448883 131.22578 47.551697 131.79967 45.82834C132.37344 44.10498 133.98589 42.942444 135.80222 42.942444L194.17578 42.942444C196.30357 42.942444 198.38411 43.57077 200.15623 44.748444C226.04689 61.95523 428.21268 196.31357 428.21268 196.31357L428.21268 258.16223C428.21268 260.6759 426.793 262.97394 424.5451 264.09882C422.2972 265.2237 419.60678 264.98248 417.59488 263.4757C370.3512 228.09335 179.5384 85.187256 133.27342 50.53769Z" fill="#0E6740" transform="matrix(1,0,0,-1,0,500)"/><path d="M428.21268 383.42422L428.21268 407.11646C428.21268 407.11646 207.2529 302.14667 186.42911 292.25412C185.4571 291.79236 184.31277 291.88245 183.425 292.49054C174.91911 298.31735 130.63878 328.6508 106.41334 345.2459C103.98035 346.91257 100.76489 346.88055 98.36556 345.16556C95.966225 343.45068 94.895004 340.41867 95.68423 337.57712C106.35423 299.16345 130.60968 211.84067 139.43756 180.05902C140.17911 177.38925 142.19322 175.25903 144.81734 174.36914C147.44144 173.47925 150.33589 173.94492 152.54845 175.61292C202.73346 213.44525 428.21255 383.42416 428.21255 383.42416Z" fill="#EAF7EB" transform="matrix(1,0,0,-1,0,500)"/></svg>`;
const LOGO = `data:image/svg+xml;base64,${Buffer.from(LOGO_SVG).toString("base64")}`;

// Carrega as fontes da casa a partir dos ficheiros versionados em `_og/`. Esta
// rota é pré-renderizada no build (imagem estática), altura em que a árvore de
// código está toda presente — por isso lê-se do disco com `fs`. Se algo falhar,
// devolve undefined e o next/og usa a fonte por omissão: a imagem gera-se sempre.
async function carregarFontes() {
  try {
    const dir = join(process.cwd(), "src", "app", "_og");
    const [display, corpo, forte] = await Promise.all([
      readFile(join(dir, "PlayfairDisplay-Bold.ttf")),
      readFile(join(dir, "DMSans-Medium.ttf")),
      readFile(join(dir, "DMSans-SemiBold.ttf")),
    ]);
    return [
      { name: "Playfair", data: display, weight: 700 as const, style: "normal" as const },
      { name: "DM Sans", data: corpo, weight: 500 as const, style: "normal" as const },
      { name: "DM Sans", data: forte, weight: 600 as const, style: "normal" as const },
    ];
  } catch (e) {
    console.error("[og] falha a carregar fontes:", e);
    return undefined;
  }
}

export default async function OpengraphImage() {
  const fonts = await carregarFontes();
  const display = fonts ? "Playfair" : "serif";
  const corpo = fonts ? "DM Sans" : "sans-serif";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#F5F4F0",
          padding: "76px 80px",
          fontFamily: corpo,
          position: "relative",
        }}
      >
        {/* Brilho de marca — profundidade subtil no canto superior direito */}
        <div
          style={{
            position: "absolute",
            top: "-260px",
            right: "-200px",
            width: "760px",
            height: "760px",
            borderRadius: "50%",
            backgroundImage:
              "radial-gradient(circle, rgba(29,158,117,0.18) 0%, rgba(29,158,117,0.06) 45%, rgba(29,158,117,0) 70%)",
          }}
        />
        {/* Fio de marca no topo */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "8px",
            backgroundImage: "linear-gradient(90deg, #0F6E56 0%, #1D9E75 55%, #3FBE93 100%)",
          }}
        />

        {/* Logótipo real + marca de palavra */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <img src={LOGO} width={74} height={74} alt="" />
          <div
            style={{
              display: "flex",
              marginLeft: "20px",
              fontFamily: display,
              fontSize: "46px",
              fontWeight: 700,
              letterSpacing: "-0.5px",
            }}
          >
            <span style={{ color: "#1A1A17" }}>Recibo</span>
            <span style={{ color: "#1D9E75" }}>Certo</span>
          </div>
        </div>

        {/* Título editorial */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontFamily: corpo,
              fontSize: "22px",
              fontWeight: 600,
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: "#1D9E75",
              marginBottom: "22px",
            }}
          >
            Copiloto fiscal · Portugal 2026
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: display,
              fontSize: "82px",
              fontWeight: 700,
              lineHeight: 1.04,
              letterSpacing: "-2px",
              color: "#1A1A17",
            }}
          >
            Poucos dados.
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: display,
              fontSize: "82px",
              fontWeight: 700,
              lineHeight: 1.04,
              letterSpacing: "-2px",
              color: "#0F6E56",
            }}
          >
            Zero contas.
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: corpo,
              fontSize: "29px",
              fontWeight: 500,
              color: "#57534E",
              marginTop: "24px",
              maxWidth: "960px",
              lineHeight: 1.4,
            }}
          >
            Quanto reservar, quando pagar e o que sobra — sem surpresas. IRS,
            recibos verdes, salário e empresa, com taxas de 2026 verificadas.
          </div>
        </div>

        {/* Rodapé — domínio + selo de confiança */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: "#1D9E75",
                marginRight: "14px",
              }}
            />
            <div style={{ display: "flex", fontFamily: corpo, fontSize: "30px", fontWeight: 600, color: "#1A1A17" }}>
              recibocerto.pt
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: corpo,
              fontSize: "25px",
              fontWeight: 600,
              color: "#0F6E56",
              backgroundColor: "#E1F5EE",
              border: "1px solid #C4E9DC",
              padding: "13px 30px",
              borderRadius: "999px",
            }}
          >
            Grátis · sem registo
          </div>
        </div>
      </div>
    ),
    { ...size, ...(fonts ? { fonts } : {}) },
  );
}
