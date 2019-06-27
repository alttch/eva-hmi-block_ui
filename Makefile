all: build

prepare:
	npm i

build: clean-dist build-js done

clean-dist:
	rm -f hmi.min.js hmi.min.tmp.js

build-js:
	./node_modules/.bin/webpack
	echo "// eva-hmi-block_ui `jq < package.json -r .version`" > hmi.min.js
	cat hmi.min.tmp.js >> hmi.min.js
	rm -f hmi.min.tmp.js

done:
	@which figlet > /dev/null && figlet -f slant "DONE" || echo -e "-----------------\nDONE"


pub:
	npm version patch
	npm publish --access public

clean:
	rm -rf package-lock.json node_modules
