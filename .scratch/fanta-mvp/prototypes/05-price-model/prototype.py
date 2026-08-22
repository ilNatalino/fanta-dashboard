#!/usr/bin/env python3
"""PROTOTYPE — compare price-adjustment methods on the representative auction.

Question: which minimal method stays understandable with three observations,
resists one anomalous purchase, and reacts correctly to corrections and
cancellations? Run: python3 .scratch/fanta-mvp/prototypes/05-price-model/prototype.py
"""

import csv
import sys
from pathlib import Path

from price_model import METHODS, replay, role_snapshot


BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"
ROLES = ("P", "D", "C", "A")
ROLE_NAMES = {"P": "POR", "D": "DIF", "C": "CEN", "A": "ATT"}
KEY_STEPS = (9, 10, 15, 16, 17)
BASE = Path(__file__).resolve().parents[2]
ASSETS = BASE / "assets"


def decimal(value):
    return float(value.replace(",", "."))


def load_data():
    with (ASSETS / "04-catalogo-rappresentativo.csv").open(encoding="utf-8", newline="") as stream:
        catalog = {
            row["name"]: {"role": row["role"], "pfc": decimal(row["pfc"])}
            for row in csv.DictReader(stream)
        }
    with (ASSETS / "04-eventi-asta.csv").open(encoding="utf-8", newline="") as stream:
        events = list(csv.DictReader(stream))
    with (ASSETS / "04-configurazione-asta.csv").open(encoding="utf-8", newline="") as stream:
        threshold = int(next(csv.DictReader(stream))["soglia_adattamento"])
    return catalog, events, threshold


def percent(value):
    return f"{value:+.0%}"


def render(step, role, catalog, events, threshold, clear=True):
    if clear:
        print("\033[2J\033[H", end="")
    active = replay(events, catalog, step)
    snapshot = role_snapshot(active, role, threshold)
    last = events[step - 1] if step else None

    print(f"{BOLD}PROTOTIPO — Scostamento d'asta per ruolo{RESET}")
    print(f"{DIM}Confronto su PFC di esempio = 100 crediti; il moltiplicatore è identico per ogni PFC.{RESET}")
    if last:
        print(
            f"Passo {step}/{len(events)} · {last['azione']} {last['name']} · "
            f"{last['caso']}"
        )
    else:
        print(f"Passo 0/{len(events)} · nessun acquisto")

    print(f"\n{BOLD}Ruolo {ROLE_NAMES[role]}{RESET} · osservazioni {snapshot['count']}/{threshold}")
    if snapshot["purchases"]:
        print(f"{'Calciatore':18} {'PFC':>7} {'Finale':>7} {'Rapporto':>9}")
        for purchase in snapshot["purchases"]:
            ratio = purchase["final_price"] / purchase["pfc"]
            print(
                f"{purchase['name']:18} {purchase['pfc']:7.1f} "
                f"{purchase['final_price']:7d} {ratio:9.2f}"
            )
    else:
        print(f"{DIM}Nessun acquisto osservato nel ruolo.{RESET}")

    print(f"\n{BOLD}Confronto dei metodi{RESET}")
    if not snapshot["available"]:
        print("Dati insufficienti: il prezzo adattato resta nascosto.")
    else:
        for key, label in METHODS:
            result = snapshot["methods"][key]
            print(
                f"{label:24} scostamento {percent(result['deviation']):>5} · "
                f"prezzo adattato {result['adapted_price']:>3}"
            )

    print(f"\n{BOLD}Stato di tutti i ruoli{RESET}")
    for item_role in ROLES:
        item = role_snapshot(active, item_role, threshold)
        state = "Disponibile" if item["available"] else "Dati insufficienti"
        print(f"{ROLE_NAMES[item_role]} {item['count']:>2} osservazioni · {state}")

    print(
        f"\n{BOLD}[n]{RESET} prossimo  {BOLD}[p]{RESET} precedente  "
        f"{BOLD}[k]{RESET} caso chiave  {BOLD}[r]{RESET} cambia ruolo  "
        f"{BOLD}[a]{RESET} tutti  {BOLD}[0]{RESET} reset  {BOLD}[q]{RESET} esci"
    )


def run_demo(catalog, events, threshold):
    for step, role in ((9, "P"), (10, "D"), (15, "D"), (16, "C"), (17, "C")):
        render(step, role, catalog, events, threshold, clear=False)
        print("\n" + "=" * 72 + "\n")


def main():
    catalog, events, threshold = load_data()
    if "--demo" in sys.argv:
        run_demo(catalog, events, threshold)
        return

    step = 0
    role_index = 0
    while True:
        render(step, ROLES[role_index], catalog, events, threshold)
        command = input("> ").strip().lower()
        if command == "q":
            return
        if command == "n":
            step = min(len(events), step + 1)
        elif command == "p":
            step = max(0, step - 1)
        elif command == "r":
            role_index = (role_index + 1) % len(ROLES)
        elif command == "a":
            step = len(events)
        elif command == "0":
            step = 0
        elif command == "k":
            step = next((key_step for key_step in KEY_STEPS if key_step > step), KEY_STEPS[0])


if __name__ == "__main__":
    main()
