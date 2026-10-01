<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api, getErrorMessage, type AppInfo } from './api'
import AskPanel from './components/AskPanel.vue'
import KnowledgeBase from './components/KnowledgeBase.vue'

const info = ref<AppInfo | null>(null)
const infoError = ref('')
const activeTab = ref('ask')

async function loadInfo(): Promise<void> {
  try {
    info.value = await api.getInfo()
    infoError.value = ''
  } catch (error) {
    infoError.value = getErrorMessage(error)
  }
}

onMounted(loadInfo)
</script>

<template>
  <div class="layout">
    <header class="header">
      <h1>Console RAG Demo</h1>
      <div v-if="info" class="info">
        <el-tag type="info">Collection: {{ info.collection.name }}</el-tag>
        <el-tag type="info">Records: {{ info.collection.recordCount }}</el-tag>
        <el-tag>Embeddings: {{ info.embeddingProvider }} / {{ info.embeddingModel }}</el-tag>
        <el-tag>Chat: {{ info.chatProvider }} / {{ info.chatModel }}</el-tag>
      </div>
    </header>

    <el-alert v-if="infoError" :title="infoError" type="error" show-icon :closable="false" class="info-error" />

    <el-tabs v-model="activeTab">
      <el-tab-pane label="Ask" name="ask">
        <AskPanel />
      </el-tab-pane>
      <el-tab-pane label="Knowledge Base" name="knowledge-base" lazy>
        <KnowledgeBase @changed="loadInfo" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style>
body {
  margin: 0;
  font-family: var(--el-font-family);
  background: var(--el-bg-color-page);
  color: var(--el-text-color-primary);
}
</style>

<style scoped>
.layout {
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px 16px;
}

.header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.header h1 {
  margin: 0;
  font-size: 22px;
}

.info {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.info-error {
  margin-bottom: 16px;
}
</style>
