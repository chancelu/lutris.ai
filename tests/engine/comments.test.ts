import { describe, test, expect, beforeEach } from 'bun:test'

// ── Comments System Tests ──

describe('Comments - CRUD', () => {
  interface Comment {
    id: string
    nodeId: string | null
    x: number
    y: number
    author: string
    text: string
    resolved: boolean
    replies: Array<{ id: string; author: string; text: string }>
  }

  let comments: Comment[]
  let idCounter: number

  beforeEach(() => {
    comments = []
    idCounter = 0
  })

  function addComment(x: number, y: number, text: string, nodeId?: string | null): Comment {
    const c: Comment = {
      id: `c_${++idCounter}`,
      nodeId: nodeId ?? null,
      x, y,
      author: 'TestUser',
      text,
      resolved: false,
      replies: [],
    }
    comments.push(c)
    return c
  }

  function addReply(commentId: string, text: string) {
    const c = comments.find(c => c.id === commentId)
    if (!c) return null
    const reply = { id: `r_${++idCounter}`, author: 'TestUser', text }
    c.replies.push(reply)
    return reply
  }

  test('add comment with position', () => {
    const c = addComment(100, 200, 'Fix this alignment')
    expect(c.x).toBe(100)
    expect(c.y).toBe(200)
    expect(c.text).toBe('Fix this alignment')
    expect(c.resolved).toBe(false)
    expect(comments).toHaveLength(1)
  })

  test('add comment pinned to node', () => {
    const c = addComment(50, 50, 'Color is wrong', 'node_123')
    expect(c.nodeId).toBe('node_123')
  })

  test('add reply to comment', () => {
    const c = addComment(0, 0, 'Main comment')
    const r = addReply(c.id, 'I agree')
    expect(r).not.toBeNull()
    expect(c.replies).toHaveLength(1)
    expect(c.replies[0].text).toBe('I agree')
  })

  test('resolve and unresolve comment', () => {
    const c = addComment(0, 0, 'Issue')
    c.resolved = true
    expect(c.resolved).toBe(true)
    c.resolved = false
    expect(c.resolved).toBe(false)
  })

  test('delete comment', () => {
    addComment(0, 0, 'A')
    addComment(0, 0, 'B')
    addComment(0, 0, 'C')
    comments = comments.filter(c => c.text !== 'B')
    expect(comments).toHaveLength(2)
    expect(comments.map(c => c.text)).toEqual(['A', 'C'])
  })

  test('delete reply', () => {
    const c = addComment(0, 0, 'Main')
    addReply(c.id, 'Reply 1')
    addReply(c.id, 'Reply 2')
    c.replies = c.replies.filter(r => r.text !== 'Reply 1')
    expect(c.replies).toHaveLength(1)
    expect(c.replies[0].text).toBe('Reply 2')
  })

  test('filter unresolved comments', () => {
    const _a = addComment(0, 0, 'Open')
    const b = addComment(0, 0, 'Closed')
    b.resolved = true
    const unresolved = comments.filter(c => !c.resolved)
    expect(unresolved).toHaveLength(1)
    expect(unresolved[0].text).toBe('Open')
  })
})
