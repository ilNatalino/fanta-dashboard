"""Pure pricing logic for the throwaway price-model prototype."""

from statistics import fmean, median


METHODS = (
    ("mean_ratios", "Media dei rapporti"),
    ("ratio_totals", "Rapporto dei totali"),
    ("median_ratios", "Mediana dei rapporti"),
)


def round_credits(value):
    return int(value + 0.5)


def apply_event(active, event, catalog):
    """Return new active purchases after applying one auction event."""
    updated = {name: purchase.copy() for name, purchase in active.items()}
    name = event["name"]
    action = event["azione"]

    if action == "annullamento":
        if name not in updated:
            raise ValueError(f"Acquisto inesistente: {name}")
        del updated[name]
        return updated

    player = catalog[name]
    price = int(event["prezzo_finale"])
    if player["pfc"] <= 0 or price <= 0:
        raise ValueError("PFC e prezzo finale devono essere positivi")
    if action == "acquisto" and name in updated:
        raise ValueError(f"Calciatore già acquistato: {name}")
    if action == "correzione" and name not in updated:
        raise ValueError(f"Acquisto inesistente: {name}")

    updated[name] = {
        "name": name,
        "role": player["role"],
        "pfc": player["pfc"],
        "final_price": price,
        "team": event["squadra"],
    }
    return updated


def replay(events, catalog, steps):
    active = {}
    for event in events[:steps]:
        active = apply_event(active, event, catalog)
    return active


def multiplier(purchases, method):
    ratios = [purchase["final_price"] / purchase["pfc"] for purchase in purchases]
    if method == "mean_ratios":
        return fmean(ratios)
    if method == "ratio_totals":
        return sum(purchase["final_price"] for purchase in purchases) / sum(
            purchase["pfc"] for purchase in purchases
        )
    if method == "median_ratios":
        return median(ratios)
    raise ValueError(f"Metodo sconosciuto: {method}")


def role_snapshot(active, role, threshold=3, example_pfc=100):
    purchases = [purchase for purchase in active.values() if purchase["role"] == role]
    methods = {}
    if len(purchases) >= threshold:
        for key, label in METHODS:
            factor = multiplier(purchases, key)
            methods[key] = {
                "label": label,
                "multiplier": factor,
                "deviation": factor - 1,
                "adapted_price": round_credits(example_pfc * factor),
            }
    return {
        "role": role,
        "count": len(purchases),
        "threshold": threshold,
        "available": len(purchases) >= threshold,
        "purchases": sorted(purchases, key=lambda purchase: purchase["name"]),
        "methods": methods,
    }


def _self_check():
    purchases = [
        {"pfc": 100, "final_price": 110},
        {"pfc": 100, "final_price": 120},
        {"pfc": 100, "final_price": 250},
    ]
    assert round(multiplier(purchases, "median_ratios"), 2) == 1.2
    assert multiplier(purchases, "median_ratios") < multiplier(purchases, "mean_ratios")


if __name__ == "__main__":
    _self_check()
    print("price_model: ok")
