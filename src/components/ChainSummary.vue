<script lang="ts" setup>
import { useDashboard } from '@/stores/useDashboard';
import { computed } from 'vue';
import { Icon } from '@iconify/vue';

const props = defineProps({ name: { type: String, required: true } });

const dashboardStore = useDashboard();
const conf = computed(() => dashboardStore.chains[props.name] || {});

const addFavor = (e: Event) => {
  e.stopPropagation();
  e.preventDefault();
  dashboardStore.favoriteMap[props.name] = !dashboardStore?.favoriteMap?.[props.name];
  window.localStorage.setItem('favoriteMap', JSON.stringify(dashboardStore.favoriteMap));
};
</script>

<template>
  <RouterLink
    :to="`/${name}`"
    class="group flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all duration-150"
    style="
      background: var(--bg-panel);
      border: 1px solid var(--border-muted);
    "
    :style="{}"
  >
    <!-- Accent left bar on hover/active — via sibling trick -->
    <div class="shrink-0 w-7 h-7 flex items-center justify-center overflow-hidden"
      style="border:1px solid var(--border-muted);background:var(--bg-panel-alt);">
      <img :src="conf.logo" class="w-5 h-5 object-contain" />
    </div>

    <div class="flex-1 min-w-0">
      <div class="font-mono text-xs font-semibold capitalize truncate transition-colors"
        style="color:var(--text-main);">
        {{ conf?.prettyName || props.name }}
      </div>
    </div>

    <!-- Star -->
    <button @click="addFavor" class="shrink-0 font-mono text-xs transition-colors"
      :style="dashboardStore?.favoriteMap?.[props.name]
        ? 'color:#f59e0b;'
        : 'color:var(--border-muted);'">
      ★
    </button>
  </RouterLink>
</template>

<style scoped>
a:hover {
  border-color: var(--accent) !important;
  box-shadow: 2px 2px 0 var(--accent);
  transform: translate(-1px, -1px);
}
a:hover .font-mono {
  color: var(--accent) !important;
}
</style>
