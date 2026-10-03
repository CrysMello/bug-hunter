"""Valida todos os casos em src/cases/*.json antes do deploy.

Uso:  python3 tools/validate_cases.py
Sai com código 1 se encontrar qualquer problema (o GitHub Actions então não publica).
Só usa a biblioteca padrão: não precisa instalar nada.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

PASTA = Path(__file__).resolve().parent.parent / "src" / "cases"
TIPOS_PISTA = {"relato", "log", "metrica", "email", "ambiente", "config", "comparacao", "codigo", "requisito"}
PLATAFORMAS = {"web", "app", "backend", "ci"}
QUALIDADES = {"melhor", "parcial", "ruim"}
CAMPOS = ["id", "titulo", "subtitulo", "citacao", "impacto", "inicio", "ambiente", "objetivo",
          "tempoTotal", "ordemColeta", "pistas", "hipoteses", "devs", "caos", "conexoes",
          "recomendacoes", "licao"]


def validar(caso: dict, nome: str) -> list[str]:
    erros: list[str] = []
    err = lambda msg: erros.append(f"{nome}: {msg}")

    faltando = [c for c in CAMPOS if c not in caso]
    if faltando:
        return [f"{nome}: campos obrigatórios ausentes: {', '.join(faltando)}"]

    if Path(nome).stem != str(caso["id"]):
        err(f"o nome do arquivo deve ser {caso['id']}.json")

    # Pistas
    ids = [p["id"] for p in caso["pistas"]]
    pistas = set(ids)
    if len(ids) != len(pistas):
        err("há pistas com id repetido")
    hipoteses = {h["id"] for h in caso["hipoteses"]}

    def checa_pista(ref: str | None, onde: str) -> None:
        if ref is not None and ref not in pistas:
            err(f"{onde} referencia a pista inexistente '{ref}'")

    for p in caso["pistas"]:
        if p.get("tipo") not in TIPOS_PISTA:
            err(f"pista '{p['id']}' tem tipo inválido '{p.get('tipo')}'")
        if not p.get("texto"):
            err(f"pista '{p['id']}' sem texto")
        if bool(p.get("hora")) != bool(p.get("evento")):
            err(f"pista '{p['id']}': 'hora' e 'evento' devem vir juntos (linha do tempo)")
        for h in p.get("apoia", []) + p.get("refuta", []):
            if h not in hipoteses:
                err(f"pista '{p['id']}' cita a hipótese inexistente '{h}'")

    if not any(p.get("inicial") for p in caso["pistas"]):
        err("nenhuma pista inicial: o quadro começaria vazio")
    for ref in caso["ordemColeta"]:
        checa_pista(ref, "ordemColeta")

    # Hipóteses
    corretas = [h for h in caso["hipoteses"] if h.get("correta")]
    if len(corretas) != 1:
        err(f"precisa de exatamente 1 hipótese correta (tem {len(corretas)})")
    for h in caso["hipoteses"]:
        if not h.get("feedback"):
            err(f"hipótese '{h['id']}' sem feedback")
        checa_pista(h.get("teste", {}).get("revela"), f"teste da hipótese '{h['id']}'")
        if "resultado" not in h.get("teste", {}):
            err(f"hipótese '{h['id']}' sem resultado de teste")

    # A hipótese correta precisa ser alcançável: alguma pista precisa apoiá-la
    for h in corretas:
        if not any(h["id"] in p.get("apoia", []) for p in caso["pistas"]):
            err(f"nenhuma pista apoia a hipótese correta '{h['id']}': o jogador não teria como chegar lá")

    # Caso justo: com todas as pistas, a causa certa passa de 60% de confiança (mesma conta do jogo)
    # e toda hipótese errada pode ser derrubada por alguma evidência.
    def confianca_maxima(hid: str) -> int:
        v = 20
        for p in caso["pistas"]:
            v += 15 if hid in p.get("apoia", []) else 0
            v -= 30 if hid in p.get("refuta", []) else 0
        return max(0, min(100, v))

    for h in caso["hipoteses"]:
        if h.get("correta") and confianca_maxima(h["id"]) < 60:
            err(f"a hipótese correta '{h['id']}' não chega a 60% de confiança nem com todas as pistas")
        if not h.get("correta") and not any(h["id"] in p.get("refuta", []) for p in caso["pistas"]):
            err(f"nenhuma pista refuta a hipótese errada '{h['id']}'")

    for d in caso["devs"]:
        checa_pista(d.get("revela"), f"dev '{d['id']}'")
    for c in caso["caos"]:
        checa_pista(c.get("revela"), f"evento de caos '{c['id']}'")
    for c in caso["conexoes"]:
        if len(c["pistas"]) != 2 or c["pistas"][0] == c["pistas"][1]:
            err(f"conexão inválida {c['pistas']}")
        for ref in c["pistas"]:
            checa_pista(ref, "conexão")

    # Todas as pistas não iniciais precisam ter um jeito de aparecer
    alcancaveis = set(caso["ordemColeta"])
    alcancaveis |= {h["teste"].get("revela") for h in caso["hipoteses"]}
    alcancaveis |= {d.get("revela") for d in caso["devs"]}
    alcancaveis |= {c.get("revela") for c in caso["caos"]}
    for p in caso["pistas"]:
        if not p.get("inicial") and p["id"] not in alcancaveis:
            err(f"a pista '{p['id']}' nunca pode ser revelada")

    # Recomendações
    if not any(r.get("qualidade") == "melhor" for r in caso["recomendacoes"]):
        err("nenhuma recomendação com qualidade 'melhor'")
    for r in caso["recomendacoes"]:
        if r.get("qualidade") not in QUALIDADES:
            err(f"recomendação '{r['id']}' com qualidade inválida")

    if "plataforma" in caso and caso["plataforma"] not in PLATAFORMAS:
        err(f"plataforma inválida '{caso['plataforma']}'")
    if caso["tempoTotal"] < 3:
        err("tempoTotal muito curto (mínimo 3h)")
    return erros


def main() -> int:
    arquivos = sorted(PASTA.glob("*.json"))
    if not arquivos:
        print(f"Nenhum caso encontrado em {PASTA}")
        return 1

    erros: list[str] = []
    for arq in arquivos:
        try:
            caso = json.loads(arq.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            erros.append(f"{arq.name}: JSON inválido ({e})")
            continue
        erros += validar(caso, arq.name)

    if erros:
        print("❌ Problemas encontrados:")
        print("\n".join(f"  - {e}" for e in erros))
        return 1
    print(f"✔ {len(arquivos)} caso(s) válido(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
