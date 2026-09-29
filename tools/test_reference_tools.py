"""Guard against accepting regressions or overwriting approved expectations."""
import json
from pathlib import Path
import tempfile
import unittest

from capture_core_reference import compare_or_record


class FrozenReferenceTests(unittest.TestCase):
    def test_changed_result_is_rejected_without_rewriting_baseline(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "cases.json"
            compare_or_record(target, {"thickness_mm": 650, "valid": True}, True)
            original = target.read_bytes()
            with self.assertRaises(SystemExit):
                compare_or_record(target, {"thickness_mm": 600, "valid": True}, False)
            self.assertEqual(original, target.read_bytes())

    def test_boolean_is_not_accepted_as_numeric_one(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "cases.json"
            compare_or_record(target, {"valid": True}, True)
            with self.assertRaises(SystemExit):
                compare_or_record(target, {"valid": 1}, False)

    def test_record_refuses_to_overwrite_existing_expectations(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "cases.json"
            compare_or_record(target, {"thickness_mm": 650}, True)
            with self.assertRaises(SystemExit):
                compare_or_record(target, {"thickness_mm": 600}, True)
            self.assertEqual(json.loads(target.read_text()), {"thickness_mm": 650})

    def test_dictionary_order_does_not_create_false_mismatch(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "cases.json"
            compare_or_record(target, {"a": 1, "b": 2}, True)
            compare_or_record(target, {"b": 2, "a": 1}, False)


if __name__ == "__main__":
    unittest.main()
