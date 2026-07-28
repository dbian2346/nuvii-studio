# Architecture

Nuvii Studio separates the interactive editor from AI inference.

1. The Next.js editor stores a ten-nail design state with independent layer stacks.
2. The prompt parser turns casual language into nail-specific attributes.
3. The gateway validates requests and forwards them to GPU inference.
4. The SSD-1B base model plus Nuvii LoRA generates one isolated nail.
5. The client applies the selected shape mask and inserts the PNG as an editable layer.

This separation keeps browser code responsive and avoids exposing model credentials or heavy inference code to the client.
