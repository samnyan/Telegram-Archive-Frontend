<script setup lang="ts">
import { ref, nextTick } from 'vue'

const emit = defineEmits<{
  close: []
  jump: [date: string]
}>()

const selectedDate = ref('')
const dateInputRef = ref<HTMLInputElement | null>(null)

function open(dateStr: string) {
  selectedDate.value = dateStr
  nextTick(() => dateInputRef.value?.focus())
}

function doJump() {
  if (selectedDate.value) {
    emit('jump', selectedDate.value)
    emit('close')
  }
}

defineExpose({ open })
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      @click.self="emit('close')"
    >
      <div class="bg-tg-sidebar rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-700">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-white">Jump to Date</h3>
          <button @click="emit('close')" class="text-gray-400 hover:text-white transition p-1">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="mb-4">
          <input
            ref="dateInputRef"
            v-model="selectedDate"
            type="date"
            :max="new Date().toISOString().split('T')[0]"
            class="w-full bg-gray-900 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="flex gap-2 justify-end">
          <button @click="emit('close')" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition">
            Cancel
          </button>
          <button @click="doJump" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
            Jump
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
