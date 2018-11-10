all:		build

clean:
	rm -rf lib node_modules

prepare:
	yarn

build:		prepare
	yarn run tsc

publish:	clean build
	@[[ -z "$$(git status --porcelain)" && "$$(git describe)" =~ ^v[0-9]+\.[0-9]+\.[0-9]$$ ]] || (git describe; git status; false)
	npm publish --access publish

.PHONY:	all clean prepare build
