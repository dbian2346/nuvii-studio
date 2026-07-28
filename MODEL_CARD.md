# Model Card: Nuvii Nail LoRA

## Intended use

Generate one isolated press-on nail design from a structured text prompt, then insert the result into Nuvii Studio as an editable full-nail image layer.

## Base model

The low-memory training notebook targets `segmind/SSD-1B`, an SDXL-family diffusion model, with a LoRA adapter trained on Nuvii-owned nail images.

## Trigger word

`NUV11NAIL`

## Expected prompt structure

`NUV11NAIL, single isolated [length] [shape] press-on nail, front view, centered on a plain white background, [design description]`

## Known limitations

- Generative outputs can still include incorrect anatomy or multiple nails.
- Small datasets can overfit to repeated palettes and motifs.
- The output must be validated and masked before display in the editor.
- The model should not be used to reproduce another artist's copyrighted work.

## Evaluation

Evaluate shape compliance, single-nail compliance, terminology accuracy, composition, background cleanliness and similarity to the Nuvii design language on the held-out test sets.
