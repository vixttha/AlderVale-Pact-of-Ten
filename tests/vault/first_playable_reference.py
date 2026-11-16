"""Compare AlderVale's progression and First Spark rules with a Python reference."""

from bisect import bisect_right
import json
from pathlib import Path
import subprocess
import unittest


ROOT = Path(__file__).resolve().parents[2]
NODE_DRIVER = """
import { readFileSync } from 'node:fs';
import { applySagaEvent, applyWizardXp } from './shared/quests.ts';

const { awards, guest } = JSON.parse(readFileSync(0, 'utf8'));
const progression = awards.map(({ level, xp, award }) => applyWizardXp({ level, xp }, award));
const first = applySagaEvent(guest, 'solo-win');
const replay = applySagaEvent(JSON.parse(JSON.stringify(first)), 'solo-win');
console.log(JSON.stringify({ progression, first, replay }));
"""


def lifetime_xp(level):
    steps = level - 1
    return 90 * steps + 45 * steps * (steps + 1) // 2 + 2 * steps * (steps + 1) * (2 * steps + 1)


LEVEL_THRESHOLDS = [lifetime_xp(level) for level in range(1, 51)]


def reference_progression(level, xp, award):
    total = LEVEL_THRESHOLDS[level - 1] + xp + award
    reached = bisect_right(LEVEL_THRESHOLDS, total)
    return {
        "level": reached,
        "rank": min(20, (reached + 1) // 2),
        "xp": min(10_000_000, total - LEVEL_THRESHOLDS[reached - 1]),
    }


class FirstPlayableReferenceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.awards = [
            {"level": level, "xp": xp, "award": award}
            for level in (1, 2, 10, 38, 39, 49, 50)
            for xp in (0, 1, 17)
            for award in (0, 146, 147, 148, 20_000, 10_000_100)
        ]
        # This projection carries only the fields read by the saga reducer.
        cls.guest = {
            "id": "guest_first_spark_reference",
            "realmId": "breeze",
            "level": 1,
            "rank": 1,
            "xp": 57,
            "currencies": {"florins": 220, "spellShards": 4, "honorMarks": 10, "bondingSeals": 2},
            "progression": {"completedQuests": ["fixture_previous_quest"], "questWins": {}},
        }
        result = subprocess.run(
            ["node", "--input-type=module", "--eval", NODE_DRIVER],
            cwd=ROOT,
            input=json.dumps({"awards": cls.awards, "guest": cls.guest}),
            capture_output=True,
            text=True,
            encoding="utf-8",
            check=False,
            timeout=30,
        )
        if result.returncode:
            raise RuntimeError(f"AlderVale rule runner failed:\n{result.stderr}")
        cls.observed = json.loads(result.stdout)

    def test_progression_matches_reference(self):
        self.assertEqual(len(self.observed["progression"]), len(self.awards))
        for award, actual in zip(self.awards, self.observed["progression"]):
            with self.subTest(**award):
                self.assertEqual(actual, reference_progression(**award))
        print(f"PASS: {len(self.awards)} XP and rank reference comparisons", flush=True)

    def test_first_spark_award_and_replay(self):
        expected = {
            **self.guest,
            **reference_progression(level=1, xp=57, award=90),
            "currencies": {**self.guest["currencies"], "florins": 330, "spellShards": 7},
            "progression": {
                "questWins": {},
                "completedQuests": ["fixture_previous_quest", "q_first_duel"],
            },
        }
        self.assertEqual(self.observed["first"], expected)
        self.assertEqual(self.observed["replay"], expected)
        print("PASS: First Spark payout and one-time replay reference", flush=True)


if __name__ == "__main__":
    unittest.main()
