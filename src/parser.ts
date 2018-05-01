import { Readable, ReadableOptions, Transform, Writable } from "stream";
import { StringDecoder } from "string_decoder";

export interface ParserOptions extends ReadableOptions {
	colDelimiter?: string;
	colEscape?: string;
	rowDelimiter: string;
	escapeChar?: string;
	header?: boolean;
}

export default class Parser extends Transform {

	private stringDecoder = new StringDecoder();

	private colDelimiter = ";";
	private colEscape = "\"";
	private rowDelimiter = "\n";
	private escapeChar = "\\";

	private header = true;

	constructor(opts?: ParserOptions) {
		super(Object.assign(opts || {}, { readableObjectMode: true }));

		if (opts) Object.assign(this, opts);

		if (this.header) {
			this.inHeaders = true;
			this.currentDataMap = new Map();
		} else {
			this.currentDataMap = [];
		}
	}

	_transform(buff: Buffer, encoding: string, next: Function) {

		const str = this.parseBuffer(buff);
		this.workString(str);

		next();
	}

	_flush(done) {
		const str = this.stringDecoder.end();
		if (str) {
			this.workString(str);
		}

		this.finalizeCurrentFieldData();
		if (this.currentColumn === this.headers.length)
			this.push(this.currentDataMap);
		done();
	}

	private headers: string[] = [];
	private inHeaders = false;

	private inColEscape = false;
	private nextEscaped = false;

	private currentData = "";
	private tanglingData = null;
	private currentColumn = 0;
	private currentDataMap: Map<string, string> | string[];

	getHeaders(): string[] {
		return this.headers;
	}


	/**
	 * Writes gathered field data into final map. Adds the additional string if given.
	 * @param additionalString If set, will be added to the end of the data
	 */
	finalizeCurrentFieldData(additionalString?: string): void {
		additionalString && this.addData(additionalString);
		if (this.tanglingData) this.currentData = this.tanglingData + this.currentData;
		if (this.inHeaders)
			this.headers.push(this.currentData);
		else if (this.header) {
			(<Map<string, string>>this.currentDataMap).set(this.headers[this.currentColumn++], this.currentData);
		} else {
			(<string[]>this.currentDataMap).push(this.currentData);
		}
		this.currentData = "";
	}

	/**
	 * Decodes the given Buffer and attaches tangling data infront
	 * @param buf Buffer of utf8 data to be decoded
	 */
	private parseBuffer(buf: Buffer) {
		let str = this.stringDecoder.write(buf);
		if (this.tanglingData) {
			str = this.tanglingData + str;
			this.tanglingData = null;
		}
		return str;
	}

	addData(str: string) {
		this.currentData += str;
	}

	/**
	 * Parse string into output data structure
	 * @param str 
	 */
	workString(str: string) {

		let last = -1;

		for (let i = 0, l = str.length; i < l; i++) {
			if (!this.inColEscape && str.startsWith(this.rowDelimiter, i)) {
				this.finalizeCurrentFieldData(str.slice(last + 1, i));
				if (!this.inHeaders) {
					this.currentColumn !== this.headers.length && console.warn("warning, got row delimiter, but column count not reached!", this.currentDataMap);
					this.currentColumn = 0;
					this.push(this.currentDataMap);
					this.currentDataMap = this.header ? new Map() : [];
				} else
					this.inHeaders = false;
				last = i + this.rowDelimiter.length - 1;
			} else if (!this.inColEscape && str[i] === this.colDelimiter) {
				this.finalizeCurrentFieldData(str.slice(last + 1, i));

				last = i;
			} else if (this.inColEscape
				&& (
					(this.colEscape !== this.escapeChar && this.nextEscaped) ||
					(this.colEscape === this.escapeChar && str[i] === this.colEscape && str.length > i + 1 && str[i + 1] === this.colEscape)
				)
			) {
				this.addData(str.slice(last + 1, i));
				last = i;
			}
			else if (this.inColEscape && this.colEscape === this.escapeChar && !this.nextEscaped && str[i] === this.colEscape && str.length < i + 1) {
				break;
			} else if (!this.nextEscaped && str[i] === this.colEscape) {
				if (this.inColEscape) {
					this.addData(str.slice(last + 1, i));
					last = i;
					this.inColEscape = false;
				} else {
					last = i;
					this.inColEscape = true;
				}
			}
			this.nextEscaped = !this.nextEscaped && str[i] === this.escapeChar;
		}

		let tanglingData;

		if (last === 0)
			tanglingData = str;
		else
			tanglingData = str.substring(last + 1);

		if (
			(this.rowDelimiter.length > 1 && this.rowDelimiter.includes(tanglingData[tanglingData.length - 1]))
			|| (this.inColEscape && this.colEscape === this.escapeChar && tanglingData[tanglingData.length - 1] === this.colEscape)
		)
			this.tanglingData = tanglingData;
		else
			this.addData(tanglingData);
	}

}