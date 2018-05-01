# Intro

This [Transform](https://nodejs.org/api/stream.html#stream_duplex_and_transform_streams) takes Buffers and emits Maps of CSV Rows.

It's very fast and it's [csv-spectrum](https://www.npmjs.com/package/csv-spectrum) compliant.

This is bloody alpha. Feel free to try it out.

# Usage

- This only supports utf8. Other formats have to be converted before. (e.g. by [iconv-lite](https://www.npmjs.com/package/iconv-lite))
- Stick to the listed options

Available Options:

```ts
{
	// Separates columns
	colDelimiter: string,
	// Surrounds column content
	colEscape: string,
	// Escapes chars within column content
	escapeChar: string,
	// Separates rows
	rowDelimiter: string,
	// Enables or disables headers
	header: boolean
}
```

The object given to the Parser just override fields of `this`. You should not set unlisted fields, but I can't stop you either. Just don't complain about breaking changes.
 
An example from the csv-spectrum test suite:

```ts
import Parser from "./src/parser";
import { Readable, Writable } from "stream";

const parser = new Parser({
	colDelimiter: ",",
	colEscape: "\"",
	rowDelimiter: "\n",
	escapeChar: null,
	header: true
});

const readable = new Readable;
const writable = new Writable({
	objectMode: true,
	write(data, _, next) {
		// data is now:
		console.log(data);
	}
});

readable
	.pipe(parser)
	.pipe(writable);

readable.push(Buffer.from('first,last,address,city,zip\nJohn,Doe,120 any st.,"Anytown, WW",08123'), "utf8");
readable.push(null);

```

# Known Bugs
- ~~I'm not yet sure if header: false works~~ e5241520977225aa984175215d070e5c23601464