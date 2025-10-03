import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Parser from "./parser.js";
import { Readable, Writable } from "node:stream";
import csvSpectrum from "csv-spectrum";
import { z } from "zod";

interface CsvSpectrumData {
  name: string;
  csv: Buffer;
  json: Buffer;
}

const csvSpectrumData = await new Promise<CsvSpectrumData[]>((resolve) =>
  csvSpectrum((err: Error | null, data: CsvSpectrumData[]) => {
    if (err) throw err;
    resolve(data);
  }),
);

// Zod schema for CSV spectrum expected results (array)
const csvRowSchema = z.record(z.string(), z.string());
const expectedResultSchema = z.union([z.array(csvRowSchema)]);

describe("Parser", () => {
  describe("Check against csv-spectrum", () => {
    const parserOptions: Record<
      string,
      {
        colDelimiter: string;
        colEscape: string | null;
        rowDelimiter: string;
        escapeChar?: string | null;
        header: boolean;
      }
    > = {
      comma_in_quotes: {
        colDelimiter: ",",
        colEscape: '"',
        rowDelimiter: "\n",
        escapeChar: undefined,
        header: true,
      },
      empty: {
        colDelimiter: ",",
        colEscape: '"',
        rowDelimiter: "\n",
        escapeChar: undefined,
        header: true,
      },
      empty_crlf: {
        colDelimiter: ",",
        colEscape: '"',
        rowDelimiter: "\r\n",
        escapeChar: undefined,
        header: true,
      },
      escaped_quotes: {
        colDelimiter: ",",
        colEscape: '"',
        rowDelimiter: "\n",
        escapeChar: '"',
        header: true,
      },
      json: {
        colDelimiter: ",",
        colEscape: '"',
        rowDelimiter: "\n",
        escapeChar: '"',
        header: true,
      },
      newlines: {
        colDelimiter: ",",
        colEscape: '"',
        rowDelimiter: "\n",
        escapeChar: '"',
        header: true,
      },
      newlines_crlf: {
        colDelimiter: ",",
        colEscape: '"',
        rowDelimiter: "\r\n",
        escapeChar: '"',
        header: true,
      },
      quotes_and_newlines: {
        colDelimiter: ",",
        colEscape: '"',
        rowDelimiter: "\n",
        escapeChar: '"',
        header: true,
      },
      simple: {
        colDelimiter: ",",
        colEscape: '"',
        rowDelimiter: "\n",
        escapeChar: '"',
        header: true,
      },
      simple_crlf: {
        colDelimiter: ",",
        colEscape: '"',
        rowDelimiter: "\r\n",
        escapeChar: '"',
        header: true,
      },
      utf8: {
        colDelimiter: ",",
        colEscape: '"',
        rowDelimiter: "\n",
        escapeChar: '"',
        header: true,
      },
      location_coordinates: {
        colDelimiter: ",",
        colEscape: null,
        rowDelimiter: "\n",
        escapeChar: null,
        header: true,
      },
    };

    for (const { name, csv, json } of csvSpectrumData) {
      it(`should pass test ${name}`, () => {
        return new Promise<void>((resolve) => {
          const option = parserOptions[name];
          const expectedResult = expectedResultSchema.parse(
            JSON.parse(json.toString("utf8")),
          );

          const parser = new Parser(option);
          const result: Map<string, string>[] = [];
          const readable = new Readable();

          const writable = new Writable({
            objectMode: true,
            write(data, _, next) {
              result.push(data);
              next();
            },
          });

          writable.on("finish", () => {
            for (let i = 0, l = result.length; i < l; i++) {
              const parserData = result[i];
              const keysOfParserData = Array.from(parserData.keys());

              const expectedData = expectedResult[i];
              const keysOfExpectedData = Object.keys(expectedData);

              assert.equal(keysOfParserData.length, keysOfExpectedData.length);

              for (let j = 0, jl = keysOfParserData.length; j < jl; j++) {
                assert.equal(keysOfParserData[j], keysOfExpectedData[j]);
              }

              for (const [key, value] of parserData) {
                assert.equal(value, expectedData[key]);
              }
            }
            resolve();
          });

          readable.pipe(parser).pipe(writable);
          readable.push(csv);
          readable.push(null);
        });
      });
    }
  });

  it("should work in headless mode", () => {
    return new Promise<void>((resolve) => {
      const data = "house,garden,tree\nwall,fence,bark";
      const expectedResult = [
        ["house", "garden", "tree"],
        ["wall", "fence", "bark"],
      ];
      const result: string[][] = [];
      const writable = new Writable({
        objectMode: true,
        write(data, _, next) {
          result.push(data);
          next();
        },
      });

      const parser = new Parser({
        colDelimiter: ",",
        colEscape: undefined,
        rowDelimiter: "\n",
        header: false,
      });

      writable.on("finish", () => {
        assert.equal(result.length, expectedResult.length);
        for (let i = 0, l = result.length; i < l; i++) {
          const row = result[i];
          const expectedRow = expectedResult[i];

          assert.equal(row.length, expectedRow.length);

          for (let j = 0, jl = row.length; j < jl; j++) {
            assert.equal(row[j], expectedRow[j]);
          }
        }
        resolve();
      });

      parser.pipe(writable);
      parser.end(Buffer.from(data));
    });
  });
});
