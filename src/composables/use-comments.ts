import { ref, readonly, computed } from 'vue'

// ── Comment System ──
// Pin comments to canvas elements, support threaded replies

export interface Comment {
  id: string
  nodeId: string | null // null = canvas-level comment
  x: number // canvas coordinates
  y: number
  author: string
  text: string
  timestamp: number
  resolved: boolean
  replies: CommentReply[]
}

export interface CommentReply {
  id: string
  author: string
  text: string
  timestamp: number
}

const STORAGE_KEY = 'designflow-comments'

// ── State ──
const comments = ref<Comment[]>([])
const activeCommentId = ref<string | null>(null)
const isAddingComment = ref(false)
const currentUser = ref('You')

// Load stored username
try {
  const storedUser = localStorage.getItem('designflow-username')
  if (storedUser) currentUser.value = storedUser
} catch { /* ignore */ }

function setUsername(name: string) {
  currentUser.value = name.trim() || 'You'
  try { localStorage.setItem('designflow-username', currentUser.value) } catch { /* ignore */ }
}

// ── Persistence ──
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) comments.value = JSON.parse(raw)
  } catch { /* ignore */ }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(comments.value))
  } catch { /* ignore */ }
}

// ── Helpers ──
function genId(): string {
  return `c_${Date.now()}_${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`
}

// ── CRUD ──
function addComment(x: number, y: number, text: string, nodeId?: string | null): Comment {
  const comment: Comment = {
    id: genId(),
    nodeId: nodeId ?? null,
    x,
    y,
    author: currentUser.value,
    text,
    timestamp: Date.now(),
    resolved: false,
    replies: [],
  }
  comments.value.push(comment)
  activeCommentId.value = comment.id
  save()
  return comment
}

function addReply(commentId: string, text: string): CommentReply | null {
  const comment = comments.value.find((c) => c.id === commentId)
  if (!comment) return null
  const reply: CommentReply = {
    id: genId(),
    author: currentUser.value,
    text,
    timestamp: Date.now(),
  }
  comment.replies.push(reply)
  save()
  return reply
}

function resolveComment(commentId: string) {
  const comment = comments.value.find((c) => c.id === commentId)
  if (comment) {
    comment.resolved = !comment.resolved
    save()
  }
}

function deleteComment(commentId: string) {
  comments.value = comments.value.filter((c) => c.id !== commentId)
  if (activeCommentId.value === commentId) activeCommentId.value = null
  save()
}

function deleteReply(commentId: string, replyId: string) {
  const comment = comments.value.find((c) => c.id === commentId)
  if (comment) {
    comment.replies = comment.replies.filter((r) => r.id !== replyId)
    save()
  }
}

function setActiveComment(id: string | null) {
  activeCommentId.value = id
}

function startAddingComment() {
  isAddingComment.value = true
}

function cancelAddingComment() {
  isAddingComment.value = false
}

// ── Computed ──
const activeComment = computed(() =>
  comments.value.find((c) => c.id === activeCommentId.value) ?? null
)

const unresolvedCount = computed(() =>
  comments.value.filter((c) => !c.resolved).length
)

const commentsForNode = (nodeId: string) =>
  computed(() => comments.value.filter((c) => c.nodeId === nodeId))

// ── Init ──
load()

export function useComments() {
  return {
    comments: readonly(comments),
    activeCommentId,
    activeComment,
    isAddingComment,
    currentUser,
    unresolvedCount,

    addComment,
    addReply,
    resolveComment,
    deleteComment,
    deleteReply,
    setActiveComment,
    startAddingComment,
    cancelAddingComment,
    commentsForNode,
    setUsername,
  }
}
