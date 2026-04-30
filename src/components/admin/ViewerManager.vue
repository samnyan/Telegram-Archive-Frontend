<script setup lang="ts">
import { useAdminStore } from '../../stores/admin'

const admin = useAdminStore()
</script>

<template>
  <!-- Create/Edit Form -->
  <div class="bg-gray-900 rounded-lg p-4 mb-4">
    <h3 class="text-sm font-medium text-gray-300 mb-3">{{ admin.editingId ? 'Edit Viewer' : 'Create Viewer' }}</h3>
    <div v-if="admin.viewerError" class="text-red-400 text-sm mb-3">{{ admin.viewerError }}</div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <input v-model="admin.viewerForm.username" :disabled="!!admin.editingId" placeholder="Username" class="bg-gray-700 text-white rounded px-3 py-2 text-sm" />
      <input v-model="admin.viewerForm.password" type="password" :placeholder="admin.editingId ? 'New password (leave empty)' : 'Password'" class="bg-gray-700 text-white rounded px-3 py-2 text-sm" />
    </div>

    <div class="mt-3">
      <label class="text-xs text-gray-400 block mb-1">Allowed Chats (none = all)</label>
      <div class="flex flex-wrap gap-1 bg-gray-700 rounded p-2 max-h-32 overflow-y-auto">
        <label v-for="c in admin.adminChats" :key="c.id" class="flex items-center gap-1 text-xs text-gray-300 bg-gray-600 rounded px-2 py-1 cursor-pointer hover:bg-gray-500">
          <input type="checkbox" :value="c.id" v-model="admin.viewerForm.allowed_chat_ids" class="rounded" />
          {{ c.title || c.id }}
        </label>
      </div>
    </div>

    <div class="mt-3 flex items-center gap-4">
      <label class="flex items-center gap-2 text-sm text-gray-300">
        <input type="checkbox" v-model="admin.viewerForm.is_active" class="rounded" /> Active
      </label>
      <label class="flex items-center gap-2 text-sm text-gray-300">
        <input type="checkbox" v-model="admin.viewerForm.no_download" class="rounded" /> No Downloads
      </label>
      <div class="flex-1" />
      <button v-if="admin.editingId" @click="admin.cancelEdit()" class="px-3 py-1.5 text-sm text-gray-400 hover:text-white">Cancel</button>
      <button @click="admin.saveViewer()" class="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded">
        {{ admin.editingId ? 'Update' : 'Create' }}
      </button>
    </div>
  </div>

  <!-- Viewers List -->
  <div class="space-y-2">
    <div v-for="viewer in admin.viewers" :key="viewer.id" class="flex items-center gap-3 bg-gray-900 rounded-lg p-3">
      <div class="flex-1">
        <div class="text-sm text-white font-medium">{{ viewer.username }}</div>
        <div class="text-xs text-gray-400">
          <template v-if="viewer.allowed_chat_ids?.length">
            {{ viewer.allowed_chat_ids.map(id => admin.adminChats.find(c => c.id === id)?.title || id).join(', ') }}
          </template>
          <template v-else>All chats</template>
          · {{ viewer.is_active ? 'Active' : 'Inactive' }}
          <template v-if="viewer.no_download"> · <span class="text-amber-400">No DL</span></template>
        </div>
      </div>
      <button @click="admin.editViewer(viewer)" class="text-gray-400 hover:text-blue-400 p-1"><i class="fas fa-edit"></i></button>
      <button @click="admin.deleteViewer(viewer)" class="text-gray-400 hover:text-red-400 p-1"><i class="fas fa-trash"></i></button>
    </div>
    <div v-if="admin.viewers.length === 0" class="text-gray-500 text-sm text-center py-4">No viewer accounts yet</div>
  </div>
</template>
