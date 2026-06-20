import { ImageResponse } from "next/og";

// Imagem social gerada no build/runtime (sem binários no repo). Aplicada por
// convenção do Next a todas as páginas sem imagem própria — substitui o antigo
// `/og-home.png` que estava referenciado mas não existia.

export const runtime = "nodejs";
export const alt = "ReciboCerto — quanto fica realmente teu, do recibo ao salário (2026)";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
          padding: "80px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Barra de marca */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "12px",
            backgroundColor: "#1D9E75",
          }}
        />

        {/* Logótipo */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "18px",
              backgroundColor: "#0F6E56",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "20px",
            }}
          >
            <div
              style={{
                width: "26px",
                height: "34px",
                borderRadius: "5px",
                backgroundColor: "#EAF7EB",
              }}
            />
          </div>
          <div style={{ display: "flex", fontSize: "40px", fontWeight: 700, color: "#1A1A17" }}>
            <span>Recibo</span>
            <span style={{ color: "#1D9E75" }}>Certo</span>
          </div>
        </div>

        {/* Título */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: "76px",
              fontWeight: 700,
              color: "#1A1A17",
              lineHeight: 1.05,
              letterSpacing: "-2px",
            }}
          >
            Quanto fica
          </div>
          <div
            style={{
              fontSize: "76px",
              fontWeight: 700,
              color: "#0F6E56",
              lineHeight: 1.05,
              letterSpacing: "-2px",
            }}
          >
            realmente teu?
          </div>
          <div
            style={{
              fontSize: "32px",
              color: "#57534E",
              marginTop: "28px",
              maxWidth: "960px",
              lineHeight: 1.4,
            }}
          >
            Do recibo verde ao salário: IRS, Segurança Social e IVA em segundos.
            Para independentes, por conta de outrem e futuros empresários. Taxas
            de 2026 verificadas com fonte legal.
          </div>
        </div>

        {/* Rodapé */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: "30px", fontWeight: 600, color: "#1A1A17" }}>
            recibocerto.pt
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "26px",
              fontWeight: 600,
              color: "#0F6E56",
              backgroundColor: "#E1F5EE",
              padding: "14px 28px",
              borderRadius: "999px",
            }}
          >
            Grátis · sem registo
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
