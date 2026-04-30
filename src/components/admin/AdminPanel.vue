<script setup lang="ts">
import { useAdminStore } from '../../stores/admin'
import ViewerManager from './ViewerManager.vue'
import TokenManager from './TokenManager.vue'
import AuditLog from './AuditLog.vue'

const admin = useAdminStore()
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" @click.self="admin.showPanel = false">
      <div class="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 class="text-lg font-semibold text-white">Admin Settings</h2>
          <button @click="admin.showPanel = false" class="text-gray-400 hover:text-white">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>

        <!-- Tabs -->
        <div class="flex border-b border-gray-700 px-6">
          <button
            @click="admin.activeTab = 'viewers'"
            :class="admin.activeTab === 'viewers' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200'"
            class="px-4 py-2 border-b-2 text-sm font-medium"
          >Viewer Accounts</button>
          <button
            @click="admin.activeTab = 'tokens'; admin.loadTokens()"
            :class="admin.activeTab === 'tokens' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200'"
            class="px-4 py-2 border-b-2 text-sm font-medium"
          >Share Tokens</button>
          <button
            @click="admin.activeTab = 'audit'; admin.loadAuditLogs()"
            :class="admin.activeTab === 'audit' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200'"
            class="px-4 py-2 border-b-2 text-sm font-medium"
          >Audit Log</button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-6">
          <ViewerManager v-if="admin.activeTab === 'viewers'" />
          <TokenManager v-if="admin.activeTab === 'tokens'" />
          <AuditLog v-if="admin.activeTab === 'audit'" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
