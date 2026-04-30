<script setup lang="ts">
import { useAdminStore } from '../../stores/admin'

const admin = useAdminStore()

function copyText(text: string) {
  navigator.clipboard.writeText(text)
  admin.newToken = ''
}
</script>

<template>
  <!-- Create Token Form -->
  <div class="bg-gray-900 rounded-lg p-4 mb-4">
    <h3 class="text-sm font-medium text-gray-300 mb-3">Create Share Token</h3>
    <div v-if="admin.tokenError" class="text-red-400 text-sm mb-3">{{ admin.tokenError }}</div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <input v-model="admin.tokenForm.label" placeholder="Label (optional)" class="bg-gray-700 text-white rounded px-3 py-2 text-sm" />
      <input v-model="admin.tokenForm.expires_at" type="datetime-local" class="bg-gray-700 text-white rounded px-3 py-2 text-sm" />
    </div>

    <div class="mt-3">
      <label class="text-xs text-gray-400 block mb-1">Allowed Chats (required)</label>
      <div class="flex flex-wrap gap-1 bg-gray-700 rounded p-2 max-h-32 overflow-y-auto">
        <label v-for="c in admin.adminChats" :key="c.id" class="flex items-center gap-1 text-xs text-gray-300 bg-gray-600 rounded px-2 py-1 cursor-pointer hover:bg-gray-500">
          <input type="checkbox" :value="c.id" v-model="admin.tokenForm.allowed_chat_ids" class="rounded" />
          {{ c.title || c.id }}
        </label>
      </div>
    </div>

    <div class="mt-3 flex items-center gap-4">
      <label class="flex items-center gap-2 text-sm text-gray-300">
        <input type="checkbox" v-model="admin.tokenForm.no_download" class="rounded" /> No Downloads
      </label>
      <div class="flex-1" />
      <button @click="admin.createToken()" class="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded">Create Token</button>
    </div>
  </div>

  <!-- New token display -->
  <div v-if="admin.newToken" class="bg-green-900/50 border border-green-600 rounded-lg p-4 mb-4">
    <div class="text-sm text-green-300 mb-2">Token created! Copy it now — won't be shown again.</div>
    <div class="flex items-center gap-2 mb-2">
      <span class="text-xs text-gray-400 w-16 shrink-0">Token</span>
      <code class="flex-1 bg-gray-900 text-green-400 rounded px-3 py-2 text-xs font-mono break-all select-all">{{ admin.newToken }}</code>
      <button @click="copyText(admin.newToken)" class="px-3 py-2 bg-green-700 hover:bg-green-600 text-white text-xs rounded">Copy</button>
    </div>
    <div class="flex items-center gap-2">
      <span class="text-xs text-gray-400 w-16 shrink-0">Link</span>
      <code class="flex-1 bg-gray-900 text-blue-400 rounded px-3 py-2 text-xs font-mono break-all select-all">{{ admin.newTokenUrl }}</code>
      <button @click="copyText(admin.newTokenUrl)" class="px-3 py-2 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded">Copy Link</button>
    </div>
  </div>

  <!-- Token List -->
  <div class="space-y-2">
    <div v-for="token in admin.tokens" :key="token.id" class="bg-gray-900 rounded-lg p-3 flex items-center gap-3">
      <div class="flex-1">
        <div class="text-sm text-white font-medium">{{ token.label || `Token #${token.id}` }}</div>
        <div class="text-xs text-gray-400">
          <template v-if="token.allowed_chat_ids?.length">
            {{ token.allowed_chat_ids.map(id => admin.adminChats.find(c => c.id === id)?.title || id).join(', ') }}
          </template>
          · Used {{ token.use_count || 0 }}x
          <template v-if="token.last_used_at"> · Last: {{ new Date(token.last_used_at).toLocaleDateString() }}</template>
          <template v-if="token.expires_at"> · Exp: {{ new Date(token.expires_at).toLocaleDateString() }}</template>
          <template v-if="token.no_download"> · <span class="text-amber-400">No DL</span></template>
          <template v-if="token.is_revoked"> · <span class="text-red-400">Revoked</span></template>
        </div>
      </div>
      <button v-if="!token.is_revoked" @click="admin.revokeToken(token)" class="text-gray-400 hover:text-amber-400 p-1" title="Revoke"><i class="fas fa-ban"></i></button>
      <button @click="admin.deleteToken(token)" class="text-gray-400 hover:text-red-400 p-1" title="Delete"><i class="fas fa-trash"></i></button>
    </div>
    <div v-if="admin.tokens.length === 0" class="text-gray-500 text-sm text-center py-4">No share tokens yet</div>
  </div>
</template>
