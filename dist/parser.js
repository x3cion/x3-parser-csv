"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
const string_decoder_1 = require("string_decoder");
class Parser extends stream_1.Transform {
    constructor(opts) {
        super(Object.assign(opts || {}, { readableObjectMode: true }));
        this.stringDecoder = new string_decoder_1.StringDecoder();
        this.colDelimiter = ";";
        this.colEscape = "\"";
        this.rowDelimiter = "\n";
        this.escapeChar = "\\";
        this.header = true;
        this.inColEscape = false;
        this.nextEscaped = false;
        this.currentData = "";
        this.tanglingData = null;
        this.currentColumn = 0;
        this.currentDataMap = new Map();
        if (opts)
            Object.assign(this, opts);
        if (this.header)
            this.headers = [];
    }
    _transform(buff, encoding, next) {
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
    getHeaders() {
        return this.headers;
    }
    /**
     * Writes gathered field data into final map. Adds the additional string if given.
     * @param additionalString If set, will be added to the end of the data
     */
    finalizeCurrentFieldData(additionalString) {
        additionalString && this.addData(additionalString);
        if (this.tanglingData)
            this.currentData = this.tanglingData + this.currentData;
        if (this.header)
            this.headers.push(this.currentData);
        else
            this.currentDataMap.set(this.headers[this.currentColumn++], this.currentData);
        this.currentData = "";
    }
    /**
     * Decodes the given Buffer and attaches tangling data infront
     * @param buf Buffer of utf8 data to be decoded
     */
    parseBuffer(buf) {
        let str = this.stringDecoder.write(buf);
        if (this.tanglingData) {
            str = this.tanglingData + str;
            this.tanglingData = null;
        }
        return str;
    }
    addData(str) {
        this.currentData += str;
    }
    handleRowDelimiter({ str, i, last }) {
        if (this.inColEscape || str.startsWith(this.rowDelimiter, i)) {
            return false;
        }
        return true;
    }
    /**
     * Parse string into output data structure
     * @param str
     */
    workString(str) {
        let last = -1;
        for (let i = 0, l = str.length; i < l; i++) {
            if (!this.inColEscape && str.startsWith(this.rowDelimiter, i)) {
                this.finalizeCurrentFieldData(str.slice(last + 1, i));
                if (!this.header) {
                    this.currentColumn !== this.headers.length && console.log("warning, got row delimiter, but column count not reached!", this.currentDataMap);
                    this.currentColumn = 0;
                    this.push(this.currentDataMap);
                    this.currentDataMap = new Map();
                }
                else
                    this.header = false;
                last = i + this.rowDelimiter.length - 1;
            }
            else if (!this.inColEscape && str[i] === this.colDelimiter) {
                this.finalizeCurrentFieldData(str.slice(last + 1, i));
                last = i;
            }
            else if (this.inColEscape
                && ((this.colEscape !== this.escapeChar && this.nextEscaped) ||
                    (this.colEscape === this.escapeChar && str[i] === this.colEscape && str.length > i + 1 && str[i + 1] === this.colEscape))) {
                this.addData(str.slice(last + 1, i));
                last = i;
            }
            else if (this.inColEscape && this.colEscape === this.escapeChar && !this.nextEscaped && str[i] === this.colEscape && str.length < i + 1) {
                break;
            }
            else if (!this.nextEscaped && str[i] === this.colEscape) {
                if (this.inColEscape) {
                    this.addData(str.slice(last + 1, i));
                    last = i;
                    this.inColEscape = false;
                }
                else {
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
        if ((this.rowDelimiter.length > 1 && this.rowDelimiter.includes(tanglingData[tanglingData.length - 1]))
            || (this.inColEscape && this.colEscape === this.escapeChar && tanglingData[tanglingData.length - 1] === this.colEscape))
            this.tanglingData = tanglingData;
        else
            this.addData(tanglingData);
    }
}
exports.default = Parser;
//# sourceMappingURL=parser.js.map