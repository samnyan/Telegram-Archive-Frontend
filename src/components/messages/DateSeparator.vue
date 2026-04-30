<script setup lang="ts">
import { formatDateFull } from '../../utils/format'

defineProps<{ date: string }>()
const emit = defineEmits<{ jumpToDate: [date: string] }>()
</script>

<template>
  <div class="date-separator">
    <span @click="emit('jumpToDate', date)">{{ formatDateFull(date) }}</span>
  </div>
</template>
