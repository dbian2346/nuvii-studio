import unittest

from ml.prompting.parser import build_generation_prompt, parse_nail_prompt

class PromptParserTests(unittest.TestCase):
    def test_extracts_nail_terms(self):
        result = parse_nail_prompt(
            "Long almond glossy nude nail with silver isolated chrome bow near the cuticle"
        )
        self.assertEqual(result.shape, "almond")
        self.assertEqual(result.length, "long")
        self.assertIn("glossy", result.finishes)
        self.assertIn("isolated_chrome", result.techniques)
        self.assertIn("bow", result.motifs)
        self.assertIn("cuticle", result.placements)

    def test_generation_prompt_is_single_nail(self):
        result = parse_nail_prompt("medium square burgundy French tip")
        prompt = build_generation_prompt(result)
        self.assertIn("single isolated", prompt)
        self.assertIn("press-on nail", prompt)

    def test_empty_prompt_fails(self):
        with self.assertRaises(ValueError):
            parse_nail_prompt("  ")

if __name__ == "__main__":
    unittest.main()
