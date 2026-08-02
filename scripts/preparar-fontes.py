#!/usr/bin/env python3
"""Prepara as fontes da marca para o compositor tipográfico.

Resolve três problemas medidos, todos silenciosos até se reparar neles.

1) O DM Sans não tem `tnum` e os seus algarismos são PROPORCIONAIS.
   Larguras de avanço medidas (por 1000 unidades):

       0    1    2    3    4    5    6    7    8    9
       684  312  576  591  607  610  628  534  608  628

   O «1» mede 2,2x menos do que o «0»: numa coluna de euros, nada alinha.
   Pedir `font-variant-numeric: tabular-nums` não tem nada para ativar.
   A solução: derivar «DM Sans Tab», fixando a largura de avanço dos dez
   algarismos e centrando o desenho dentro dessa largura. As formas das letras
   não mudam — muda o ritmo da coluna. A largura é IGUAL nos quatro pesos, que
   é o que faz uma linha de total a negrito alinhar coluna a coluna com as
   linhas correntes acima dela.

2) As `name tables` dos estáticos do @fontsource trazem o nome da instância do
   eixo óptico como família — «DM Sans 9pt», «DM Sans 9pt Medium»,
   «DM Sans 9pt SemiBold». Para um motor de composição isso são TRÊS famílias
   diferentes, e pedir «DM Sans» a 600 não encontra nada. O script reescreve
   família, subfamília, `OS/2.usWeightClass` e `fsSelection`.

3) O separador de milhares não pode ser um caráter de espaço: o DM Sans não tem
   U+2009 nem U+202F no cmap, e usá-los faria a fonte cair para uma substituta
   a meio de um número. No template o separador é composição pura (`h(0.19em)`)
   — este script apenas VERIFICA que a ausência se mantém no DM Sans, para que
   ninguém passe a confiar num glifo que não existe.

   (O Playfair Display TEM U+2009, mas é fonte de display: nunca compõe
   algarismos em coluna, por isso a verificação não se lhe aplica.)

O script verifica-se a si próprio: se algum peso sair com larguras de algarismo
diferentes, falha com código != 0 em vez de produzir fontes que desalinham.

Uso:  python3 scripts/preparar-fontes.py [--verificar]
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

try:
    from fontTools.ttLib import TTFont
except ImportError:  # pragma: no cover - mensagem de instalação
    sys.exit("fontTools em falta.  pip install fonttools")

RAIZ = Path(__file__).resolve().parent.parent
DESTINO = RAIZ / "src" / "documentos" / "fontes"

# Largura tabular escolhida: acima do «0» (684) para os algarismos largos
# respirarem, sem abrir tanto que a coluna pareça espaçada.
LARGURA_TABULAR = 704

ALGARISMOS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"]

# Espaços que NÃO devem existir no cmap — se um dia existirem, o template pode
# passar a usá-los em vez da composição manual.
ESPACOS_PROIBIDOS = {0x2009: "THIN SPACE", 0x202F: "NARROW NO-BREAK SPACE"}

# (ficheiro de origem, família, subfamília, peso, itálico)
#
# A origem são os estáticos do @fontsource, em woff2. O compositor só lê
# TTF/OTF, por isso o script também os desempacota — o brotli é do fontTools.
PESOS_DM_SANS = [
    ("dm-sans-latin-400-normal.woff2", "DM Sans Tab", "Regular", 400, False),
    ("dm-sans-latin-500-normal.woff2", "DM Sans Tab", "Medium", 500, False),
    ("dm-sans-latin-600-normal.woff2", "DM Sans Tab", "SemiBold", 600, False),
    ("dm-sans-latin-700-normal.woff2", "DM Sans Tab", "Bold", 700, False),
    ("dm-sans-latin-400-italic.woff2", "DM Sans Tab", "Italic", 400, True),
]
PESOS_PLAYFAIR = [
    ("playfair-display-latin-400-normal.woff2", "Playfair Display Doc", "Regular", 400, False),
    ("playfair-display-latin-600-normal.woff2", "Playfair Display Doc", "SemiBold", 600, False),
    ("playfair-display-latin-700-normal.woff2", "Playfair Display Doc", "Bold", 700, False),
]

# IDs da name table que têm de acompanhar a família.
NOME_FAMILIA, NOME_SUBFAMILIA, NOME_COMPLETO, NOME_POSTSCRIPT = 1, 2, 4, 6
NOME_FAMILIA_TIPOGRAFICA, NOME_SUBFAMILIA_TIPOGRAFICA = 16, 17

FS_SELECTION_REGULAR = 1 << 6
FS_SELECTION_BOLD = 1 << 5
FS_SELECTION_ITALICO = 1 << 0


def reescrever_nomes(fonte: TTFont, familia: str, subfamilia: str, peso: int, italico: bool) -> None:
    """Uma família, quatro pesos — em vez de quatro famílias de um peso cada."""
    nome_completo = f"{familia} {subfamilia}".strip()
    postscript = f"{familia.replace(' ', '')}-{subfamilia.replace(' ', '')}"

    tabela = fonte["name"]
    for registo in list(tabela.names):
        if registo.nameID in (NOME_FAMILIA_TIPOGRAFICA, NOME_SUBFAMILIA_TIPOGRAFICA):
            tabela.names.remove(registo)

    for name_id, valor in (
        (NOME_FAMILIA, familia),
        (NOME_SUBFAMILIA, subfamilia),
        (NOME_COMPLETO, nome_completo),
        (NOME_POSTSCRIPT, postscript),
    ):
        tabela.setName(valor, name_id, 3, 1, 0x409)  # Windows / Unicode BMP / en-US
        tabela.setName(valor, name_id, 1, 0, 0)  # Macintosh / Roman / en

    os2 = fonte["OS/2"]
    os2.usWeightClass = peso
    selecao = os2.fsSelection & ~(FS_SELECTION_REGULAR | FS_SELECTION_BOLD | FS_SELECTION_ITALICO)
    if italico:
        selecao |= FS_SELECTION_ITALICO
    elif peso >= 700:
        selecao |= FS_SELECTION_BOLD
    else:
        selecao |= FS_SELECTION_REGULAR
    os2.fsSelection = selecao

    fonte["head"].macStyle = (1 if peso >= 700 else 0) | (2 if italico else 0)


def tabularizar(fonte: TTFont, largura: int) -> dict[str, int]:
    """Fixa a largura dos dez algarismos, centrando o desenho na nova largura."""
    hmtx = fonte["hmtx"]
    glyf = fonte.get("glyf")
    antes: dict[str, int] = {}

    for nome in ALGARISMOS:
        if nome not in hmtx.metrics:
            raise SystemExit(f"Glifo em falta: {nome}")
        avanco, lsb = hmtx.metrics[nome]
        antes[nome] = avanco
        deslocamento = round((largura - avanco) / 2)
        if glyf is not None and deslocamento:
            glifo = glyf[nome]
            if glifo.numberOfContours != 0:
                glifo.coordinates.translate((deslocamento, 0))
                glifo.recalcBounds(glyf)
        hmtx.metrics[nome] = (largura, lsb + deslocamento)

    return antes


def verificar_espacos(fonte: TTFont, caminho: Path) -> list[str]:
    """O separador de milhares é composição, porque estes glifos não existem."""
    presentes = set()
    for tabela in fonte["cmap"].tables:
        presentes.update(tabela.cmap.keys())
    return [
        f"{caminho.name}: passou a ter U+{ponto:04X} ({nome}) — rever o separador de milhares do template"
        for ponto, nome in ESPACOS_PROIBIDOS.items()
        if ponto in presentes
    ]


def localizar(nome: str) -> Path | None:
    """Procura o estático nos sítios habituais (@fontsource, node_modules, _og)."""
    candidatos = [
        RAIZ / "node_modules" / "@fontsource" / "dm-sans" / "files",
        RAIZ / "node_modules" / "@fontsource" / "playfair-display" / "files",
        RAIZ / "src" / "app" / "_og",
        RAIZ / "vendor" / "fontes",
    ]
    for pasta in candidatos:
        caminho = pasta / nome
        if caminho.exists():
            return caminho
    return None


def preparar(so_verificar: bool) -> int:
    DESTINO.mkdir(parents=True, exist_ok=True)
    erros: list[str] = []
    larguras_por_familia: dict[str, set[int]] = {}
    processados = 0

    for origem_nome, familia, subfamilia, peso, italico in PESOS_DM_SANS + PESOS_PLAYFAIR:
        origem = localizar(origem_nome)
        if origem is None:
            erros.append(f"{origem_nome}: não encontrado (procurado em node_modules/@fontsource e src/app/_og)")
            continue

        destino = DESTINO / f"{familia.replace(' ', '')}-{subfamilia}.ttf"
        if so_verificar and not destino.exists():
            erros.append(f"{destino.name}: em falta — correr `python3 scripts/preparar-fontes.py`")
            continue

        fonte = TTFont(str(origem))
        # O compositor lê TTF/OTF, não woff2: tirar o «flavor» faz o save
        # escrever SFNT simples.
        fonte.flavor = None
        fonte.flavorData = None
        reescrever_nomes(fonte, familia, subfamilia, peso, italico)
        if familia.startswith("DM Sans"):
            tabularizar(fonte, LARGURA_TABULAR)
            larguras = {fonte["hmtx"].metrics[n][0] for n in ALGARISMOS}
            if len(larguras) != 1:
                erros.append(f"{destino.name}: algarismos com larguras diferentes {sorted(larguras)}")
            larguras_por_familia.setdefault(familia, set()).update(larguras)
        if familia.startswith("DM Sans"):
            erros.extend(verificar_espacos(fonte, origem))

        if not so_verificar:
            fonte.save(str(destino))
        fonte.close()
        processados += 1
        print(f"  {destino.name:38s}  {familia} {subfamilia} ({peso})")

    # A invariante que faz a linha de total a negrito alinhar com as correntes.
    for familia, larguras in larguras_por_familia.items():
        if len(larguras) != 1:
            erros.append(f"{familia}: pesos com larguras de algarismo diferentes {sorted(larguras)}")

    if erros:
        print("\nFALHOU:", file=sys.stderr)
        for erro in erros:
            print(f"  · {erro}", file=sys.stderr)
        return 1

    print(f"\n{processados} fontes preparadas em {DESTINO.relative_to(RAIZ)}.")
    print(f"Algarismos tabulares a {LARGURA_TABULAR}/1000, iguais em todos os pesos.")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verificar", action="store_true", help="não escreve; só confirma que estão preparadas")
    args = parser.parse_args()
    raise SystemExit(preparar(args.verificar))
