import 'dotenv/config';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import boxen from 'boxen';
import pc from 'picocolors';
import { checkChromaConnection } from './chroma.js';
import { askDirect, askRag, clearKnowledgeBase, getIndexedChunk, getIndexedChunks, getKnowledgeBaseSummary, indexPdf, } from './rag-demo.js';
const promptLabel = pc.bold(pc.cyan('rag-demo'));
const muted = (value) => pc.dim(value);
const info = (value) => `${pc.cyan('i')} ${value}`;
const success = (value) => `${pc.green('OK')} ${value}`;
const warning = (value) => `${pc.yellow('!')} ${value}`;
const errorText = (value) => `${pc.red('ERR')} ${value}`;
function printSection(title) {
    console.log(`\n${pc.bold(pc.blue(title))}`);
}
function printKeyValue(label, value) {
    console.log(`${pc.bold(label)} ${value}`);
}
function printBox(title, body, borderColor) {
    console.log(boxen(body, {
        title,
        padding: 1,
        margin: { top: 1, bottom: 0, left: 0, right: 0 },
        borderStyle: 'round',
        borderColor,
    }));
}
function printHelp() {
    printSection('Commands');
    console.log(`  ${pc.green('load <path-to-file>')}   ${muted('Index a PDF or TXT file into Chroma')}`);
    console.log(`  ${pc.green('ask <question>')}        ${muted('Ask a question with RAG context from Chroma')}`);
    console.log(`  ${pc.green('ask-direct <question>')} ${muted('Ask a question without RAG for hallucination demos')}`);
    console.log(`  ${pc.green('list')}                  ${muted('Show indexed files and chunk count')}`);
    console.log(`  ${pc.green('chunks [filter]')}       ${muted('Show stored chunks, optionally filtered by file name or path')}`);
    console.log(`  ${pc.green('chunk <filter> <n>')}    ${muted('Show full content of one stored chunk')}`);
    console.log(`  ${pc.green('reset')}                 ${muted('Delete all indexed records from the demo collection')}`);
    console.log(`  ${pc.green('help')}                  ${muted('Show this help')}`);
    console.log(`  ${pc.green('exit')}                  ${muted('Quit the console')}\n`);
}
function printRagDiagnostics(diagnostics) {
    printSection('RAG Diagnostics');
    printKeyValue('Embedding model:', diagnostics.embeddingModel);
    printKeyValue('Chat model:', diagnostics.chatModel);
    printKeyValue('Top-K:', String(diagnostics.topK));
    if (!diagnostics.matches.length) {
        console.log(muted('Matches: none'));
        return;
    }
    console.log(pc.bold('Matches:'));
    diagnostics.matches.forEach((match, index) => {
        const chunkLabel = match.chunkIndex == null ? 'unknown' : match.chunkIndex;
        const distanceLabel = match.distance == null ? 'n/a' : match.distance.toFixed(6);
        console.log(`  ${pc.cyan(String(index + 1))}. ${pc.bold(match.fileName)} ${muted(`chunk=${chunkLabel}, distance=${distanceLabel}`)}`);
        console.log(`     ${muted(match.sourcePath)}`);
        console.log(`     ${match.preview || muted('[empty chunk]')}`);
    });
}
async function main() {
    await checkChromaConnection();
    const rl = readline.createInterface({ input, output });
    printBox('Console RAG Demo', `${pc.bold('Status')} ${pc.green('ready')}\n${pc.bold('Chroma collection')} ${process.env.CHROMA_COLLECTION || 'rag_demo_console'}`, 'cyan');
    printHelp();
    while (true) {
        const rawInput = (await rl.question(`${promptLabel}> `)).trim();
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
                    console.log(warning('Provide a PDF or TXT file path.'));
                    continue;
                }
                console.log(info('Indexing file...'));
                const result = await indexPdf(value);
                console.log(success(`Indexed ${pc.bold(result.fileName)} with ${result.chunkCount} chunks.`));
                continue;
            }
            if (command === 'ask') {
                if (!value) {
                    console.log(warning('Provide a question.'));
                    continue;
                }
                console.log(info('Searching Chroma and generating answer...'));
                const result = await askRag(value);
                printRagDiagnostics(result.diagnostics);
                printBox('Answer', result.answer, 'green');
                continue;
            }
            if (command === 'ask-direct') {
                if (!value) {
                    console.log(warning('Provide a question.'));
                    continue;
                }
                console.log(info('Generating answer without RAG context...'));
                const result = await askDirect(value);
                printBox('Direct Answer', result.answer, 'yellow');
                continue;
            }
            if (command === 'list') {
                const summary = await getKnowledgeBaseSummary();
                printSection('Knowledge Base');
                printKeyValue('Chunks:', String(summary.chunkCount));
                printKeyValue('Files:', summary.files.length ? summary.files.join(', ') : muted('none'));
                continue;
            }
            if (command === 'chunks') {
                const chunks = await getIndexedChunks(value || undefined);
                if (!chunks.length) {
                    console.log(warning('No chunks found.'));
                    continue;
                }
                printSection(`Stored Chunks (${chunks.length})`);
                chunks.forEach((chunk, index) => {
                    const chunkLabel = chunk.chunkIndex == null ? 'unknown' : chunk.chunkIndex;
                    console.log(`  ${pc.cyan(String(index + 1))}. ${pc.bold(chunk.fileName)} ${muted(`chunk=${chunkLabel}, length=${chunk.length}`)}`);
                    console.log(`     ${muted(chunk.sourcePath)}`);
                    console.log(`     ${chunk.preview || muted('[empty chunk]')}`);
                });
                continue;
            }
            if (command === 'chunk') {
                if (!value) {
                    console.log(warning('Provide a file filter and chunk index, for example: chunk aurelion 0'));
                    continue;
                }
                const lastSpaceIndex = value.lastIndexOf(' ');
                if (lastSpaceIndex === -1) {
                    console.log(warning('Provide a file filter and chunk index, for example: chunk aurelion 0'));
                    continue;
                }
                const filter = value.slice(0, lastSpaceIndex).trim();
                const chunkIndexRaw = value.slice(lastSpaceIndex + 1).trim();
                const chunkIndex = Number(chunkIndexRaw);
                if (!filter || !Number.isInteger(chunkIndex) || chunkIndex < 0) {
                    console.log(warning('Chunk index must be a non-negative integer.'));
                    continue;
                }
                const chunk = await getIndexedChunk(filter, chunkIndex);
                if (!chunk) {
                    console.log(warning('Chunk not found.'));
                    continue;
                }
                printSection('Chunk');
                printKeyValue('File:', chunk.fileName);
                printKeyValue('Chunk:', String(chunk.chunkIndex));
                printKeyValue('Length:', String(chunk.length));
                printKeyValue('Path:', chunk.sourcePath);
                printBox('Content', chunk.content, 'blue');
                continue;
            }
            if (command === 'reset') {
                const deleted = await clearKnowledgeBase();
                console.log(success(`Deleted ${deleted} records.`));
                continue;
            }
            console.log(warning('Unknown command.'));
            printHelp();
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error(errorText(message));
        }
    }
    rl.close();
}
main().catch((error) => {
    const message = error instanceof Error ? error.message : 'Unknown startup error';
    console.error(errorText(`Startup failed: ${message}`));
    process.exitCode = 1;
});
//# sourceMappingURL=index.js.map