"""Generate formation fixtures with the pinned Koala numerical modules and raw buffs.

Pass the same read-only cache used by verify-mingzun-koala.py. Its sibling
koala-gains directory must contain assets_json_buffs.json from the same commit.
"""
import argparse
import ast
import json
from pathlib import Path
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source_cache", type=Path)
    args = parser.parse_args()
    cache = args.source_cache.resolve()
    sys.path.insert(0, str(cache))
    from base.attribute import BaseAttribute
    from base.constant import SHIELD_BASE_MAP, SHIELD_CONSTANT_MAP
    from base.utils import parse_expr

    module = Path(__file__).resolve().parent.parent / "src/心法模块/心法/明尊琉璃体"
    read = lambda file: json.loads(file.read_text(encoding="utf-8-sig"))
    reference = read(module / "参考数据.json")
    archive = read(module / "阵眼数据.json")
    assert archive["commit"] == reference["commit"]
    buffs = read(cache.parent / "koala-gains/assets_json_buffs.json")["0"]
    for group, records in archive["buffs"].items():
        assert records == buffs[group], group
    raw = ast.literal_eval(ast.parse((cache / "assets_raw_skills.py").read_text(encoding="utf-8-sig")).body[0].value)[10243]
    keys = [("25355", "4480", "58"), ("10243", "4326", "1"), ("3962", "19055", "1")]
    expressions = {}
    for group, skill, level in keys:
        record = raw[int(group)][int(skill)][int(level)]
        assert record["damages"] == [row["damage"] for row in reference["skills"][group][skill][level]["damages"]]
        expressions[":".join((group, skill, level))] = (parse_expr(record["damages"][0]), parse_expr(record["critical_strike"]))
    formations = [
        ("", []),
        ("冰心阵", [("781", "952", 1), ("781", "955", 1)]),
        ("田螺阵", [("3217", "3307", 1), ("3217", "3310", 1)]),
        ("毒经阵", [("2487", "2512", 1), ("2487", "2514", .5)]),
        ("无界阵", [("102268", "71338", 1)]),
        ("万灵阵", [("36318", "27236", 1), ("36318", "27238", .96)]),
        ("气纯阵", [("347", "938", 1), ("347", "943", 1)]),
        ("莫问阵", [("16151", "9485", 1), ("16151", "9492", 1)]),
        ("T阵", []),
    ]
    equipment = dict(vitality=5000, attack=1500, physicalAttack=400, overcome=1000,
                     physicalOvercome=500, critical=300, criticalPower=200,
                     strain=600, toughness=100, weaponMin=100, weaponMax=150)
    mapping = dict(vitality="vitality_base", attack="magical_attack_power_base",
                   physicalAttack="physical_attack_power_base", overcome="magical_overcome_base",
                   physicalOvercome="physical_overcome_base", critical="all_critical_strike_base",
                   criticalPower="all_critical_power_base", strain="strain_base", toughness="toughness_base")
    cases = []
    for stance, buff_id in [("offTank", "29938"), ("mainTank", "17885")]:
        for name, parts in formations:
            source = BaseAttribute("vitality", "solar", "solar")
            source.init()
            recipes = {}
            for belong in ["10243", "14678", "25355", "26717", "25166", "6895", "6760"]:
                for key, value in reference["belongs"][belong].get("attributes", {}).items():
                    source[key] += value
                recipes.update({key: 1 for key in reference["belongs"][belong].get("recipes", [])})
            for key, value in reference["buffs"]["10243"][buff_id]["7"]["attributes"].items():
                source[key] += value
            for key, attribute in mapping.items():
                source[attribute] += equipment[key]
            source.weapon_damage_base = equipment["weaponMin"]
            source.weapon_damage_rand = equipment["weaponMax"] - equipment["weaponMin"]
            for group, buff, coverage in parts:
                record = next(iter(buffs[group][buff].values()))
                for key, value in record["attributes"].items():
                    # This is the recipient's incoming physical-damage reduction.
                    if key != "physical_damage_cof":
                        source[key] += value * record["max_stack"] * coverage
            if name == "T阵":
                # User-defined single effect, not a fabricated Koala buff ID.
                assert archive["userEffects"]["T阵"]["attributes"] == {"vitality_gain": 31}
                source.vitality_gain += 31
            target = BaseAttribute()
            target.lunar_shield_base = target.physical_shield_base = SHIELD_BASE_MAP[53]
            names = ["lunar_attack_power", "lunar_critical_strike", "lunar_critical_power", "lunar_overcome",
                     "physical_attack_power", "base_physical_attack_power", "extra_physical_attack_power",
                     "physical_attack_power_addition", "physical_overcome", "physical_critical_strike",
                     "physical_critical_power", "all_shield_ignore", "strain", "magical_damage_addition",
                     "physical_damage_addition", "skill_damage_addition", "move_state_damage_addition",
                     "pve_damage_addition", "weapon_damage", "weapon_damage_rand"]
            variables = recipes | {key: source[key] for key in names}
            variables |= dict(lunar_shield=target.lunar_shield, physical_shield=target.physical_shield,
                              lunar_damage_scale=0, physical_damage_scale=0, level=53,
                              shield_constant=SHIELD_CONSTANT_MAP[53], rand=.5)
            panel = dict(vitality=source.vitality, attack=source.lunar_attack_power, baseMagicalAttack=source.base_lunar_attack_power,
                         extraMagicalAttack=source.extra_lunar_attack_power,
                         critical=source.lunar_critical_strike, criticalPower=source.lunar_critical_power,
                         overcomeRating=source.final_lunar_overcome, baseOvercomeRating=source.base_lunar_overcome,
                         extraOvercomeRating=source.extra_lunar_overcome, strain=source.strain,
                         toughness=equipment["toughness"] / (19.218 * 990) + source.toughness_rate / 10000,
                         # A flat toughness-rate buff reduces incoming critical chance;
                         # only the rating component converts to critical-damage reduction.
                         toughnessPower=source.toughness_percent)
            damage = {key: dict(hit=expr.evaluate(variables | dict(is_critical=0)),
                                criticalHit=expr.evaluate(variables | dict(is_critical=1)),
                                critical=crit.evaluate(variables))
                      for key, (expr, crit) in expressions.items()}
            cases.append(dict(formation=name, stance=stance, panel=panel, skills=damage))
    output = dict(commit=reference["commit"], equipment=equipment, cases=cases)
    (module / "阵眼算法校验.json").write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Verified {len(cases)} formation/stance combinations with Koala Python")


if __name__ == "__main__":
    main()
