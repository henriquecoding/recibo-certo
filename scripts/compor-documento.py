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

Uso:  python3 scripts/compor-documento.py [--dados <json>] [--saida <pdf>]
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
]


def compor(typ: str, dados: str, saida: str) -> None:
    destino = RAIZ / saida
    destino.parent.mkdir(parents=True, exist_ok=True)
    inicio = time.perf_counter()
    typst.compile(
        str(RAIZ / typ),
        output=str(destino),
        root=str(RAIZ),
        font_paths=[str(FONTES)],
        # Sem isto, uma fonte do sistema podia substituir a da marca em silêncio
        # — que é exatamente o defeito do caminho anterior (M1).
        ignore_system_fonts=True,
        sys_inputs={"dados": dados},
        pdf_standards=NORMAS,
    )
    ms = (time.perf_counter() - inicio) * 1000
    print(f"  {saida}  ·  {destino.stat().st_size // 1024} KB  ·  {ms:.0f} ms  ·  PDF/A-2a + PDF/UA-1")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dados", help="JSON de dados (sobrepõe o do documento)")
    parser.add_argument("--saida", help="PDF de saída (sobrepõe o do documento)")
    args = parser.parse_args()

    if not FONTES.exists():
        sys.exit("Fontes por preparar.  npm run docs:fontes")

    for doc in DOCUMENTOS:
        try:
            compor(doc["typ"], args.dados or doc["dados"], args.saida or doc["saida"])
        except Exception as erro:
            print(f"\nFALHOU a compor {doc['typ']}:\n{erro}", file=sys.stderr)
            raise SystemExit(1)
