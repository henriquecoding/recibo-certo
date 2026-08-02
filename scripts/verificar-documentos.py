#!/usr/bin/env python3
"""Lista executável de verificação dos documentos (Parte 10 da especificação).

Sete verificações. As seis primeiras são sobre o PDF; a sétima — a coerência
entre formatos, «a mais importante e a mais fácil de esquecer» — vive em
`tests/export-coerencia-formatos.test.ts`, porque tem de correr com o motor.

Uso:  python3 scripts/verificar-documentos.py out/relatorio-vencimento.pdf
"""

from __future__ import annotations

import sys
from pathlib import Path

try:
    import pikepdf
except ImportError:  # pragma: no cover
    sys.exit("pikepdf em falta.  pip install pikepdf")

# Famílias que o documento pode usar. Qualquer outra é uma SUBSTITUTA — o
# defeito que faz dois subscritores do mesmo plano receberem documentos com
# desenho diferente.
FAMILIAS = ("DMSansTab", "PlayfairDisplayDoc")

def percorrer(objeto, visitados=None):
    """Percorre a árvore de estrutura contando os tipos de elemento."""
    if visitados is None:
        visitados = set()
    chave = objeto.objgen if hasattr(objeto, "objgen") else None
    if chave and chave != (0, 0):
        if chave in visitados:
            return
        visitados.add(chave)
    if isinstance(objeto, pikepdf.Array):
        for item in objeto:
            yield from percorrer(item, visitados)
        return
    if not isinstance(objeto, pikepdf.Dictionary):
        return
    if "/S" in objeto:
        yield str(objeto.S)
    if "/K" in objeto:
        yield from percorrer(objeto.K, visitados)


def verificar(caminho: Path) -> int:
    falhas: list[str] = []
    notas: list[str] = []

    with pikepdf.open(caminho) as pdf:
        # 2 · Fontes: nenhuma substituta, todas embebidas.
        fontes: dict[str, bool] = {}
        for pagina in pdf.pages:
            recursos = pagina.get("/Resources", pikepdf.Dictionary())
            for fonte in recursos.get("/Font", pikepdf.Dictionary()).values():
                nome = str(fonte.get("/BaseFont", "?")).lstrip("/")
                descendentes = fonte.get("/DescendantFonts")
                alvo = descendentes[0] if descendentes else fonte
                descritor = alvo.get("/FontDescriptor", pikepdf.Dictionary())
                embebida = any(k in descritor for k in ("/FontFile", "/FontFile2", "/FontFile3"))
                fontes[nome] = embebida
        for nome, embebida in sorted(fontes.items()):
            base = nome.split("+")[-1]
            if not any(base.startswith(f) for f in FAMILIAS):
                falhas.append(f"fonte substituta no PDF: {nome}")
            if not embebida:
                falhas.append(f"fonte não embebida: {nome}")
        if not fontes:
            falhas.append("o PDF não declara fontes")
        notas.append(f"fontes: {len(fontes)} subconjuntos, todos da marca e embebidos")

        # 3 · Estrutura: cabeçalhos de tabela existem.
        raiz = pdf.Root.get("/StructTreeRoot")
        if raiz is None:
            falhas.append("sem árvore de estrutura (/StructTreeRoot)")
            contagem: dict[str, int] = {}
        else:
            contagem = {}
            for tipo in percorrer(raiz.get("/K", pikepdf.Array())):
                contagem[tipo] = contagem.get(tipo, 0) + 1
            if contagem.get("/TH", 0) == 0:
                falhas.append("zero células de cabeçalho (/TH): as tabelas não são navegáveis")
            if contagem.get("/H1", 0) == 0:
                falhas.append("sem /H1: o PDF/UA exige que o primeiro título seja de nível 1")
            nao_semanticos = contagem.get("/NonStruct", 0)
            if nao_semanticos > 10:
                falhas.append(f"{nao_semanticos} elementos /NonStruct — caixas sem semântica")
            notas.append(
                "estrutura: "
                + ", ".join(f"{t.lstrip('/')}={n}" for t, n in sorted(contagem.items()) if t in ("/H1", "/H2", "/Table", "/TH", "/TD", "/L", "/LI", "/NonStruct"))
            )

        # 5 · Metadados.
        marcado = bool(pdf.Root.get("/MarkInfo", pikepdf.Dictionary()).get("/Marked", False))
        if not marcado:
            falhas.append("/MarkInfo /Marked ausente ou falso")
        if "/Lang" not in pdf.Root:
            falhas.append("/Lang ausente: um leitor de ecrã lê português com fonemas ingleses")
        prefs = pdf.Root.get("/ViewerPreferences", pikepdf.Dictionary())
        if not bool(prefs.get("/DisplayDocTitle", False)):
            falhas.append("/ViewerPreferences /DisplayDocTitle não está a true")
        if "/Metadata" not in pdf.Root:
            falhas.append("sem stream XMP: o ficheiro aparece nas listas com o nome errado")
        else:
            xmp = bytes(pdf.Root.Metadata.read_bytes())
            notas.append(f"XMP: {len(xmp)} bytes")
            if b"dc:title" not in xmp:
                falhas.append("XMP sem dc:title")
        titulo = str(pdf.docinfo.get("/Title", "")) if pdf.docinfo else ""
        if not titulo:
            falhas.append("sem /Title — o título de um documento nunca é o nome do ficheiro")
        else:
            notas.append(f"título: {titulo}")
        notas.append(f"versão: PDF {pdf.pdf_version} · páginas: {len(pdf.pages)}")

    # 4 · Extração: corre em `scripts/verificar-texto-pdf.mjs`, com o
    #     pdfjs-dist que já é dependência do projeto. Não se duplica aqui.

    print(f"# Verificação de {caminho}")
    for nota in notas:
        print(f"  · {nota}")
    if falhas:
        print("\nFALHOU:", file=sys.stderr)
        for falha in falhas:
            print(f"  ✗ {falha}", file=sys.stderr)
        return 1
    print("\nTudo conforme.")
    return 0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("uso: verificar-documentos.py <ficheiro.pdf> [...]")
    raise SystemExit(max(verificar(Path(a)) for a in sys.argv[1:]))
