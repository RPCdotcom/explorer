<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { controlledComputed } from '@vueuse/core';

interface Props {
  title: string;
  color?: string;
  icon: string;
  stats: string;
  change?: number;
  subtitle?: string;
}

const props = withDefaults(defineProps<Props>(), { color: 'primary' });

const isPositive = controlledComputed(
  () => props.change,
  () => Math.sign(props.change || 0) === 1
);
</script>

<template>
  <div class="relative p-4 transition-all duration-150 group"
    style="
      background: var(--bg-panel);
      border: 1px solid var(--border-muted);
    ">

    <!-- ASCII corner top-left -->
    <span class="absolute top-0 left-0 font-mono text-[9px] leading-none px-0.5"
      style="color:var(--accent);line-height:1;">┌</span>

    <!-- Icon row -->
    <div class="flex items-start justify-between mb-3">
      <div class="w-8 h-8 flex items-center justify-center"
        style="border:1px solid var(--border-muted);background:var(--bg-panel-alt);">
        <Icon :icon="props.icon" class="text-base" style="color:var(--accent);" />
      </div>

      <div v-if="props.change"
        class="font-mono text-[9px] px-1.5 py-0.5 flex items-center gap-0.5"
        :style="isPositive
          ? 'color:var(--accent);border:1px solid var(--accent);'
          : 'color:var(--red);border:1px solid var(--red);'">
        <span>{{ isPositive ? '▲' : '▼' }}</span>
        <span>{{ isPositive ? `+${props.change}` : props.change }}%</span>
      </div>
    </div>

    <!-- Value -->
    <div class="font-mono font-bold text-base leading-tight truncate mb-0.5"
      style="color:var(--text-main);">
      {{ props.stats || '—' }}
    </div>

    <!-- Label -->
    <div class="font-mono text-[10px] uppercase tracking-wider truncate"
      style="color:var(--text-muted);">
      {{ props.title }}
    </div>

    <!-- Subtitle -->
    <div v-if="props.subtitle" class="font-mono text-[9px] truncate mt-1"
      style="color:var(--text-muted);">
      {{ props.subtitle }}
    </div>

    <!-- Hover accent bottom border -->
    <div class="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity"
      style="background:var(--accent);"></div>
  </div>
</template>
