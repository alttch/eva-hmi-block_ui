VERSION=$(shell jq -r .version < package.json)

all: build

prepare:
	npm i

build: clean-dist build-js done

clean-dist:
	rm -f index.min.js index.min.tmp.js

build-js:
	./node_modules/.bin/webpack
	echo "// eva-hmi-block_ui `jq < package.json -r .version`" > index.min.js
	cat index.min.tmp.js >> index.min.js
	rm -f index.min.tmp.js

done:
	@which figlet > /dev/null && figlet -f slant "DONE" || echo -e "-----------------\nDONE"

release: pub build ver-pub pkg pub-pkg

pub:
	npm version --no-git-tag-version patch
	npm publish --access public

clean:
	rm -rf package-lock.json node_modules

ver-pub:
	git commit -a -m "version `jq < package.json -r .version`"; 
	git push

pkg:
	rm -rf _build
	mkdir -p _build/ui/apps/eva-hmi-block_ui
	cp -r index.min.js setup.py themes examples doc _build/ui/apps/eva-hmi-block_ui/
	cd _build && tar czvf eva-hmi-block_ui-$(VERSION).evapkg ui

pub-pkg:
	echo "" | gh release create v$(VERSION) -t "v$(VERSION)" _build/eva-hmi-block_ui-$(VERSION).evapkg
