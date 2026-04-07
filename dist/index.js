import 'dotenv/config';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { checkChromaConnection } from './chroma.js';
import { askDirect, askRag, clearKnowledgeBase, getIndexedChunk, getIndexedChunks, getKnowledgeBaseSummary, indexPdf, } from './rag-demo.js';
function printHelp() {
    console.log('\nCommands:');
    console.log('  load <path-to-file>  Index a PDF or TXT file into Chroma');
    console.log('  ask <question>       Ask a question with RAG context from Chroma');
    console.log('  ask-direct <question> Ask a question without RAG for hallucination demos');
    console.log('  list                 Show indexed files and chunk count');
    console.log('  chunks [filter]      Show stored chunks, optionally filtered by file name or path');
    console.log('  chunk <filter> <n>   Show full content of one stored chunk');
    console.log('  reset                Delete all indexed records from the demo collection');
    console.log('  help                 Show this help');
    console.log('  exit                 Quit the console\n');
}
function printRagDiagnostics(diagnostics) {
    console.log('\nRAG diagnostics:');
    console.log(`Embedding model: ${diagnostics.embeddingModel}`);
    console.log(`Chat model: ${diagnostics.chatModel}`);
    console.log(`Top-K: ${diagnostics.topK}`);
    if (!diagnostics.matches.length) {
        console.log('Matches: none');
        return;
    }
    console.log('Matches:');
    diagnostics.matches.forEach((match, index) => {
        const chunkLabel = match.chunkIndex == null ? 'unknown' : match.chunkIndex;
        const distanceLabel = match.distance == null ? 'n/a' : match.distance.toFixed(6);
        console.log(`  ${index + 1}. file=${match.fileName}, chunk=${chunkLabel}, distance=${distanceLabel}`);
        console.log(`     path=${match.sourcePath}`);
        console.log(`     preview=${match.preview || '[empty chunk]'}`);
    });
}
async function main() {
    await checkChromaConnection();
    const rl = readline.createInterface({ input, output });
    console.log('Console RAG demo is ready.');
    console.log('Using Chroma collection:', process.env.CHROMA_COLLECTION || 'rag_demo_console');
    printHelp();
    while (true) {
        const rawInput = (await rl.question('rag-demo> ')).trim();
        if (!rawInput) {
            continue;
        }
        const [command, ...rest] = rawInput.split(' ');
        const value = rest.join(' ').trim();
        try {
            if (command === 'exit') {
                break;
            }
            if (command === 'help') {
                printHelp();
                continue;
            }
            if (command === 'load') {
                if (!value) {
                    console.log('Provide a PDF or TXT file path.');
                    continue;
                }
                console.log('Indexing file...');
                const result = await indexPdf(value);
                console.log(`Indexed ${result.fileName} with ${result.chunkCount} chunks.`);
                continue;
            }
            if (command === 'ask') {
                if (!value) {
                    console.log('Provide a question.');
                    continue;
                }
                console.log('Searching Chroma and generating answer...');
                const result = await askRag(value);
                printRagDiagnostics(result.diagnostics);
                console.log(`\nAnswer:\n${result.answer}\n`);
                continue;
            }
            if (command === 'ask-direct') {
                if (!value) {
                    console.log('Provide a question.');
                    continue;
                }
                console.log('Generating answer without RAG context...');
                const result = await askDirect(value);
                console.log(`\nDirect answer:\n${result.answer}\n`);
                continue;
            }
            if (command === 'list') {
                const summary = await getKnowledgeBaseSummary();
                console.log(`Chunks: ${summary.chunkCount}`);
                console.log(`Files: ${summary.files.length ? summary.files.join(', ') : 'none'}`);
                continue;
            }
            if (command === 'chunks') {
                const chunks = await getIndexedChunks(value || undefined);
                if (!chunks.length) {
                    console.log('No chunks found.');
                    continue;
                }
                console.log(`Stored chunks: ${chunks.length}`);
                chunks.forEach((chunk, index) => {
                    const chunkLabel = chunk.chunkIndex == null ? 'unknown' : chunk.chunkIndex;
                    console.log(`  ${index + 1}. file=${chunk.fileName}, chunk=${chunkLabel}, length=${chunk.length}`);
                    console.log(`     path=${chunk.sourcePath}`);
                    console.log(`     preview=${chunk.preview || '[empty chunk]'}`);
                });
                continue;
            }
            if (command === 'chunk') {
                if (!value) {
                    console.log('Provide a file filter and chunk index, for example: chunk aurelion 0');
                    continue;
                }
                const lastSpaceIndex = value.lastIndexOf(' ');
                if (lastSpaceIndex === -1) {
                    console.log('Provide a file filter and chunk index, for example: chunk aurelion 0');
                    continue;
                }
                const filter = value.slice(0, lastSpaceIndex).trim();
                const chunkIndexRaw = value.slice(lastSpaceIndex + 1).trim();
                const chunkIndex = Number(chunkIndexRaw);
                if (!filter || !Number.isInteger(chunkIndex) || chunkIndex < 0) {
                    console.log('Chunk index must be a non-negative integer.');
                    continue;
                }
                const chunk = await getIndexedChunk(filter, chunkIndex);
                if (!chunk) {
                    console.log('Chunk not found.');
                    continue;
                }
                console.log(`file=${chunk.fileName}, chunk=${chunk.chunkIndex}, length=${chunk.length}`);
                console.log(`path=${chunk.sourcePath}`);
                console.log(`content:\n${chunk.content}`);
                continue;
            }
            if (command === 'reset') {
                const deleted = await clearKnowledgeBase();
                console.log(`Deleted ${deleted} records.`);
                continue;
            }
            console.log('Unknown command.');
            printHelp();
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Error: ${message}`);
        }
    }
    rl.close();
}
main().catch((error) => {
    const message = error instanceof Error ? error.message : 'Unknown startup error';
    console.error(`Startup failed: ${message}`);
    process.exitCode = 1;
});
//# sourceMappingURL=index.js.map