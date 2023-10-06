all:		build

prepare:
	$(MAKE) -C .. $@

build:		prepare
	pnpm exec tsc --build

test:		build
	pnpm exec jest

clean:
	rm -rf build coverage

distclean:	clean
	rm -rf node_modules

.PHONY:		all prepare build test clean distclean
