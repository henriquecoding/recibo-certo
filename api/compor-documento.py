"""Compositor tipográfico — função Python na Vercel.

Recebe o modelo do documento em JSON e devolve um PDF composto com as fontes da
marca, em PDF/A-2a e PDF/UA-1. NÃO calcula nada de fiscal: o cálculo é da rota
Next (`/api/documentos/vencimento`), que é quem tem acesso ao motor e quem
verifica sessão e direito. Aqui só se compõe.

Porque é uma função Python e não o binário do Typst num `vendor/`:

 · o wheel `typst` do PyPI traz o compositor 0.15 já compilado para o alvo da
   Vercel e é instalado pelo builder — não há 53 MB a versionar no git, nem um
   SHA-256 para manter à mão, nem um binário que deixa de arrancar quando a
   imagem base muda;
 · o `@myriaddreamin/typst-ts-node-compiler`, a alternativa em Node, está no
   0.7 e NÃO suporta `--pdf-standard` — perdia-se exatamente o argumento que
   justifica todo o sistema;
 · o Chromium sem cabeça custa 300–500 MB de imagem e ~150 MB de RAM por
   instância para produzir um PDF sem marcação de acessibilidade a sério.

Segurança: a função não é um serviço público de composição. Cada pedido tem de
trazer uma assinatura HMAC-SHA256 do corpo, feita pela rota Next com um segredo
partilhado. Sem isso, qualquer pessoa podia mandar compor um documento com o
cabeçalho da marca e o conteúdo que quisesse.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import tempfile
from http.server import BaseHTTPRequestHandler
from pathlib import Path

import typst

RAIZ = Path(__file__).resolve().parent.parent
DOCUMENTOS = RAIZ / "src" / "documentos"
FONTES = DOCUMENTOS / "fontes"

NORMAS = ["a-2a", "ua-1"]

# O nome do template é escolhido por chave, nunca pelo que vem no pedido: um
# caminho vindo de fora seria travessia de diretórios.
TEMPLATES = {
    "vencimento": "relatorio-vencimento.typ",
    "recibos": "mapa-recibos.typ",
}

# 1 MB chega para o modelo de um recibo com folga; acima disso é abuso.
LIMITE_CORPO = 1_048_576


def _assinatura_valida(corpo: bytes, recebida: str) -> bool:
    segredo = os.environ.get("DOCUMENTOS_HMAC_SEGREDO", "")
    if not segredo or not recebida:
        return False
    esperada = hmac.new(segredo.encode("utf-8"), corpo, hashlib.sha256).hexdigest()
    # Comparação em tempo constante: comparar com `==` deixa medir o segredo.
    return hmac.compare_digest(esperada, recebida)


def compor(tipo: str, dados: dict) -> bytes:
    template = TEMPLATES[tipo]
    # Os dados viajam como STRING, não como ficheiro: o compositor recusa-se a
    # ler fora da raiz do projeto (e bem — é o que impede um caminho vindo de
    # fora de chegar ao disco), e num ambiente efémero não há sítio dentro da
    # raiz onde escrever. Só o PDF passa pelo diretório temporário.
    entrada = json.dumps(dados, ensure_ascii=False)
    with tempfile.TemporaryDirectory() as temporario:
        saida = Path(temporario) / "documento.pdf"
        typst.compile(
            str(DOCUMENTOS / template),
            output=str(saida),
            root=str(RAIZ),
            font_paths=[str(FONTES)],
            # Sem isto, uma fonte do sistema podia substituir a da marca em
            # silêncio — o defeito que fazia dois assinantes do mesmo plano
            # receberem documentos com desenho diferente.
            ignore_system_fonts=True,
            sys_inputs={"dados": entrada},
            pdf_standards=NORMAS,
        )
        return saida.read_bytes()


class handler(BaseHTTPRequestHandler):  # noqa: N801 - nome exigido pela Vercel
    def _responder(self, codigo: int, corpo: bytes, tipo: str = "application/json") -> None:
        self.send_response(codigo)
        self.send_header("Content-Type", tipo)
        self.send_header("Content-Length", str(len(corpo)))
        # Um documento pessoal nunca deve ficar em cache partilhada.
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(corpo)

    def _erro(self, codigo: int, mensagem: str) -> None:
        self._responder(codigo, json.dumps({"erro": mensagem}, ensure_ascii=False).encode("utf-8"))

    def do_GET(self) -> None:  # noqa: N802 - assinatura do BaseHTTPRequestHandler
        """Sinal de vida, para o build e a monitorização confirmarem o runtime."""
        self._responder(
            200,
            json.dumps({"compositor": "typst", "normas": NORMAS, "fontes": FONTES.exists()}).encode("utf-8"),
        )

    def do_POST(self) -> None:  # noqa: N802
        try:
            tamanho = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            return self._erro(400, "Content-Length inválido.")
        if tamanho <= 0 or tamanho > LIMITE_CORPO:
            return self._erro(413, "Corpo do pedido ausente ou demasiado grande.")

        corpo = self.rfile.read(tamanho)
        if not _assinatura_valida(corpo, self.headers.get("x-documento-assinatura", "")):
            # Não se distingue «sem assinatura» de «assinatura errada»: dizer
            # qual das duas foi ajuda quem está a tentar adivinhar.
            return self._erro(401, "Pedido não autenticado.")

        try:
            pedido = json.loads(corpo)
        except json.JSONDecodeError:
            return self._erro(400, "Corpo não é JSON válido.")

        tipo = pedido.get("tipo")
        dados = pedido.get("dados")
        if tipo not in TEMPLATES or not isinstance(dados, dict):
            return self._erro(400, "Pedido tem de trazer `tipo` conhecido e `dados`.")

        try:
            pdf = compor(tipo, dados)
        except Exception as erro:  # o compositor RECUSA documentos inacessíveis
            return self._erro(422, f"O documento não passou nas normas: {erro}")

        self._responder(200, pdf, tipo="application/pdf")
