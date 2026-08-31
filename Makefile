.PHONY: test validate studio

test:
	python -m unittest discover -s tests -v

validate:
	python ml/scripts/validate_dataset.py ml/data/sample

studio:
	cd apps/studio && npm run dev
