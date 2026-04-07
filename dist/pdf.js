import pkg from 'pdfjs-dist/legacy/build/pdf.js';
import path from 'node:path';
const { getDocument } = pkg;
export async function extractPdfText(buffer) {
    const pdf = await getDocument({ data: buffer }).promise;
    let text = '';
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const strings = content.items
            .map((item) => ('str' in item ? item.str : ''))
            .filter(Boolean);
        text += `${strings.join(' ')}\n`;
    }
    return text;
}
export async function extractDocumentText(buffer, filePath) {
    const extension = path.extname(filePath).toLowerCase();
    if (extension === '.txt') {
        return Buffer.from(buffer).toString('utf-8');
    }
    if (extension === '.pdf') {
        return extractPdfText(buffer);
    }
    throw new Error(`Unsupported file type: ${extension || 'unknown'}. Use .pdf or .txt.`);
}
//# sourceMappingURL=pdf.js.map