#!/usr/bin/env python3
"""Compõe os documentos com o Typst, exigindo PDF/A-2a e PDF/UA-1.

O argumento que decide a escolha do compositor não é a velocidade: é que ele
RECUSA-SE a produzir um documento inacessível. Uma imagem sem descrição ou uma
hierarquia de títulos que comece no nível 2 falham a compilação, em vez de
saírem num ficheiro que escreve «Tagged: yes» nos metadados e não tem uma única
célula de cabeçalho.

Isto transforma a acessibilidade de boa intenção em invariante de build — que é
o padrão que o projeto já usa em `assertFiscalDataIntegrity()` e
`assertChangelogIntegrity()`.

Uso:  python3 scripts/compor-documento.py [--dados <json>] [--saida <pdf>] [--png]
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

try:
    import typst
except ImportError:  # pragma: no cover
    sys.exit("typst em falta.  pip install typst")

RAIZ = Path(__file__).resolve().parent.parent
FONTES = RAIZ / "src" / "documentos" / "fontes"
NORMAS = ["a-2a", "ua-1"]

DOCUMENTOS = [
    {
        "typ": "src/documentos/relatorio-vencimento.typ",
        # O caminho dos dados é resolvido a partir da raiz do projeto (o `/`
        # inicial é a convenção do Typst para «raiz», não o sistema de ficheiros).
        "dados": "/src/documentos/dados-exemplo.json",
        "saida": "out/relatorio-vencimento.pdf",
    },
    {
        "typ": "src/documentos/mapa-recibos.typ",
        "dados": "/src/documentos/recibos-exemplo.json",
        "saida": "out/mapa-recibos.pdf",
    },
]


def _opcoes(dados: str) -> dict:
    return dict(
        root=str(RAIZ),
        font_paths=[str(FONTES)],
        # Sem isto, uma fonte do sistema podia substituir a da marca em silêncio
        # — que é exatamente o defeito do caminho anterior (M1).
        ignore_system_fonts=True,
        sys_inputs={"dados": dados},
    )


def compor(typ: str, dados: str, saida: str) -> None:
    destino = RAIZ / saida
    destino.parent.mkdir(parents=True, exist_ok=True)
    inicio = time.perf_counter()
    typst.compile(str(RAIZ / typ), output=str(destino), pdf_standards=NORMAS, **_opcoes(dados))
    ms = (time.perf_counter() - inicio) * 1000
    print(f"  {saida}  ·  {destino.stat().st_size // 1024} KB  ·  {ms:.0f} ms  ·  PDF/A-2a + PDF/UA-1")


def espreitar(typ: str, dados: str, saida: str, ppi: int = 110) -> None:
    """Rende as páginas em PNG para revisão visual.

    Existe para não se rever o desenho com um comando à parte: uma chamada ao
    `typst.compile` sem `font_paths` cai nas fontes do sistema, e a pré-visão
    sai em serifada onde o PDF sai na fonte da marca — parece um defeito de
    desenho e não é. Aqui as opções são as MESMAS do PDF, por construção.
    """
    base = (RAIZ / saida).with_suffix("")
    base.parent.mkdir(parents=True, exist_ok=True)
    paginas = typst.compile(str(RAIZ / typ), format="png", ppi=ppi, **_opcoes(dados))
    if isinstance(paginas, bytes):
        paginas = [paginas]
    # Prefixadas pelo nome do documento: com dois documentos a compor, um
    # `pag1.png` partilhado fazia o segundo apagar as páginas do primeiro em
    # silêncio — e revia-se o desenho errado.
    for i, pagina in enumerate(paginas, 1):
        (base.parent / f"{base.name}-pag{i}.png").write_bytes(pagina)
    print(f"  {len(paginas)} páginas em {base.relative_to(RAIZ)}-pag*.png  ·  {ppi} ppp  ·  fontes da marca")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dados", help="JSON de dados (sobrepõe o do documento)")
    parser.add_argument("--saida", help="PDF de saída (sobrepõe o do documento)")
    parser.add_argument("--png", action="store_true", help="rende também as páginas em PNG, para revisão visual")
    args = parser.parse_args()

    if not FONTES.exists():
        sys.exit("Fontes por preparar.  npm run docs:fontes")

    for doc in DOCUMENTOS:
        try:
            dados = args.dados or doc["dados"]
            saida = args.saida or doc["saida"]
            compor(doc["typ"], dados, saida)
            if args.png:
                espreitar(doc["typ"], dados, saida)
        except Exception as erro:
            print(f"\nFALHOU a compor {doc['typ']}:\n{erro}", file=sys.stderr)
            raise SystemExit(1)
