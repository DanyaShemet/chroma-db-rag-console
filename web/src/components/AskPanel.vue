<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { DirectAnswerResult, RagAnswerResult, RagMatch } from '../../../src/models/types/rag'
import { api, getErrorMessage, type ChunkTarget } from '../api'
import ChunkDrawer from './ChunkDrawer.vue'

type Answered<T> = {
  question: string
  result: T
}

const question = ref('')
const ragAnswer = ref<Answered<RagAnswerResult> | null>(null)
const directAnswer = ref<Answered<DirectAnswerResult> | null>(null)
const ragLoading = ref(false)
const directLoading = ref(false)
const chunkTarget = ref<ChunkTarget | null>(null)

async function askRag(): Promise<void> {
  const value = question.value.trim()
  ragLoading.value = true

  try {
    ragAnswer.value = { question: value, result: await api.ask(value) }
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  } finally {
    ragLoading.value = false
  }
}

async function askDirect(): Promise<void> {
  const value = question.value.trim()
  directLoading.value = true

  try {
    directAnswer.value = { question: value, result: await api.askDirect(value) }
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  } finally {
    directLoading.value = false
  }
}

function openMatch(match: RagMatch): void {
  if (match.chunkIndex != null) {
    chunkTarget.value = { filter: match.sourcePath, chunkIndex: match.chunkIndex }
  }
}

function formatDistance(distance: number | null): string {
  return distance == null ? 'n/a' : distance.toFixed(6)
}
</script>

<template>
  <div class="ask-panel">
    <el-input v-model="question" type="textarea" :rows="3" placeholder="Ask a question about the indexed documents" />
    <div class="actions">
      <el-button type="primary" :loading="ragLoading" :disabled="!question.trim()" @click="askRag">Ask (RAG)</el-button>
      <el-button :loading="directLoading" :disabled="!question.trim()" @click="askDirect">Ask direct</el-button>
    </div>

    <el-row :gutter="16">
      <el-col :xs="24" :md="12">
        <el-card v-if="ragAnswer" v-loading="ragLoading" shadow="never" class="answer-card rag">
          <template #header>
            <div class="card-title">Answer</div>
            <div class="card-question">{{ ragAnswer.question }}</div>
          </template>
          <p class="answer">{{ ragAnswer.result.answer }}</p>

          <h4>RAG Diagnostics</h4>
          <el-descriptions :column="1" size="small" border>
            <el-descriptions-item label="Embedding provider">{{ ragAnswer.result.diagnostics.embeddingProvider }}</el-descriptions-item>
            <el-descriptions-item label="Embedding model">{{ ragAnswer.result.diagnostics.embeddingModel }}</el-descriptions-item>
            <el-descriptions-item label="Chat provider">{{ ragAnswer.result.diagnostics.chatProvider }}</el-descriptions-item>
            <el-descriptions-item label="Chat model">{{ ragAnswer.result.diagnostics.chatModel }}</el-descriptions-item>
            <el-descriptions-item label="Top-K">{{ ragAnswer.result.diagnostics.topK }}</el-descriptions-item>
          </el-descriptions>

          <el-table
            :data="ragAnswer.result.diagnostics.matches"
            empty-text="Matches: none"
            size="small"
            class="matches"
            row-class-name="clickable"
            @row-click="openMatch"
          >
            <el-table-column type="index" label="#" width="44" />
            <el-table-column prop="fileName" label="File" width="160" show-overflow-tooltip />
            <el-table-column prop="chunkIndex" label="Chunk" width="64" />
            <el-table-column label="Distance" width="96">
              <template #default="{ row }">{{ formatDistance(row.distance) }}</template>
            </el-table-column>
            <el-table-column prop="preview" label="Preview" show-overflow-tooltip />
          </el-table>
        </el-card>
      </el-col>

      <el-col :xs="24" :md="12">
        <el-card v-if="directAnswer" v-loading="directLoading" shadow="never" class="answer-card direct">
          <template #header>
            <div class="card-title">Direct Answer</div>
            <div class="card-question">{{ directAnswer.question }}</div>
          </template>
          <p class="answer">{{ directAnswer.result.answer }}</p>

          <h4>Model Info</h4>
          <el-descriptions :column="1" size="small" border>
            <el-descriptions-item label="Chat provider">{{ directAnswer.result.diagnostics.chatProvider }}</el-descriptions-item>
            <el-descriptions-item label="Chat model">{{ directAnswer.result.diagnostics.chatModel }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>

    <ChunkDrawer :target="chunkTarget" @close="chunkTarget = null" />
  </div>
</template>

<style scoped>
.ask-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.answer-card {
  margin-bottom: 16px;
}

.answer-card.rag {
  border-top: 3px solid var(--el-color-success);
}

.answer-card.direct {
  border-top: 3px solid var(--el-color-warning);
}

.card-title {
  font-weight: 600;
}

.card-question {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.answer {
  margin: 0 0 16px;
  white-space: pre-wrap;
  line-height: 1.6;
}

.matches {
  margin-top: 12px;
}

:deep(.clickable) {
  cursor: pointer;
}
</style>
