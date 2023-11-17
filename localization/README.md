# The Divine Localization Library

## The Doctrine

*Localization and translations should be ***code***, not data*.

## The Motivation

As developers, we want our languages to be expressive, elegant and concise, so that we may express complex thoughts
effortlessly and clearly to both the machine and readers of our code. We want first-class editor support for syntax
highlighting, code completions and validation.

Yet, when it comes to building something as complex as natural language sentences, we are supposed to make do with just
plain strings, a *switch/case* construct and some fixed *plural* function like it's still the 80's. No typed arguments,
no syntax validation or highlighting, no lookup-tables, custom functions or dictionaries, no tooling for finding out
where a particular translation is used by the program, or if it's even used at all.

Additionally, in web applications in particular, you may sometimes want to translate rich-text/markup and not just plain
text. No can do. So now the application has to know if a particular sentence should be HTML-encoded or not, with no way
to enforce that all translations match — and prepare to get p0wned if you forget to encode a parameter.

## The Conviction

This TypeScript library is really more dogma than code. In fact, it currently only exposes a single function! However:

* Your translations are easily available for consumption as a single property, either as a constant or a function.
* Translation keys can be plain strings, JSX/TSX markup ([React]/[Stencil]/[etc](test/jsx.ts)) or any other custom
  type or object you wish.
* Your IDE will provide code completion and will show what arguments are required and syntax highlight the actual
  translations.
* TypeScript will validate that all translations conform to the base language specification for every key, both
  regarding input parameters and the return type.
* You can define and use any kind of utility functions or lookup tables/dictionaries in your translations, including
  the standard [Intl] namespace for formatting dates, numbers and lists.
* It's also possible to look up other translated keys from within a translation.

```tsx
export const EN = {
    intro: {
        title: 'Introduction',
        descr: () => `The "${C.intro.title}" chapter`,
        about: (who: Person) => `About ${who.name}`,
        loves: (who: Person, what: Item, count: number) =>
            <>The gentle {who.name} <i>loves</i> {EN_PRONOUNS[who.gender]} little {EN_PLURAL(what, count)}.</>
    },
}

export const C = translated.current(EN);

...

export const ES: Translation<typeof EN> = {
    intro: {
        title: `Introducción`,
        loves: ({ name, gender }, what, count) =>
            <>
                {gender !== 'f' ? 'El buen' : 'La buena'} {name} <i>ama</i> {count === 1 ? 'su' : 'sus'} {
                ES_ADJ(ES_ITEMS[what].g, count, 'pequeño', 'pequeña', 'pequeños', 'pequeñas')} {
                ES_ITEMS[what][count === 1 ? 's' : 'p']}
            </>
        }
}

...

const { intro } = translated(EN, ES) as typeof EN;

const html = <body>
    <h1>{ intro.title }</h1>
    <h2>{ intro.descr() }</h2>
    <h3>{ intro.about(params.who) }</h3>
    <p>{ intro.loves(params.who, params.what, params.count) }</p>
</body>
```

Check out the fully interactive [Playground] example to better understand how it works. Make some mistakes and see what happens!

## Prior Art

These ideas are not new. I found the 20 year old [Maketext] article, shared by *m0llusk* on *Hacker News*, particularly
intriguing. A must read!

[Intl]:       https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl
[React]:      https://reactjs.org/docs/introducing-jsx.html
[Stencil]:    https://stenciljs.com/docs/templating-jsx
[Playground]: https://www.typescriptlang.org/play?#code/JYWwDg9gTgLgBAbzgSQHYwKZUgGwIaYAmANHACpR6oDO+MwEqpMlNdGhcAvnAGZQQQcAOQABQsABuwVBgD0OCAGM8OYAC8CDVMIDcAWABQcuXFCRYiOAAtufAULHVMqJcBxyl0DMKPno8ABUcHjUcABKGHhK8PyCIlBRMXpGRnKBwQDKghgw1jIA5nAwEHCKkhgAdHCBckYYAB4W8DAAnmAYKJhCALwiAEYQEADWwnAAPiJ4YGA4PgaGaRlwAIJwHVDUjHDQcP0YhdW19U0Bxe2dAApYW6hwfUioeCAYAFxwzlCFpAUYqIRYd7CEBjSbCXigkQQSHCHTcVLGUwZYIAUVQBTU1FsLCotC02wAtMVrJ1+qFOvh0QBXPC-GoZBHpVHozG2MACVAQKk0OAACnZUgIGAAlDU6oYvDR4CiAHIAfUu4QA8jKlQBVGWZe5WEBA-LUYSkXh6rCGnZAvIHKBm1BA4AwA3wxbGZZojHALE2DA4DZ8Xa-GD0dEfQpU-BQOSzKmUHA7XghO7Ibp8gWSIXCo7iyXOOCyhUAGTV4RW+e1vPtGF1XUrpC83Jg71QVJA+ygop6AD44HX0Pcen0AIxwAD8ZmT7wrQgA1CIDQslsEyCS9uTPFRGMAVLHKQUaXTeW7WWY7nkPd3yaLjoZGs1u4wc7LtQgjHBX3AmasPhgYto43BEnMQqcMMGCtNQmYvm+MgsBA7zPoYb6Ie+yxrLMeAyASmANPAIGtNUMqlGAeCUCAYSJAAjlSwCJCQHylPawhhAAVlSOZ4HeUpUDA1QUK0xSlJKFSWPax4lCEfDcj+2xUJw1AYJ0ADu1gEDY0wdDQACEYqQUhxT2nMQJoDBhBUlJOjEAiumvh+qH4BhWE4aBcAKfatjsdQhRzOsxHPBBCFWXggxUg2fJKbBcDXJsjDtl2AAGKxBfAAAkCBhZUTwvFwsUWc6VnIcEaxeOAcwNF+6B-HJxIqaoWwcTA6E8gAEmQACypYgMRwxUmAfl5eUGDUO8vJhe8kW3KQSkEO8SY1ne9aNs2rYxTpeVwAAPB2S6dL86Beal1gQOlzwYDwa3AB2-XUGtcjnYgeaKiq6qagA2mlO0AlAAC6PBqIGe33YWxb5sNykwLWXLoMKXCVNdHYrVwOVcIySLLJkRGoB62KsHi9DbMijLLFtY6VmEMhwGjVCYymXxppgGbaRK97SpkcrIGQKItZk7yRF4UCEGtM0gKQSCDR8LDfOs7yfBLBRAiCEwiBC3Bdg8K1qQZVii8CVCaE8ZqSyIHWoLroRmrLitjAjK2DCM7ya0Caj9AI+uvmADvAE7EAGqQr7m8CluIwTWTo1TJI+lg-FfnMMQJiEhBMd+9AVCucmcNs70RzJc29vyNPpn52bM3KKwACIAFJlhnUByzCELg-NcBNi2WCkKRUvi+iRqi9LndwOA7dfL3vBu2Lg8FMt-m+38H19n0-srYho68j28D9oOI592E7zgMKC9vkNK+z3AQ6jrwW98GAwrzi6BUpsR9CqKKOJsPiJ6lBTGNYtUjUQEJxKdOyCAYAwhiWkBgBScBCDKDCFnDyBQngwGjANLSvFI5KGUuiToxFdwvF7G0DoYRdiJEQVAE8FwEyyXks5UGqkZgVT8jeM4hdcxc3INjOg2g1r4IwBAeMsoVaIBWtBAQcE96vnoDADWsUjICBMkoNwABn1A2UxFlF-gNIajxjo-GnhHBG1CCD10hvcOGk9VobVUXlBAVc4AaX7BbDewgUSxn6FSP4YwgT5nYq4v4eBhA8AQBlE661zrPDwNdW6CBD5r2Po46gVIPGzlYv4wRZjVpvhRCzUuZcDwszZhzTIr1QafUqAUIxYMRAdEohgAAj9CUgwgqluJqX4hpTTalezNI0jA1SWkGihndPJ7NOZFIIJ9Z60T7En1nIkxpwhvqWLfLDVRSNDCrLSCjRcy5oiINUOsAQBQSL0kCEHOAapKofypqEfZoBiJ8R3HuLB-w+CqBcdEYYkdDxU14LsEAHoPLBlwuBVY8iMBgHgIwHAfEe4FBgc83gklcY8jyCpYh0Y7gwsIVAPunVuoFyZmUAcAAGO4fRn44w4GtGFCsjJYFwEBKlHciiTDLpkAAGpUZxlY-gwA7B2A8MpSCZNFNc7hvDcwymvh+ImRESJhCvMw2VzxRZIBGhFG4jAJqg2mt0cpC1m7Yp4KrMxarXxaJeECMuEBrDmTgFXGu3AcqIUmiFKYMw5iGhWivd4AAmQOzpmFIGEaUI1hKSVSsJsuRI-wsAcDgGAhS391HYstPsoBIDSgJsgdAihIZ4EECQdQLSKIJAlGxXgYKEACRFVmLkAaaaNhtDgECrSCqCXWBgCAWMfQ1qDEIK0UxiE1rWAHB2IN6ABCVAkV5Lg10R2DqWdYH1Y7RKTsClyGA-IfKkUqGFUUs65BLoXa+NaYAV3BsqJdLdcrd0HVIEqndLr73bvAivfd10z1GGun2gdRggA
[Maketext]:   https://perldoc.perl.org/Locale::Maketext::TPJ13
