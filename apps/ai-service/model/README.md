# Bundled Nuvii LoRA adapters

These files were produced by the completed SSD-1B LoRA run.

| File | Training step | Purpose |
| --- | ---: | --- |
| `pytorch_lora_weights.safetensors` | 1200 | final/root adapter |
| `checkpoints/nuvii-800.safetensors` | 800 | earlier prompt/style trade-off candidate |
| `checkpoints/nuvii-1000.safetensors` | 1000 | default prompt-friendly candidate |
| `checkpoints/nuvii-1200.safetensors` | 1200 | final adapter under checkpoint naming |

The app's Quality mode does not assume step 1200 is always best. It varies checkpoint and LoRA strength, then can use visual QC to select the strongest prompt match.
