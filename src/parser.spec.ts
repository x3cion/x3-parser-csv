

import * as chai from "chai";
const should = chai.should();

import Parser from "./parser";

import { Readable, Writable } from "stream";

import * as csvSpectrum from "csv-spectrum";
import * as util from "util";

(async () => {

	const csvSpectrumData = await new Promise<{ name, csv, json }[]>(then => csvSpectrum((err, data) => {
		if (err) throw err;
		then(data);
	}));

	describe("Parser", () => {

		describe("Check against csv-spectrum", () => {
			const parserOptions = {
				"comma_in_quotes": {
					colDelimiter: ",",
					colEscape: "\"",
					rowDelimiter: "\n",
					escapeChar: null,
					header: true
				},
				"empty": {
					colDelimiter: ",",
					colEscape: "\"",
					rowDelimiter: "\n",
					escapeChar: null,
					header: true
				},
				"empty_crlf": {
					colDelimiter: ",",
					colEscape: "\"",
					rowDelimiter: "\r\n",
					escapeChar: null,
					header: true
				},
				"escaped_quotes": {
					colDelimiter: ",",
					colEscape: "\"",
					rowDelimiter: "\n",
					escapeChar: '"',
					header: true
				},
				"json": {
					colDelimiter: ",",
					colEscape: "\"",
					rowDelimiter: "\n",
					escapeChar: '"',
					header: true
				},
				"newlines": {
					colDelimiter: ",",
					colEscape: "\"",
					rowDelimiter: "\n",
					escapeChar: '"',
					header: true
				},
				"newlines_crlf": {
					colDelimiter: ",",
					colEscape: "\"",
					rowDelimiter: "\r\n",
					escapeChar: '"',
					header: true
				},
				"quotes_and_newlines": {
					colDelimiter: ",",
					colEscape: "\"",
					rowDelimiter: "\n",
					escapeChar: "\"",
					header: true
				},
				"simple": {
					colDelimiter: ",",
					colEscape: "\"",
					rowDelimiter: "\n",
					escapeChar: '"',
					header: true
				},
				"simple_crlf": {
					colDelimiter: ",",
					colEscape: "\"",
					rowDelimiter: "\r\n",
					escapeChar: '"',
					header: true
				},
				"utf8": {
					colDelimiter: ",",
					colEscape: "\"",
					rowDelimiter: "\n",
					escapeChar: '"',
					header: true
				}
			};

			for (let { name, csv, json } of csvSpectrumData) {
				it(`should pass test ${name}`, (done) => {
					const option = parserOptions[name];
					const expectedResult = JSON.parse(json.toString("utf8"));
					const parser = new Parser(option);
					const result = [];
					const readable = new Readable;

					const writable = new Writable({
						objectMode: true,
						write(data, _, next) {
							result.push(data);
							next();
						}
					});

					writable.on("finish", () => {
						for (let i = 0, l = result.length; i < l; i++) {
							const parserData = result[i];
							const keysOfParserData = Array.from(parserData.keys());

							const expectedData = expectedResult[i];
							const keysOfExpectedData = Object.keys(expectedData);

							keysOfParserData.length.should.equal(keysOfExpectedData.length);

							for (let i = 0, l = keysOfParserData.length; i < l; i++) {
								keysOfParserData[i].should.equal(keysOfExpectedData[i]);
							}

							for (let [key, value] of parserData) {
								value.should.equal(expectedData[key]);
							}
						}
						done();
					});

					readable.pipe(parser).pipe(writable);

					readable.push(csv);
					readable.push(null);
				});
			}
		});

		it("should work in headless mode", () => {
			const data = "house,garden,tree\nwall,fence,bark";
			const expectedResult = [["house", "garden", "tree"], ["wall", "fence", "bark"]];
			const result = [];
			const writable = new Writable({
				objectMode: true,
				write(data, _, next) {
					result.push(data);
					next();
				}
			});

			const parser = new Parser({
				colDelimiter: ",",
				colEscape: null,
				rowDelimiter: "\n",
				header: false
			});

			writable.on("finish", () => {
				result.length.should.equal(expectedResult.length);
				for (let i = 0, l = result.length; i < l; i++) {
					let row = result[i];
					let expectedRow = expectedResult[i];

					row.length.should.equal(expectedRow.length);

					for (let i = 0, l = row.length; i < l; i++) {
						should.equal(row[i], expectedRow[i]);
					}
				}
			});

			parser.pipe(writable);

			parser.end(Buffer.from(data));

		})
	});



	run();
})();