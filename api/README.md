# Funções Python

`compor-documento.py` é o compositor tipográfico dos documentos do Plus.

## Como a Vercel a constrói

O builder de Python é **detetado** pela extensão `.py` nesta pasta mais o
`requirements.txt` da raiz. O `vercel.json` só ajusta memória, duração e os
ficheiros a incluir — **não** declara `runtime`.

Declarar `"runtime": "python3.12"` parece razoável e é inválido: esse campo
espera um pacote de builder com versão (`@vercel/python@4.3.0`). Com o valor
errado, o build falha inteiro com «Function Runtimes must have a valid
version», e não apenas esta função.

## Variáveis de ambiente

| Variável | Onde | Para quê |
|---|---|---|
| `DOCUMENTOS_HMAC_SEGREDO` | função Python **e** app Next | assina e verifica cada pedido de composição. Sem ela, a função responde 401 a tudo. |
| `DOCUMENTOS_COMPOSITOR_URL` | app Next (opcional) | aponta para outro compositor; por omissão usa a própria implantação. |

Gerar o segredo:

```sh
openssl rand -hex 32
```

## Testar localmente

```sh
npm run docs          # prepara fontes, compõe e verifica pelo script
python3 - <<'PY'      # ... e pela função, com o mesmo código
import importlib.util, json, os
os.environ["DOCUMENTOS_HMAC_SEGREDO"] = "teste"
spec = importlib.util.spec_from_file_location("c", "api/compor-documento.py")
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
open("out/via-funcao.pdf", "wb").write(m.compor("vencimento", json.load(open("src/documentos/dados-exemplo.json"))))
PY
```
