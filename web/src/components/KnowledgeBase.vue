<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox, type UploadRequestOptions } from 'element-plus'
import type { IndexedChunkRow, KnowledgeBaseSummary } from '../../../src/models/types/rag'
import { api, getErrorMessage, type ChunkTarget } from '../api'
import ChunkDrawer from './ChunkDrawer.vue'

const emit = defineEmits<{ changed: [] }>()

const summary = ref<KnowledgeBaseSummary | null>(null)
const chunks = ref<IndexedChunkRow[]>([])
const filter = ref('')
const loading = ref(false)
const chunkTarget = ref<ChunkTarget | null>(null)

async function load(): Promise<void> {
  loading.value = true

  try {
    const [documents, rows] = await Promise.all([api.getDocuments(), api.getChunks(filter.value)])
    summary.value = documents
    chunks.value = rows
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  } finally {
    loading.value = false
  }
}

async function upload(options: UploadRequestOptions): Promise<void> {
  try {
    const result = await api.uploadDocument(options.file)
    ElMessage.success(`Indexed ${result.fileName} with ${result.chunkCount} chunks.`)
  } catch (error) {
    ElMessage.error(`${options.file.name}: ${getErrorMessage(error)}`)
    throw error
  }

  await load()
  emit('changed')
}

async function confirmAndRun(message: string, action: () => Promise<string>): Promise<void> {
  try {
    await ElMessageBox.confirm(message, 'Confirm', { type: 'warning' })
  } catch {
    return
  }

  try {
    ElMessage.success(await action())
    await load()
    emit('changed')
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  }
}

function reset(): Promise<void> {
  return confirmAndRun('Delete all indexed records from the collection?', async () => {
    const { deleted } = await api.resetDocuments()
    return `Deleted ${deleted} records.`
  })
}

function drop(): Promise<void> {
  return confirmAndRun('Delete the current Chroma collection completely?', async () => {
    const { deleted } = await api.dropCollection()
    return deleted ? 'Deleted collection.' : 'Collection does not exist.'
  })
}

function openChunk(row: IndexedChunkRow): void {
  if (row.chunkIndex != null) {
    chunkTarget.value = { filter: row.sourcePath, chunkIndex: row.chunkIndex }
  }
}

onMounted(load)
</script>

<template>
  <div class="knowledge-base">
    <el-upload drag multiple accept=".pdf,.txt" :http-request="upload">
      <div class="upload-text">Drop PDF or TXT files here, or <em>click to upload</em></div>
    </el-upload>

    <div class="toolbar">
      <div v-if="summary" class="summary">
        <strong>Chunks:</strong> {{ summary.chunkCount }}
        <strong>Files:</strong>
        <template v-if="summary.files.length">
          <el-tag v-for="file in summary.files" :key="file" size="small">{{ file }}</el-tag>
        </template>
        <span v-else class="muted">none</span>
      </div>
      <div class="actions">
        <el-input v-model="filter" placeholder="Filter by file name or path" clearable @change="load" />
        <el-button @click="load">Refresh</el-button>
        <el-button type="warning" plain @click="reset">Reset</el-button>
        <el-button type="danger" plain @click="drop">Drop collection</el-button>
      </div>
    </div>

    <el-table v-loading="loading" :data="chunks" empty-text="No chunks found." row-class-name="clickable" @row-click="openChunk">
      <el-table-column prop="fileName" label="File" width="240" show-overflow-tooltip />
      <el-table-column prop="chunkIndex" label="Chunk" width="80" />
      <el-table-column prop="length" label="Length" width="90" />
      <el-table-column prop="preview" label="Preview" show-overflow-tooltip />
    </el-table>

    <ChunkDrawer :target="chunkTarget" @close="chunkTarget = null" />
  </div>
</template>

<style scoped>
.knowledge-base {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.upload-text {
  color: var(--el-text-color-regular);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.actions {
  display: flex;
  gap: 8px;
}

.actions .el-input {
  width: 260px;
}

.muted {
  color: var(--el-text-color-secondary);
}

:deep(.clickable) {
  cursor: pointer;
}
</style>
