import * as pdfreader from 'pdfreader';
import { Logger } from '../../../core-aura-mcp/src/lib/logger';

export class PDFParser {
	async parse(filePath: string): Promise<string> {
		return new Promise((resolve, reject) => {
			let text = '';
			let pageNum = 0;

			new pdfreader.PdfReader().parseFileItems(filePath, (err: any, item: any) => {
				if (err) {
					Logger.error('pdfParser.parse.error', { file: filePath, error: err.message });
					reject(err);
				} else if (!item) {
					// End of file
					resolve(text);
				} else if (item.page) {
					pageNum = item.page;
					text += `\n--- PAGE ${pageNum} ---\n`;
				} else if (item.text) {
					text += item.text + ' ';
				}
			});
		});
	}
}
