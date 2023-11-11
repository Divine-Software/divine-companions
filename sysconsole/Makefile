NAME		:= $(shell node -p 'require(`./package.json`).name')
VERSION		:= $(shell node -p 'require(`./package.json`).version')

all:		build

prepare:
	yarn

build:		prepare
	yarn run tsc

clean:
	rm -rf lib

distclean:	clean
	rm -rf node_modules

tag:
	@[[ -z "$$(git status --porcelain)" ]] || (git status; false)
	git tag -s v$(VERSION) -m "$(NAME) v$(VERSION)"

publish:	distclean build
	@[[ -z "$$(git status --porcelain)" && "$$(git describe)" == v$(VERSION) ]] || (git describe; git status; false)
	yarn publish --non-interactive --access public

.PHONY:		all prepare build clean distclean tag publish
