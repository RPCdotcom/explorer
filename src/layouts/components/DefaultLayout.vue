<script lang="ts" setup>
import { Icon } from '@iconify/vue';
import { computed, ref } from 'vue';

import newFooter from '@/layouts/components/NavFooter.vue';
import NavbarThemeSwitcher from '@/layouts/components/NavbarThemeSwitcher.vue';
import NavbarSearch from '@/layouts/components/NavbarSearch.vue';
import ChainProfile from '@/layouts/components/ChainProfile.vue';
import Sponsors from '@/layouts/components/Sponsors.vue';
import NavBarI18n from './NavBarI18n.vue';
import NavBarWallet from './NavBarWallet.vue';

import { NetworkType, useDashboard } from '@/stores/useDashboard';
import { useBaseStore, useBlockchain } from '@/stores';
import type { NavGroup, NavLink, NavSectionTitle, VerticalNavItems } from '../types';
import dayjs from 'dayjs';

const dashboard = useDashboard();
dashboard.initial();
const blockchain = useBlockchain();
blockchain.randomSetupEndpoint();
const baseStore = useBaseStore();

const current = ref('');
const temp = ref('');
blockchain.$subscribe((m, s) => {
  if (current.value === s.chainName && temp.value !== s.endpoint.address) {
    temp.value = s.endpoint.address;
    blockchain.initial();
  }
  if (current.value !== s.chainName) {
    current.value = s.chainName;
    blockchain.randomSetupEndpoint();
  }
});

const sidebarShow = ref(false);
const sidebarOpen = ref(true);

const changeOpen = (index: Number) => {
  if (index === 0) sidebarOpen.value = !sidebarOpen.value;
};

const showDiscord = window.location.host.search('rpcdot') > -1;

function isNavGroup(nav: any): nav is NavGroup  { return nav.children !== undefined; }
function isNavLink (nav: any): nav is NavLink   { return nav.to !== undefined; }
function isNavTitle(nav: any): nav is NavSectionTitle { return nav.heading !== undefined; }

function selected(route: any, nav: NavLink) {
  return route.path === nav.to?.path ||
    (route.path.startsWith(nav.to?.path) && nav.title.indexOf('dashboard') === -1);
}

const blocktime = computed(() => dayjs(baseStore.latest?.block?.header?.time));
const behind = computed(() => blocktime.value.isBefore(dayjs().subtract(10, 'minute')));

// Uptime ticker for sidebar status bar
const now = ref(dayjs().format('HH:mm:ss'));
setInterval(() => { now.value = dayjs().format('HH:mm:ss'); }, 1000);
</script>

<template>
  <div class="min-h-screen" style="background:var(--bg-root);">

    <!-- ── Mobile overlay ── -->
    <Transition name="fade-overlay">
      <div v-if="sidebarShow"
        class="fixed inset-0 z-40 xl:hidden"
        style="background:rgba(0,0,0,0.7);"
        @click="sidebarShow = false"
      />
    </Transition>

    <!-- ══════════════════════════════════════════
         SIDEBAR
    ══════════════════════════════════════════ -->
    <aside
      class="fixed z-50 left-0 top-0 bottom-0 w-64 flex flex-col overflow-hidden
             transition-transform duration-200 ease-in-out"
      style="
        background: var(--bg-panel);
        border-right: 1px solid var(--border);
        box-shadow: 2px 0 0 var(--border-muted);
      "
      :class="sidebarShow ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'"
    >
      <!-- ── Brand header ── -->
      <div class="flex items-center justify-between px-4 py-4"
        style="border-bottom: 1px solid var(--border);">
        <RouterLink to="/" class="flex items-center gap-3 group" @click="sidebarShow = false">
          <!-- Logo: black on light, white on dark -->
          <div class="w-8 h-8 flex items-center justify-center shrink-0">
            <img
              class="w-8 h-8 block dark:hidden"
              src="../../assets/logo.svg"
              alt="RC"
            />
            <img
              class="w-8 h-8 hidden dark:block invert"
              src="../../assets/logo.svg"
              alt="RC"
            />
          </div>
          <div>
            <div class="font-mono font-bold text-sm tracking-widest uppercase"
              style="color:var(--text-main); letter-spacing:0.15em;">
              RPCdot
            </div>
            <div class="font-mono text-[9px] tracking-widest"
              style="color:var(--accent);">
              ▸ EXPLORER v2
            </div>
          </div>
        </RouterLink>
        <button class="xl:hidden font-mono text-xs px-1"
          style="color:var(--text-muted);"
          @click="sidebarShow = false">
          [×]
        </button>
      </div>

      <!-- ── ASCII status line ── -->
      <div class="px-4 py-1.5 font-mono text-[10px] flex items-center gap-2"
        style="background:var(--accent-bg); border-bottom:1px dashed var(--border-muted); color:var(--text-muted);">
        <span style="color:var(--accent);">●</span>
        <span>ONLINE</span>
        <span class="ml-auto">{{ now }}</span>
      </div>

      <!-- ── Nav ── -->
      <nav class="flex-1 overflow-y-auto py-2">
        <template v-for="(item, index) of blockchain.computedChainMenu" :key="index">

          <!-- Group -->
          <template v-if="isNavGroup(item)">
            <button
              class="w-full flex items-center gap-2 px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors"
              style="color:var(--text-muted);"
              @click="changeOpen(index)"
            >
              <!-- Section label with ASCII prefix -->
              <span style="color:var(--accent);" class="shrink-0">
                {{ index === 0 ? '├─' : '┬─' }}
              </span>
              <img v-if="item?.icon?.image" :src="item.icon.image"
                class="w-4 h-4 rounded-full shrink-0" />
              <Icon v-else-if="item?.icon?.icon" :icon="item.icon.icon"
                class="text-sm shrink-0" style="color:var(--accent);" />
              <span class="flex-1 text-left truncate tracking-widest">{{ item.title }}</span>
              <span v-if="item?.badgeContent"
                class="font-mono text-[9px] px-1 border"
                style="border-color:var(--accent);color:var(--accent);">
                {{ item.badgeContent }}
              </span>
              <span v-if="index > 0 && item?.children?.length"
                class="font-mono text-[10px]"
                style="color:var(--text-muted);">
                {{ sidebarOpen ? '▾' : '▸' }}
              </span>
            </button>

            <div :class="index === 0 ? (sidebarOpen ? 'block' : 'hidden') : undefined">
              <template v-for="(el, key) of item.children" :key="key">
                <RouterLink
                  v-if="isNavLink(el)"
                  :to="el.to"
                  @click="sidebarShow = false"
                  class="flex items-center gap-2 px-4 py-1.5 font-mono text-xs transition-all"
                  :class="selected($route, el) ? 'nav-active' : ''"
                  :style="!selected($route, el) ? 'color:var(--text-secondary);' : ''"
                >
                  <span class="font-mono shrink-0 text-[10px]"
                    :style="selected($route, el) ? '' : 'color:var(--border-muted);'">
                    {{ selected($route, el) ? '▶' : '│' }}
                  </span>
                  <img v-if="el?.icon?.image" :src="el.icon.image"
                    class="w-4 h-4 rounded-full shrink-0" />
                  <span class="truncate">{{ item.title === 'Favorite' ? el.title : $t(el.title) }}</span>
                </RouterLink>
              </template>

              <!-- Faucet -->
              <RouterLink
                v-if="index === 0 && dashboard.networkType === NetworkType.Testnet"
                :to="`/${blockchain.chainName}/faucet`"
                @click="sidebarShow = false"
                class="flex items-center gap-2 px-4 py-1.5 font-mono text-xs transition-all"
                style="color:var(--text-secondary);"
              >
                <span class="font-mono text-[10px]" style="color:var(--border-muted);">│</span>
                <span class="flex-1 truncate">Faucet</span>
                <span class="font-mono text-[9px] px-1 border"
                  style="border-color:var(--red);color:var(--red);">NEW</span>
              </RouterLink>
            </div>
          </template>

          <!-- Top-level link -->
          <RouterLink
            v-else-if="isNavLink(item)"
            :to="item.to"
            @click="sidebarShow = false"
            class="flex items-center gap-2 px-4 py-2 font-mono text-xs transition-all"
            :class="selected($route, item) ? 'nav-active' : ''"
            :style="!selected($route, item) ? 'color:var(--text-secondary);' : ''"
          >
            <Icon v-if="item?.icon?.icon" :icon="item.icon.icon"
              class="text-sm shrink-0"
              :style="item.title === 'Favorite' ? 'color:#f59e0b;' : 'color:var(--accent);'" />
            <img v-if="item?.icon?.image" :src="item.icon.image"
              class="w-4 h-4 rounded-full shrink-0" />
            <span class="flex-1 truncate">{{ item.title }}</span>
            <span v-if="item?.badgeContent"
              class="font-mono text-[9px] px-1 border"
              style="border-color:var(--accent);color:var(--accent);">
              {{ item.badgeContent }}
            </span>
          </RouterLink>

          <!-- Section title -->
          <div v-else-if="isNavTitle(item)"
            class="px-4 pt-3 pb-1 font-mono text-[9px] uppercase tracking-widest flex items-center gap-2"
            style="color:var(--text-muted);">
            <span style="color:var(--border-muted);">── </span>
            {{ item.heading }}
            <span class="flex-1 border-t" style="border-color:var(--border-muted);"></span>
          </div>
        </template>

        <!-- ── Tools section ── -->
        <div class="px-4 pt-3 pb-1 font-mono text-[9px] uppercase tracking-widest flex items-center gap-2"
          style="color:var(--text-muted);">
          <span style="color:var(--border-muted);">── </span>
          Tools
          <span class="flex-1 border-t" style="border-color:var(--border-muted);"></span>
        </div>
        <RouterLink to="/wallet/suggest" @click="sidebarShow = false"
          class="flex items-center gap-2 px-4 py-1.5 font-mono text-xs transition-all"
          style="color:var(--text-secondary);">
          <Icon icon="mdi:frequently-asked-questions" class="text-sm shrink-0" style="color:var(--accent);" />
          <span>Wallet Helper</span>
        </RouterLink>

        <!-- ── Sponsors ── -->
        <div class="px-4 pt-3 pb-1 font-mono text-[9px] uppercase tracking-widest flex items-center gap-2"
          style="color:var(--text-muted);">
          <span style="color:var(--border-muted);">── </span>
          {{ $t('module.sponsors') }}
          <span class="flex-1 border-t" style="border-color:var(--border-muted);"></span>
        </div>
        <div class="px-4 pb-1"><Sponsors /></div>

        <!-- ── Links ── -->
        <div class="px-4 pt-3 pb-1 font-mono text-[9px] uppercase tracking-widest flex items-center gap-2"
          style="color:var(--text-muted);">
          <span style="color:var(--border-muted);">── </span>
          {{ $t('module.links') }}
          <span class="flex-1 border-t" style="border-color:var(--border-muted);"></span>
        </div>
        <a href="https://twitter.com/rpcdot" target="_blank"
          class="flex items-center gap-2 px-4 py-1.5 font-mono text-xs transition-all"
          style="color:var(--text-secondary);">
          <Icon icon="mdi:twitter" class="text-sm shrink-0" style="color:var(--accent);" />
          <span>Twitter</span>
          <span class="ml-auto font-mono text-[9px]" style="color:var(--border-muted);">↗</span>
        </a>
        <a v-if="showDiscord" href="#Discord" target="_blank"
          class="flex items-center gap-2 px-4 py-1.5 font-mono text-xs transition-all"
          style="color:var(--text-secondary);">
          <Icon icon="mdi:discord" class="text-sm shrink-0" style="color:var(--accent);" />
          <span>Discord</span>
          <span class="ml-auto font-mono text-[9px]" style="color:var(--border-muted);">↗</span>
        </a>
        <a href="https://services.rpcdot.com" target="_blank"
          class="flex items-center gap-2 px-4 py-1.5 font-mono text-xs transition-all"
          style="color:var(--text-secondary);">
          <Icon icon="mdi:lifebuoy" class="text-sm shrink-0" style="color:var(--accent);" />
          <span>Services</span>
          <span class="ml-auto font-mono text-[9px]" style="color:var(--border-muted);">↗</span>
        </a>
      </nav>

      <!-- ── Sidebar footer: dil + tema ── -->
      <div class="px-3 py-2 flex items-center gap-1"
        style="border-top:1px dashed var(--border-muted);">
        <span class="font-mono text-[9px] mr-auto" style="color:var(--text-muted);">└─ RPCdot</span>
        <NavBarI18n />
        <NavbarThemeSwitcher />
      </div>
    </aside>

    <!-- ══════════════════════════════════════════
         MAIN
    ══════════════════════════════════════════ -->
    <div class="xl:ml-64 flex flex-col min-h-screen relative z-10">

      <!-- ── Top bar ── -->
      <header class="sticky top-0 z-30 flex items-center gap-3 px-4 py-2.5"
        style="
          background: var(--bg-panel);
          border-bottom: 1px solid var(--border);
          box-shadow: 0 1px 0 var(--border-muted);
        ">
        <!-- ASCII breadcrumb prefix -->
        <span class="hidden xl:block font-mono text-[10px]" style="color:var(--text-muted);">
          ▸
        </span>

        <!-- Hamburger -->
        <button class="xl:hidden font-mono text-xs px-2 py-1 border transition-colors"
          style="border-color:var(--border);color:var(--text-secondary);"
          @click="sidebarShow = true">
          [≡]
        </button>

        <ChainProfile />
        <div class="flex-1" />

        <NavBarI18n class="xl:hidden" />
        <NavbarThemeSwitcher class="xl:hidden" />
        <NavbarSearch />
        <NavBarWallet />
      </header>

      <!-- ── Content ── -->
      <main class="flex-1 px-4 md:px-6 pt-5 pb-2" style="min-height:calc(100vh - 160px);">

        <!-- Out of sync warning -->
        <div v-if="behind"
          class="mb-4 flex items-center gap-3 px-4 py-2 font-mono text-xs"
          style="background:rgba(229,57,53,0.08);border:1px solid var(--red);color:var(--red);">
          <span>[!]</span>
          <span>{{ $t('pages.out_of_sync') }} — {{ blocktime.format() }} ({{ blocktime.fromNow() }})</span>
        </div>

        <RouterView v-slot="{ Component }">
          <Transition name="slide-up" mode="out-in">
            <Component :is="Component" />
          </Transition>
        </RouterView>
      </main>

      <newFooter />
    </div>
  </div>
</template>

<style scoped>
.fade-overlay-enter-active, .fade-overlay-leave-active { transition: opacity 0.15s; }
.fade-overlay-enter-from, .fade-overlay-leave-to { opacity: 0; }
</style>
