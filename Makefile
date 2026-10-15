.PHONY: libretranslate

libretranslate:
	docker run -it --rm -p 5000:5000 -v libretranslate_models:/home/libretranslate/.local:rw libretranslate/libretranslate
