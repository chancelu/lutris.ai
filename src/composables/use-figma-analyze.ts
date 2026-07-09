import { ref, readonly } from 'vue'
import { useFigmaAuth } from './use-figma-auth'
import { useProductDoc } from './use-product-doc'
import { getFile } from '@/lib/figma-client'
import { analyzeFigmaFile, generateProductSpec, type AnalysisResult } from '@/lib/figma-analyzer'

export function useFigmaAnalyze() {
  const { getToken } = useFigmaAuth()
  const productDoc = useProductDoc()

  const analyzing = ref(false)
  const progress = ref('')
  const error = ref('')
  const analysisResult = ref<AnalysisResult | null>(null)
  const specMarkdown = ref('')

  async function analyzeFile(fileKey: string): Promise<void> {
    const token = await getToken()
    if (!token) {
      error.value = 'Figma 未连接，请先授权'
      return
    }

    analyzing.value = true
    error.value = ''
    analysisResult.value = null
    specMarkdown.value = ''

    try {
      progress.value = '正在获取 Figma 文件...'
      const fileData = await getFile(token, fileKey)

      progress.value = '正在分析设计稿...'
      const result = analyzeFigmaFile(fileData, fileKey)
      analysisResult.value = result

      progress.value = '正在生成产品规格...'
      specMarkdown.value = generateProductSpec(result)

      progress.value = ''
    } catch (e) {
      error.value = e instanceof Error ? e.message : '分析失败'
      progress.value = ''
    } finally {
      analyzing.value = false
    }
  }

  function confirmAndSync(): { success: boolean; requiresConfirm: boolean } {
    if (!specMarkdown.value) return { success: false, requiresConfirm: false }

    // updateFromDesign handles empty-vs-existing logic internally:
    // empty doc → direct write; existing content → sets pendingSyncConfirm
    productDoc.updateFromDesign(specMarkdown.value)

    if (productDoc.pendingSyncConfirm.value) {
      // Existing content — user must confirm via productDoc.acceptPendingSync()
      return { success: true, requiresConfirm: true }
    }

    reset()
    return { success: true, requiresConfirm: false }
  }

  /** Called after user confirms overwrite via productDoc conflict UI */
  function afterSyncConfirmed() {
    reset()
  }

  function reset() {
    analysisResult.value = null
    specMarkdown.value = ''
    progress.value = ''
    error.value = ''
  }

  return {
    analyzing: readonly(analyzing),
    progress: readonly(progress),
    error: readonly(error),
    analysisResult: readonly(analysisResult),
    specMarkdown: readonly(specMarkdown),
    analyzeFile,
    confirmAndSync,
    afterSyncConfirmed,
    reset,
  }
}
