<script setup lang="ts">
import { ref, watch } from 'vue'
import type { IndexedChunk } from '../../../src/models/types/rag'
import { api, getErrorMessage, type ChunkTarget } from '../api'

const props = defineProps<{ target: ChunkTarget | null }>()
const emit = defineEmits<{ close: [] }>()

const chunk = ref<IndexedChunk | null>(null)
const error = ref('')
const loading = ref(false)

watch(
  () => props.target,
  async (target) => {
    chunk.value = null
    error.value = ''

    if (!target) {
      return
    }

    loading.value = true

    try {
      const result = await api.getChunk(target.filter, target.chunkIndex)

      if (props.target === target) {
        chunk.value = result
      }
    } catch (requestError) {
      error.value = getErrorMessage(requestError)
    } finally {
      loading.value = false
    }
  },
)
</script>

<template>
  <el-drawer :model-value="!!target" title="Chunk" size="50%" @close="emit('close')">
    <div v-loading="loading">
      <el-alert v-if="error" :title="error" type="error" :closable="false" />
      <template v-if="chunk">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="File">{{ chunk.fileName }}</el-descriptions-item>
          <el-descriptions-item label="Chunk">{{ chunk.chunkIndex }}</el-descriptions-item>
          <el-descriptions-item label="Length">{{ chunk.length }}</el-descriptions-item>
          <el-descriptions-item label="Path">{{ chunk.sourcePath }}</el-descriptions-item>
        </el-descriptions>
        <pre class="chunk-content">{{ chunk.content }}</pre>
      </template>
    </div>
  </el-drawer>
</template>

<style scoped>
.chunk-content {
  margin-top: 16px;
  padding: 16px;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  line-height: 1.6;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}
</style>
