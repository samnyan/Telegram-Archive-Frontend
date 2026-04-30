<script setup lang="ts">
import { computed } from 'vue'
import type { PollAnswer } from '../../types'

const props = defineProps<{
  poll: {
    question: string
    answers: PollAnswer[]
    quiz: boolean
    results?: { total_voters: number; results: { option: string; voters: number }[] | null }
  }
}>()

function getPercent(answer: PollAnswer): number {
  const results = props.poll.results
  if (!results || !results.total_voters) return 0
  const r = results.results?.find(r => r.option === answer.option)
  if (!r) return 0
  return Math.round((r.voters / results.total_voters) * 100)
}
</script>

<template>
  <div class="mb-2 w-full max-w-sm bg-black/20 rounded-lg p-3">
    <div class="font-bold text-sm mb-3">{{ poll.question }}</div>
    <div class="space-y-2">
      <div v-for="answer in poll.answers" :key="answer.option" class="relative group">
        <div class="relative w-full border border-white/10 rounded-md overflow-hidden bg-white/5">
          <div
            v-if="getPercent(answer) > 0"
            class="absolute left-0 top-0 bottom-0 bg-blue-500/30 transition-all duration-500"
            :style="{ width: getPercent(answer) + '%' }"
          />
          <div class="relative z-10 flex justify-between items-center px-3 py-2">
            <span class="text-sm truncate mr-2">{{ answer.text }}</span>
            <span v-if="poll.results" class="text-xs font-bold shrink-0">{{ getPercent(answer) }}%</span>
          </div>
        </div>
      </div>
    </div>
    <div class="mt-3 flex justify-between items-center text-[10px] opacity-60 uppercase tracking-wider font-semibold">
      <span>{{ poll.quiz ? 'Quiz' : 'Poll' }}</span>
      <span v-if="poll.results">{{ poll.results.total_voters }} votes</span>
    </div>
  </div>
</template>
