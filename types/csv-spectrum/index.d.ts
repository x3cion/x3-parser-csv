declare module "csv-spectrum" {
	interface CsvSpectrumData {
		name: string;
		csv: Buffer;
		json: Buffer;
	}

	function csvSpectrum(
		callback: (err: Error | null, data: CsvSpectrumData[]) => void
	): void;

	export = csvSpectrum;
}
