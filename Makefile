SUB_PACKAGES	= $(shell awk '/^ *-/ { print $$2 }' pnpm-workspace.yaml)
NODE_MODULES	= node_modules/.modules.yaml $(foreach package,$(SUB_PACKAGES),$(package)/node_modules)

help:
	@awk -F ':.*## ' '/^[^\t]+:.*## / { printf "\033[1m%-16s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

all:		build								## Build all packages (alias for build)

prepare:	$(NODE_MODULES)							## Build and install all dependencies

$(NODE_MODULES):package.json */package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc
	pnpm install --frozen-lockfile
	touch $(NODE_MODULES)

build::		prepare								## Build all packages
	pnpm exec tsc --build --verbose

lint:		prepare								## Lint all sources with eslint
	-pnpm exec eslint '*/src/**/*.ts'

test::	build lint								## Build and run all tests
	pnpm exec jest

clean::										## Clean all build artifacts (but not dependencies)
	rm -rf coverage

distclean::									## Like clean, but also remove all dependencies
	rm -rf node_modules

commit:		prepare								## Commit a change and create a change-log entry for it
	pnpm changeset

release:	pristine prepare						## Bump all package versions and generate change-log.
	pnpm exec changeset version
	pnpm install
	git commit --amend --reuse-message=HEAD pnpm-lock.yaml

publish:	pristine clean build test					## Publish all new packages to NPM
	pnpm publish -r --access public
	GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=tag.gpgSign GIT_CONFIG_VALUE_0=true pnpm exec changeset tag

pristine:
	@[[ -z "$$(git status --porcelain)" ]] || (git status; false)

clean distclean::
	@for package in $(SUB_PACKAGES); do echo "► $${package} ► $@"; $(MAKE) -C $${package} $@; done

.PHONY:		all prepare build lint test clean distclean commit release publish pristine
