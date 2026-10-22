"""Generate physical-damage fixtures using Koala's actual Python attribute/expression code.

Pass a read-only source cache containing base/{attribute,constant,expression,utils}.py,
tools/lua/enums.py and assets_raw_skills.py from the pinned reference commit.
Only the small numerical modules are required; no Generator checkout or Qt dependency.
"""
import argparse
import ast
import hashlib
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
    reference = json.loads((module / "参考数据.json").read_text(encoding="utf-8-sig"))
    tree = ast.parse((cache / "assets_raw_skills.py").read_text(encoding="utf-8-sig"))
    all_raw_skills = ast.literal_eval(tree.body[0].value)
    raw_skills = all_raw_skills[10243]
    keys = [("3962", "19055", "1"), ("3963", "19055", "2"),
            ("3966", "19055", "3"), ("3966", "19055", "4"),
            ("3967", "19055", "5"), ("3967", "19055", "6"),
            ("3959", "19055", "7"), ("3960", "19055", "8"),
            ("10243", "4326", "1")]
    expressions, formula_hashes = {}, {}
    for group, skill_id, level in keys:
        key = ":".join((group, skill_id, level))
        record = raw_skills[int(group)][int(skill_id)][int(level)]
        local = reference["skills"][group][skill_id][level]
        assert record["damages"] == [part["damage"] for part in local["damages"]], key
        assert record["critical_strike"] == local["critical_strike"], key
        for formula in record["damages"] + [record["critical_strike"]]:
            # Validate data before passing it to Koala's expression parser.
            for node in ast.walk(ast.parse(formula, mode="eval")):
                if not isinstance(node, (ast.Expression, ast.BinOp, ast.UnaryOp, ast.Call,
                                         ast.Name, ast.Load, ast.Constant, ast.Add, ast.Sub,
                                         ast.Mult, ast.Div, ast.UAdd, ast.USub)):
                    raise ValueError(f"Unsupported formula node: {type(node).__name__}")
                if isinstance(node, ast.Call) and (not isinstance(node.func, ast.Name)
                                                   or node.func.id != "int"):
                    raise ValueError("Only int() calls are accepted")
                if isinstance(node, ast.Constant) and not isinstance(node.value, (int, float)):
                    raise ValueError("Only numeric constants are accepted")
        expressions[key] = ([parse_expr(value) for value in record["damages"]],
                            parse_expr(record["critical_strike"]))
        formula_hashes[key] = hashlib.sha256("\n".join(record["damages"]).encode()).hexdigest()

    # Koala's Quye weapon hit is the same 200% formula as the solar finisher.
    # The standalone Quye weapon record is archived under Fen Ying's common skill;
    # Ming Zun's 25355 override only supplies its internal-damage component.
    quye_weapon = all_raw_skills[10242][3979][19055][9]
    solar_weapon = raw_skills[3967][19055][5]
    assert quye_weapon["damages"] == solar_weapon["damages"]
    assert quye_weapon["critical_strike"] == solar_weapon["critical_strike"]
    weapon_aliases = {"3979:19055:9": dict(
        sourceKungfu=10242,
        reusedKey="3967:19055:5",
        formulaHash=hashlib.sha256("\n".join(quye_weapon["damages"]).encode()).hexdigest())}

    stats = dict(vitality=5000, attack=1000, physicalAttack=400, overcome=500,
                 physicalOvercome=300, critical=300, magicalCritical=200,
                 criticalPower=150, weaponMin=100, weaponMax=150)
    cases = [
        ("基础外攻，无百分比增益", {}, {}),
        ("通用攻击增加72", dict(attack=1072, physicalAttack=472), {}),
        ("通用破防增加72", dict(overcome=572, physicalOvercome=372), {}),
        ("外攻百分比增益205", {}, dict(physical_attack_power_gain=205)),
        ("外攻百分比增益下增加基础外攻72", dict(physicalAttack=472), dict(physical_attack_power_gain=205)),
        ("体质转换的额外外攻", {}, dict(vitality_to_physical_attack_power=128)),
        ("虚弱与戒火", {}, dict(physical_shield_gain=-51, physical_damage_cof=21)),
        ("御劲酒92", dict(toughness=92), {}),
    ]
    stat_map = dict(vitality="vitality_base", attack="magical_attack_power_base",
                    physicalAttack="physical_attack_power_base", overcome="solar_overcome_base",
                    physicalOvercome="physical_overcome_base", critical="all_critical_strike_base",
                    magicalCritical="magical_critical_strike_base", criticalPower="all_critical_power_base",
                    toughness="toughness_base")
    panels = ["base_physical_attack_power", "extra_physical_attack_power",
              "physical_attack_power_addition", "physical_attack_power", "physical_overcome",
              "physical_critical_strike", "physical_critical_power", "strain"]
    fixtures = []
    for name, override, gains in cases:
        equipment = stats | override
        source = BaseAttribute("vitality", "solar", "solar")
        source.init()
        recipes = {}
        for belong_id in ["10243", "14678", "25355", "26717", "25166", "6895", "6760"]:
            belong = reference["belongs"][belong_id]
            for key, value in belong.get("attributes", {}).items():
                source[key] += value
            recipes.update({key: 1 for key in belong.get("recipes", [])})
        for key, value in reference["buffs"]["10243"]["29938"]["7"]["attributes"].items():
            source[key] += value
        for key, attribute in stat_map.items():
            source[attribute] += equipment.get(key, 0)
        source.weapon_damage_base = equipment["weaponMin"]
        source.weapon_damage_rand = equipment["weaponMax"] - equipment["weaponMin"]
        target = BaseAttribute()
        target.physical_shield_base = SHIELD_BASE_MAP[53]
        for key, value in gains.items():
            receiver = target if key.endswith(("_shield_gain", "_damage_cof")) else source
            receiver[key] += value
        variables = recipes | {key: source[key] for key in panels}
        variables |= dict(weapon_damage=source.weapon_damage, weapon_damage_rand=source.weapon_damage_rand,
                          all_shield_ignore=source.all_shield_ignore, physical_shield=target.physical_shield,
                          physical_damage_scale=target.physical_damage_scale,
                          physical_damage_addition=source.physical_damage_addition,
                          skill_damage_addition=source.skill_damage_addition,
                          move_state_damage_addition=source.move_state_damage_addition,
                          pve_damage_addition=source.pve_damage_addition,
                          level=53, shield_constant=SHIELD_CONSTANT_MAP[53])
        result = {}
        for key, (damages, critical) in expressions.items():
            samples = []
            for rand in [0, 0.5, 1]:
                values = variables | dict(rand=rand)
                samples.append([sum(expr.evaluate(values | dict(is_critical=crit)) for expr in damages)
                                for crit in [0, 1]])
            result[key] = dict(critical=critical.evaluate(variables), samples=samples)
        # Koala's toughness uses 9.518: it is critical-damage reduction, not the
        # 19.218 reduction of incoming critical chance displayed as 御劲 here.
        fixtures.append(dict(name=name, equipment=equipment, gains=gains,
                             panel={key: source[key] for key in panels} |
                                   dict(vitality=source.vitality, toughnessPower=source.toughness),
                             skills=result))
    output = dict(repository=reference["repository"], commit=reference["commit"],
                  sources=["assets/raw/skills.py", "base/attribute.py", "base/expression.py",
                           "base/constant.py", "qt/classes/skill.py"],
                  formulaHashes=formula_hashes, weaponAliases=weapon_aliases, cases=fixtures)
    (module / "考拉算法校验.json").write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n",
                                             encoding="utf-8")
    print(f"Verified {len(fixtures)} cases, {len(expressions)} skills, 3 damage rolls and both critical states")


if __name__ == "__main__":
    main()
