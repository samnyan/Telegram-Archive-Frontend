<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ count: number }>()

const gridClass = computed(() => {
  if (props.count <= 1) return 'grid-cols-1'
  if (props.count === 2) return 'grid-cols-2'
  if (props.count <= 4) return 'grid-cols-2'
  return 'grid-cols-3'
})
</script>

<template>
  <div class="album-grid">
    <div class="grid gap-1" :class="gridClass">
      <slot />
    </div>
  </div>
</template>
