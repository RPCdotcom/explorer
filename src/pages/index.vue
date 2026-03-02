<script lang="ts" setup>
import { Icon } from '@iconify/vue';
import { useDashboard, LoadingStatus, type ChainConfig } from '@/stores/useDashboard';
import ChainSummary from '@/components/ChainSummary.vue';
import AdBanner from '@/components/ad/AdBanner.vue';
import { computed, ref } from 'vue';
import { useBlockchain } from '@/stores';

const dashboard = useDashboard();
const keywords = ref('');

const chains = computed(() => {
  if (keywords.value) {
    const kw = keywords.value.toLowerCase();
    return Object.values(dashboard.chains).filter(
      (x: ChainConfig) =>
        x.chainName.toLowerCase().includes(kw) ||
        x.prettyName.toLowerCase().includes(kw)
    );
  }
  return Object.values(dashboard.chains);
});

const featured = computed(() => {
  const names = ['cosmos', 'osmosis', 'akash', 'celestia', 'evmos', 'injective', 'dydx', 'noble'];
  return chains.value
    .filter(x => names.includes(x.chainName))
    .sort((a, b) => names.indexOf(a.chainName) - names.indexOf(b.chainName));
});

const chainStore = useBlockchain();
</script>

<template>
  <div>
    <!-- ════════════════════════════
         HERO — ASCII Box
    ════════════════════════════ -->
    <div class="mb-8 relative" style="font-family:'JetBrains Mono',monospace;">

      <!-- Outer ASCII frame -->
      <div class="relative px-6 pt-6 pb-5"
        style="border:1px solid var(--border);background:var(--bg-panel);box-shadow:4px 4px 0 var(--border);">

        <!-- Corner labels -->
        <span class="absolute top-0 left-0 font-mono text-[10px] px-1 -translate-y-px"
          style="background:var(--bg-panel);color:var(--accent);">
          ┌─[ RPCDOT.COM ]─
        </span>
        <span class="absolute top-0 right-0 font-mono text-[10px] px-1 -translate-y-px"
          style="background:var(--bg-panel);color:var(--text-muted);">
          ─[ COSMOS EXPLORER ]─┐
        </span>
        <span class="absolute bottom-0 left-0 font-mono text-[10px] px-1 translate-y-px"
          style="background:var(--bg-panel);color:var(--text-muted);">
          └───────────────────
        </span>

        <div class="flex flex-col md:flex-row md:items-center gap-6 mt-2">
          <!-- Logo — siyah/beyaz -->
          <div class="shrink-0 flex flex-col items-center gap-2">
            <div class="w-14 h-14 flex items-center justify-center"
              style="border:1px solid var(--border);background:var(--bg-panel-alt);">
              <img class="w-10 h-10 block dark:hidden"
                src="../assets/logo.svg"
                alt="RC" />
              <img class="w-10 h-10 hidden dark:block invert"
                src="../assets/logo.svg"
                alt="RC" />
            </div>
            <span class="font-mono text-[8px] tracking-widest"
              style="color:var(--accent);">■ ONLINE</span>
          </div>

          <!-- Text -->
          <div class="flex-1">
            <h1 class="text-2xl md:text-3xl font-black tracking-tight leading-none mb-1"
              style="color:var(--text-main);font-family:'Space Grotesk',sans-serif;">
              {{ $t('pages.title') }}
            </h1>
            <p class="font-mono text-xs mb-3" style="color:var(--text-secondary);">
              <span style="color:var(--accent);">&gt;</span>
              {{ $t('pages.slogan') }}
            </p>

            <!-- Stats row -->
            <div class="flex flex-wrap gap-4 font-mono text-[10px]" style="color:var(--text-muted);">
              <span>
                CHAINS:
                <span style="color:var(--accent);" class="font-bold">{{ dashboard.length }}</span>
              </span>
              <span style="color:var(--border-muted);">│</span>
              <span>
                LOADED:
                <span style="color:var(--accent);" class="font-bold">{{ chains.length }}</span>
              </span>
              <span style="color:var(--border-muted);">│</span>
              <span :style="dashboard.status === LoadingStatus.Loaded
                ? 'color:var(--accent);'
                : 'color:var(--amber);'">
                STATUS: {{ dashboard.status === LoadingStatus.Loaded ? 'READY' : 'LOADING...' }}
              </span>
            </div>

            <!-- Loading bar -->
            <div v-if="dashboard.status !== LoadingStatus.Loaded" class="mt-3 font-mono text-[10px]" style="color:var(--text-muted);">
              <span style="color:var(--accent);">[</span>
              <span class="inline-block w-40 overflow-hidden relative align-middle">
                <span class="animate-pulse" style="color:var(--accent);">████████░░░░░░░░░░░░</span>
              </span>
              <span style="color:var(--accent);">]</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════════════════════════
         FEATURED NETWORKS
    ════════════════════════════ -->
    <template v-if="featured.length > 0">
      <div class="flex items-center gap-3 mb-3">
        <span class="font-mono text-[9px] uppercase tracking-widest"
          style="color:var(--accent);">▸ FEATURED</span>
        <span class="font-mono text-[9px]" style="color:var(--border-muted);">
          ────────────────────────────────
        </span>
        <span class="font-mono text-[9px]" style="color:var(--text-muted);">
          RPCDOT INFRA
        </span>
      </div>
      <div class="grid grid-cols-1 gap-2 mb-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
        <ChainSummary v-for="(chain, idx) in featured" :key="idx" :name="chain.chainName" />
      </div>
    </template>

    <AdBanner id="home-banner-ad" unit="banner" width="970px" height="90px" />

    <!-- ════════════════════════════
         ALL NETWORKS
    ════════════════════════════ -->
    <div class="flex items-center gap-3 mt-6 mb-3">
      <span class="font-mono text-[9px] uppercase tracking-widest"
        style="color:var(--text-muted);">▸ ALL NETWORKS</span>
      <span class="font-mono text-[9px]" style="color:var(--border-muted);">
        ────────────────────────────────
      </span>
      <span class="ml-auto font-mono text-[9px]" style="color:var(--text-muted);">
        {{ chains.length }}/{{ dashboard.length }}
      </span>
    </div>

    <!-- Search -->
    <div class="flex items-center gap-2 mb-4"
      style="border:1px solid var(--border);background:var(--bg-panel);">
      <span class="font-mono text-xs px-3" style="color:var(--accent);border-right:1px solid var(--border);">
        SEARCH
      </span>
      <input
        v-model="keywords"
        :placeholder="$t('pages.search_placeholder')"
        class="flex-1 bg-transparent outline-none px-3 py-2 font-mono text-xs"
        style="color:var(--text-main);"
      />
      <span class="font-mono text-[10px] px-3" style="color:var(--text-muted);">
        {{ keywords ? chains.length + ' results' : 'all' }}
      </span>
    </div>

    <!-- Grid -->
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
      <ChainSummary v-for="(chain, idx) in chains" :key="idx" :name="chain.chainName" />
    </div>
  </div>
</template>
