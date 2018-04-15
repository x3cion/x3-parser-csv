"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
const string_decoder_1 = require("string_decoder");
class Parser extends stream_1.Transform {
    constructor(opts) {
        super(Object.assign(opts || {}, { objectMode: true }));
        this.stringDecoder = new string_decoder_1.StringDecoder();
        this.colDelimiter = ";";
        this.colEscape = "\"";
        this.rowDelimiter = "\n";
        this.escapeChar = "\\";
        this.header = true;
        this.headers = [];
        this.inColEscape = false;
        this.nextEscaped = false;
        this.currentData = "";
        this.tanglingData = null;
        this.currentColumn = 0;
        this.currentDataMap = new Map();
        if (opts)
            Object.assign(this, opts);
        // if (this.header) {
        // 	this.workString = this.workStringHeader;
        // }
    }
    _transform(data, encoding, next) {
        this.workString(this.stringDecoder.write(data));
        next();
    }
    _flush(done) {
        this.finalizeCurrentFieldData();
        if (this.currentColumn === this.headers.length)
            this.push(this.currentDataMap);
        done();
    }
    finalizeCurrentFieldData() {
        if (this.tanglingData)
            this.currentData = this.tanglingData + this.currentData;
        if (this.header)
            this.headers.push(this.currentData);
        else
            this.currentDataMap.set(this.headers[this.currentColumn++], this.currentData);
        this.currentData = "";
    }
    workString(str) {
        if (this.tanglingData) {
            str = this.tanglingData + str;
            this.tanglingData = null;
        }
        let last = -1;
        for (let i = 0, l = str.length; i < l; i++) {
            if (((this.rowDelimiter.length > 1 && str.length >= i + this.rowDelimiter.length && this.rowDelimiter === str.slice(i, i + this.rowDelimiter.length))
                || str[i] === this.rowDelimiter) && !this.inColEscape) {
                if (i - last > 1) {
                    this.currentData = this.currentData.concat(str.slice(last + 1, i));
                }
                this.finalizeCurrentFieldData();
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
            else if (str[i] === this.colDelimiter && !this.inColEscape) {
                if (i - last > 1) {
                    this.currentData = this.currentData.concat(str.slice(last + 1, i));
                }
                this.finalizeCurrentFieldData();
                last = i;
            }
            else if (this.inColEscape
                && ((this.colEscape === this.escapeChar && str[i] === this.colEscape && str.length > i + 1 && str[i + 1] === this.colEscape)
                    || (this.colEscape !== this.escapeChar) && this.nextEscaped)) {
                this.currentData = this.currentData.concat(str.slice(last + 1, i));
                last = i;
            }
            else if (this.inColEscape && this.colEscape === this.escapeChar && !this.nextEscaped && str[i] === this.colEscape && str.length < i + 1) {
                break;
            }
            else if (str[i] === this.colEscape && !this.nextEscaped) {
                if (this.inColEscape) {
                    this.currentData = this.currentData.concat(str.slice(last + 1, i));
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
            this.currentData = this.currentData.concat(tanglingData);
    }
}
exports.default = Parser;
//# sourceMappingURL=parser.js.map