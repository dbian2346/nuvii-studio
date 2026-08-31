import unittest

from main import GenerateRequest, _build_prompt, health


class InferenceServiceTests(unittest.TestCase):
    def test_structured_prompt_keeps_requested_art_inside_clip_budget(self):
        request = GenerateRequest(
            prompt=(
                "fall pumpkin, autumn burnt-orange and cream palette, "
                "recognizable orange pumpkin with curved ribs and green stem"
            ),
            shape="almond",
            length="long",
            baseColor="#f4c3d3",
            finish="matte",
        )

        prompt = _build_prompt(request)

        self.assertLessEqual(len(prompt.split()), 77)
        self.assertIn("NUV11NAIL", prompt)
        self.assertIn("fall pumpkin", prompt)
        self.assertIn("long almond", prompt)
        self.assertIn("matte base", prompt)

    def test_health_distinguishes_configuration_from_lazy_model_load(self):
        status = health()

        self.assertEqual(status["status"], "ok")
        self.assertEqual(status["model"], "segmind/SSD-1B")
        self.assertTrue(status["loraConfigured"])
        self.assertFalse(status["modelLoaded"])


if __name__ == "__main__":
    unittest.main()
