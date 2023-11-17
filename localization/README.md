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
[Playground]: https://www.typescriptlang.org/play?#code/JYWwDg9gTgLgBAbzgSQHYwKZUgGwIaYAmANHACpR6oDO+MwEqpMlNdGhcAvnAGZQQQcAOQABQsABuwVBgD0OCAGM8OYAC8CDVMIDcAWABQcuXFCRYiOAAtufAULHVMqJcBxyl0DMKPno8ABUcHjUcABKGHhK8PyCIlBRMXpGRnKBwQDKghgw1jIA5nAwEHCKkhgAdHCBckYYAB4W8DAAnmAYKJhCALwiAEYQEADWwnAAPiJ4YGA4PgaGaRlwAIJwHVDUjHDQcP0YhdW19U0Bxe2dAApYW6hwfUioeCAYAFxwzlCFpAUYqIRYd7CEBjSbCXigkQQSHCHTcVLGUwZYIAUVQBTU1FsLCotC02wAtMVrJ1+qFOvh0QBXPC-GoZBHpVHozG2MACVAQKk0OAACnZUgIGAAlDU6oYvDR4CiAHIAfUu4QA8jKlQBVGWZe5WEBA-LUYSkXh6rCGnZAvIHKBm1BA4AwA3wxbGZZojHALE2DA4DZ8Xa-GD0dEfQpU-BQOSzKmUHA7XghO7Ibp8gWSIXCo7iyXOOCyhUAGTV4RW+e1vPtGF1XUrpC83Jg71QVJA+ygop6AD44HX0Pcen0AIxwAD8ZmT7wrQgA1CIDQslsEyCS9uTPFRGMAVLHKQUaXTeW7WWY7nkPd3yaLjoZGs1u4wc7LtQgjHBX3AmasPhgYto43BEnMQqcMMGCtNQmYvm+MgsBA7zPoYb6Ie+yxrLMeAyASmANPAIGtNUMqlGAeCUCAYSJAAjlSwCJCQHylPawhhAAVlSOZ4HeUpUDA1QUK0xSlJKFSWPax4lCEfDcj+2xUJw1AYJ0ADu1gEDY0wdDQACEYqQUhxT2nMQJoDBhBUlJOjEAiumvh+ayJEo0bUFInQ4mw+JMP+GC8FgMhuMGECWlAxSsHi9D3tpCFWQC1BKFA7y8u2XYAAZLp0ABEAAkCAAMKVNBAiVPQMBzFwqXdspYCYFAiUWc6VnIcEqH4BhWE4aBcAKfatjsY5LKdERJEQRFul4IMVINnySmwXA1ybIwCVwIlKyjfAmWTZUTwvFw1WWVZNl3uAcwNF+6B-HJxIqaoWwcTA6E8gAEmQACypYgMRwxUmAg11eUGDUHFk3vDNtykEpBDvEmNZ3vWjbNq2CU6XVcAADwdilcC-OgcyIGtG0YDwSPAB2P3UEjciE4geaKiq6qagA2mtGMAlAAC6PBqIGWMIJThbFvmvKgzAtZcugwpcJUpMdgjXA1VwCI3mc2bwFl2ouSFHCVPZUCJOgB4ysK86IvSWREagHrYsFdC-sijLLGjk5hDIcCZCbZspl8aaYBm4WK7mmRysgZAoo9mTvJEXhQIQSMQyApBIH9HwsN86zvJ8ScFECIITCIELcF2DwI2pBlWPHwJUJoTxmsnIivag5ehGa6fZ2M0sI4MIzvMXQJqP0AiV6+YBd8APcQAapCvo3wLNzLNvG1Qrskj6WD8V+cwxAmISEEx370BUK5yZw2yM0vMlQ72-Lu+mg0+yifsrAAIgAUmWR+xdXMIQkL0NwE2LZYKQpEp0TuiI08dU7ALgOAQBXxwG8AHgnaBBR4ZDXRn8JmfY+iTwRohUcvIezwH7IOEcECwjvHAMKLBb44p4PQXAIco5eAkL4GAfWM9Pz8mIvQVQopVaW22GJZ2c8sTVDuhAISxI+oCDAGEMS0gMAKTgIQZQYQT6OQKE8GA0ZfpaV4svJQyl0SdGIruF4vY2gdDCLsRIGioAnguAmWS8l2rKXgOVdS4Fwry0sNfEO5ALZuSRmYjAEB4yyjzogBGeUprwTqoVIuiUjICBMkoNwABn1A21kGIWJnFR4zwMA-FQUvaWTiCCfxFvcSWmSrIowoYjRAL84AaX7E3IhwgUSxn6FSP4YwgT5nYp0v4eBhA8AQLjfGhNnh4FJuTBA1CCG0NadQKkPTZysWGeEqpdSb5ynvg-A8fsA5B0yPTZxzNKgFDKYLEQHRKIYAAI-QlIMIG5XS7lDKeS8+5I8zTPIwLct5BpRYUwOYHYOJyCDM1pnM5pdDZwrOecIVmtSkIS2RbLQw6K0hIltsuaIGjVDrAEAUEiRtWFqjOgI02npQiEtAMRPiO49yGP+HwVQHTojDGXoeV2vBdggA9D1IouF3ErGSRgCqOxUA4D4mAgoyiWW8EkqFHkeQVJWOjHcWVFjAqvSgO9T63t7zwBwAOAADHcPoPCgJI1lVnIyWBcDWttZMB+mQAAalR2mVj+DADsHZdakBvqKGlgTgm5hlAbD8aN+rPDCFeH2MaAFWABtNG4jAQbOPBt0S5MNf6BR4PnZBKbXy5JeECB+EBrDmRQf8QEb9uA1UQgLDuwhC4+EbW+PB7wABM09nQ+yQJEuwfQTXmsjTizo2smYcDgLIhSwjRFL0tISiAUjl5zoUUo+xIY1EEE0dQLSKIJAlECngMaEACReAOrkX6K6NhtDgMKrS8ajU2BgCAWMfQkaDEIK0SpiEkbWAHB2Qd6B8qxM6FwUmQH-1vkA92kDol8pRRivFbg0GEMI0AwAZkQ5EyoI0uQwHYSRcCk1RRQbkNYXDWGwB4bAxASoxMSOxsqJNUgiayPOI48RVjeCKOkzo0YUmP6-1GGzBAOYTGIAFF5NYd9OBhRAA
[Maketext]:   https://perldoc.perl.org/Locale::Maketext::TPJ13
