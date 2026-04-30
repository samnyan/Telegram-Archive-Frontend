<script setup lang="ts">
import { useAdminStore } from '../../stores/admin'

const admin = useAdminStore()
</script>

<template>
  <!-- Action filter -->
  <div class="flex gap-2 mb-3">
    <select v-model="admin.auditAction" @change="admin.loadAuditLogs()" class="bg-gray-700 text-white rounded px-3 py-1.5 text-sm">
      <option value="">All actions</option>
      <option value="login_success">Login success</option>
      <option value="login_failed">Login failed</option>
      <option value="logout">Logout</option>
      <option value="token_auth_success">Token auth success</option>
      <option value="token_auth_failed">Token auth failed</option>
      <option value="viewer_created">Viewer created</option>
      <option value="viewer_updated">Viewer updated</option>
      <option value="viewer_deleted">Viewer deleted</option>
      <option value="token_created">Token created</option>
      <option value="token_updated">Token updated</option>
      <option value="token_deleted">Token deleted</option>
      <option value="setting_updated">Setting updated</option>
    </select>
  </div>

  <div class="space-y-1">
    <div v-for="log in admin.auditLogs" :key="log.id" class="flex items-center gap-3 text-xs bg-gray-900 rounded px-3 py-2">
      <span class="text-gray-500 w-36 shrink-0">{{ new Date(log.created_at).toLocaleString() }}</span>
      <span :class="{
        'text-yellow-400': log.role === 'master',
        'text-blue-400': log.role === 'viewer',
        'text-purple-400': log.role === 'token',
      }" class="w-16 shrink-0">{{ log.role }}</span>
      <span class="text-gray-300 w-24 shrink-0 truncate">{{ log.username }}</span>
      <span class="text-gray-400 flex-1 truncate">{{ log.action }}</span>
      <span class="text-gray-600 truncate w-28">{{ log.ip_address }}</span>
    </div>
    <div v-if="admin.auditLogs.length === 0" class="text-gray-500 text-sm text-center py-4">No audit logs yet</div>
  </div>
</template>
