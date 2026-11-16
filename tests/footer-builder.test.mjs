import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createBlock,
  createRow,
  moveBlock,
  resizeColumns,
  duplicateBlock,
} from '../src/features/settings/builder/model.ts'

function fixture() {
  const row = createRow(2)
  row.columns[0].blocks = [createBlock('heading'), createBlock('text'), createBlock('button')]
  return { version: 1, enabled: true, rows: [row] }
}

test('moving to an empty column preserves all blocks and the original draft', () => {
  const draft = fixture()
  const before = structuredClone(draft)
  const [from, to] = draft.rows[0].columns
  const result = moveBlock(draft, from.blocks[1].id, to.id, 0)
  assert.deepEqual(draft, before)
  assert.deepEqual(
    result.rows[0].columns[0].blocks.map((b) => b.type),
    ['heading', 'button']
  )
  assert.deepEqual(
    result.rows[0].columns[1].blocks.map((b) => b.type),
    ['text']
  )
})

test('reorders within a column and handles invalid drops without losing content', () => {
  const draft = fixture()
  const column = draft.rows[0].columns[0]
  const result = moveBlock(draft, column.blocks[0].id, column.id, 2)
  assert.deepEqual(
    result.rows[0].columns[0].blocks.map((b) => b.type),
    ['text', 'button', 'heading']
  )
  assert.deepEqual(moveBlock(draft, column.blocks[0].id, 'missing', 0), draft)
})

test('reducing columns retains content in reading order', () => {
  const row = createRow(3)
  row.columns.forEach((column, index) => {
    column.blocks = [createBlock(['heading', 'text', 'button'][index])]
  })
  const result = resizeColumns(row, 1)
  assert.deepEqual(
    result.columns[0].blocks.map((b) => b.type),
    ['heading', 'text', 'button']
  )
  assert.equal(row.columns.length, 3)
})

test('duplicating creates a separate block with a unique identifier and bilingual links', () => {
  const draft = fixture()
  const block = draft.rows[0].columns[0].blocks[0]
  block.links = [{ label_vi: 'Trang chủ', label_en: 'Home', href: '/', open_in_new_tab: false }]
  const result = duplicateBlock(draft, block.id)
  const blocks = result.rows[0].columns[0].blocks
  assert.notEqual(blocks[0].id, blocks[1].id)
  blocks[1].links[0].label_en = 'Changed'
  assert.equal(block.links[0].label_en, 'Home')
})
