# Upload to GitHub

## Browser method

1. Create a new empty repository named `nuvii-studio`.
2. Keep it public for your portfolio, or private until the README is finalized.
3. Open the repository and choose **Add file → Upload files**.
4. Drag the contents of this folder into the upload area.
5. Commit with the message `Initial Nuvii Studio release`.

## Terminal method

```bash
cd path/to/nuvii-studio-ai-github
git init
git add .
git commit -m "Initial Nuvii Studio release"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/nuvii-studio.git
git push -u origin main
```

Before uploading, confirm that no `.env`, dataset ZIP, `.safetensors` or private nail images are present.
