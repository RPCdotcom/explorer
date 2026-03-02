<script lang="ts" setup>
import { useBlockchain } from '@/stores';
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Icon } from '@iconify/vue';

const blockchain = useBlockchain();
const { t } = useI18n();

interface RawPeer {
  node_id: string;
  url: string;
  remote_ip: string;
  is_outbound: boolean;
  node_info: {
    moniker: string;
    network: string;
    listen_addr: string;
    version: string;
  };
}

interface PeerGeo {
  node_id:     string;
  moniker:     string;
  ip:          string;
  port:        string;
  country:     string;
  countryCode: string;
  city:        string;
  org:         string;
  lat:         number;
  lon:         number;
  isOutbound:  boolean;
  version:     string;
  network:     string;
}

const peers    = ref<PeerGeo[]>([]);
const loading  = ref(false);
const error    = ref('');
const searchKw = ref('');
const mapEl    = ref<HTMLDivElement | null>(null);
let   leafletMap: any = null;

// ── RPC endpoint — kendi json formatımız: { rpc: ["https://..."] }
const rpcEndpoint = computed(() => {
  const current = blockchain.current as any;
  if (!current) return '';
  if (Array.isArray(current.rpc) && current.rpc.length > 0) return current.rpc[0];
  const list = current.endpoints?.rpc;
  if (list?.length > 0) return list[0].address || list[0];
  return '';
});

const filtered = computed(() => {
  if (!searchKw.value) return peers.value;
  const kw = searchKw.value.toLowerCase();
  return peers.value.filter(p =>
    p.moniker.toLowerCase().includes(kw) ||
    p.ip.includes(kw) ||
    p.country.toLowerCase().includes(kw) ||
    p.org.toLowerCase().includes(kw) ||
    p.node_id.toLowerCase().includes(kw)
  );
});

const stats = computed(() => ({
  total:     peers.value.length,
  countries: new Set(peers.value.map(p => p.countryCode)).size,
  providers: new Set(peers.value.map(p => p.org)).size,
  outbound:  peers.value.filter(p => p.isOutbound).length,
}));

async function fetchPeers() {
  if (!rpcEndpoint.value) { error.value = t('peers.no_rpc'); return; }

  loading.value = true;
  error.value   = '';
  peers.value   = [];

  try {
    // net_info fetch
    const res = await fetch(`${rpcEndpoint.value.replace(/\/$/, '')}/net_info`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const rawPeers: RawPeer[] = data?.result?.peers || [];
    if (!rawPeers.length) {
      error.value = t('peers.no_peers');
      loading.value = false;
      return;
    }

    // GeoIP — ipapi.co HTTPS, ücretsiz, no-cors problemi yok
    const ips = [...new Set(rawPeers.map(p => p.remote_ip))];
    const geoMap: Record<string, any> = {};

    await Promise.allSettled(
      ips.map(async ip => {
        try {
          const r = await fetch(`https://ipapi.co/${ip}/json/`);
          if (r.ok) {
            const g = await r.json();
            if (!g.error) geoMap[ip] = g;
          }
        } catch {}
      })
    );

    peers.value = rawPeers.map(p => {
      const geo  = geoMap[p.remote_ip] || {};
      const addr = p.node_info?.listen_addr || '';
      const port = (addr.match(/:(\d+)$/) || [])[1] || '26656';
      return {
        node_id:     p.node_id,
        moniker:     p.node_info?.moniker || 'unknown',
        ip:          p.remote_ip,
        port,
        country:     geo.country_name || geo.country || 'Unknown',
        countryCode: (geo.country_code || 'XX').toLowerCase(),
        city:        geo.city || '',
        org:         geo.org  || geo.asn || 'Unknown',
        lat:         geo.latitude  || 0,
        lon:         geo.longitude || 0,
        isOutbound:  p.is_outbound,
        version:     p.node_info?.version || '',
        network:     p.node_info?.network || '',
      } as PeerGeo;
    });

    await renderMap();
  } catch (e: any) {
    error.value = `${t('peers.error')}: ${e.message}`;
  } finally {
    loading.value = false;
  }
}

async function renderMap() {
  if (!(window as any).L) await loadLeaflet();
  const L = (window as any).L;
  if (!mapEl.value) return;
  if (leafletMap) { leafletMap.remove(); leafletMap = null; }

  leafletMap = L.map(mapEl.value, { zoomControl: true }).setView([20, 10], 2);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CartoDB', maxZoom: 19,
  }).addTo(leafletMap);

  peers.value.forEach(peer => {
    if (peer.lat === 0 && peer.lon === 0) return;
    const jitter = (Math.random() - 0.5) * 1.2;
    const icon = L.divIcon({
      className: '',
      html: `<div style="width:10px;height:10px;border-radius:50%;background:var(--accent,#00e676);border:1.5px solid #fff;box-shadow:0 0 6px rgba(0,230,118,0.7);cursor:pointer;"></div>`,
      iconSize: [10, 10], iconAnchor: [5, 5],
    });
    const flag = peer.countryCode !== 'xx'
      ? `<img src="https://flagcdn.com/16x12/${peer.countryCode}.png" style="vertical-align:middle;margin-right:4px;"/>`
      : '';
    L.marker([peer.lat + jitter, peer.lon + jitter], { icon })
      .addTo(leafletMap)
      .bindPopup(`
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;min-width:200px;">
          <div style="font-weight:700;margin-bottom:4px;color:#00e676;">${flag}${escHtml(peer.moniker)}</div>
          <div style="color:#aaa;margin-bottom:2px;"><span style="color:#555;">IP</span> ${escHtml(peer.ip)}:${peer.port}</div>
          <div style="color:#aaa;margin-bottom:2px;"><span style="color:#555;">NODE ID</span><br/><span style="font-size:9px;word-break:break-all;">${escHtml(peer.node_id)}</span></div>
          <div style="color:#aaa;margin-bottom:2px;"><span style="color:#555;">LOCATION</span> ${peer.city ? escHtml(peer.city)+', ' : ''}${escHtml(peer.country)}</div>
          <div style="color:#aaa;margin-bottom:2px;"><span style="color:#555;">PROVIDER</span> ${escHtml(peer.org)}</div>
          <div style="color:#aaa;"><span style="color:#555;">DIR</span> <span style="${peer.isOutbound ? 'color:#00e676' : 'color:#888'}">${peer.isOutbound ? '▲ OUTBOUND' : '▼ INBOUND'}</span></div>
        </div>`, { maxWidth: 280 });
  });
}

function escHtml(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function loadLeaflet(): Promise<void> {
  return new Promise(resolve => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
}

function copyPeerStr(peer: PeerGeo) {
  navigator.clipboard.writeText(`${peer.node_id}@${peer.ip}:${peer.port}`).catch(() => {});
}

function providerColor(org: string): string {
  const o = org.toLowerCase();
  if (o.includes('hetzner'))                        return '#dd4455';
  if (o.includes('amazon') || o.includes('aws'))   return '#ffaa00';
  if (o.includes('google'))                         return '#4af';
  if (o.includes('ovh'))                            return '#0088ff';
  if (o.includes('digital'))                        return '#0066ff';
  if (o.includes('contabo'))                        return '#aa44ff';
  if (o.includes('vultr'))                          return '#0099ff';
  if (o.includes('linode') || o.includes('akamai')) return '#22cc99';
  return '#888';
}

onMounted(() => fetchPeers());
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <div>
        <h1 class="font-mono text-lg font-bold" style="color:var(--text-main);">
          <span style="color:var(--accent);">▸</span> {{ $t('peers.title') }}
        </h1>
        <p class="font-mono text-[10px]" style="color:var(--text-muted);">
          {{ rpcEndpoint || $t('peers.loading_rpc') }}
        </p>
      </div>
      <div class="ml-auto">
        <button @click="fetchPeers" :disabled="loading"
          class="font-mono text-xs px-3 py-1.5 flex items-center gap-2"
          style="border:1px solid var(--border);background:var(--bg-panel);color:var(--text-main);">
          <Icon :icon="loading ? 'mdi:loading' : 'mdi:refresh'" :class="loading ? 'animate-spin' : ''" />
          {{ loading ? $t('peers.scanning') : $t('peers.refresh') }}
        </button>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="mb-4 px-4 py-2 font-mono text-xs flex gap-2"
      style="border:1px solid var(--red);color:var(--red);background:rgba(229,57,53,0.07);">
      <span>[!]</span><span>{{ error }}</span>
    </div>

    <!-- Stats -->
    <div v-if="peers.length" class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
      <div class="px-3 py-2 flex flex-col" style="border:1px solid var(--border-muted);background:var(--bg-panel);">
        <span class="font-mono text-[9px] uppercase tracking-widest" style="color:var(--text-muted);">{{ $t('peers.stat_total') }}</span>
        <span class="font-mono text-xl font-bold" style="color:var(--accent);">{{ stats.total }}</span>
      </div>
      <div class="px-3 py-2 flex flex-col" style="border:1px solid var(--border-muted);background:var(--bg-panel);">
        <span class="font-mono text-[9px] uppercase tracking-widest" style="color:var(--text-muted);">{{ $t('peers.stat_countries') }}</span>
        <span class="font-mono text-xl font-bold" style="color:var(--accent);">{{ stats.countries }}</span>
      </div>
      <div class="px-3 py-2 flex flex-col" style="border:1px solid var(--border-muted);background:var(--bg-panel);">
        <span class="font-mono text-[9px] uppercase tracking-widest" style="color:var(--text-muted);">{{ $t('peers.stat_providers') }}</span>
        <span class="font-mono text-xl font-bold" style="color:var(--accent);">{{ stats.providers }}</span>
      </div>
      <div class="px-3 py-2 flex flex-col" style="border:1px solid var(--border-muted);background:var(--bg-panel);">
        <span class="font-mono text-[9px] uppercase tracking-widest" style="color:var(--text-muted);">{{ $t('peers.stat_outbound') }}</span>
        <span class="font-mono text-xl font-bold" style="color:var(--accent);">{{ stats.outbound }}</span>
      </div>
    </div>

    <!-- Map -->
    <div class="mb-4 relative" style="border:1px solid var(--border);box-shadow:2px 2px 0 var(--border);">
      <span class="absolute top-0 left-0 font-mono text-[9px] px-1 z-10"
        style="background:var(--bg-panel);color:var(--accent);">┌─[ PEER MAP ]─</span>
      <div v-if="loading" class="absolute inset-0 z-20 flex flex-col items-center justify-center"
        style="background:var(--bg-panel);">
        <div class="font-mono text-xs mb-2 animate-pulse" style="color:var(--accent);">████████░░░░░░░░</div>
        <div class="font-mono text-[10px]" style="color:var(--text-muted);">{{ $t('peers.scanning_desc') }}</div>
      </div>
      <div ref="mapEl" style="height:420px;width:100%;background:#111;"></div>
    </div>

    <!-- Search + Table -->
    <div v-if="peers.length">
      <div class="flex items-center mb-3" style="border:1px solid var(--border);background:var(--bg-panel);">
        <span class="font-mono text-[10px] px-3 py-2 shrink-0"
          style="color:var(--accent);border-right:1px solid var(--border);">{{ $t('peers.search') }}</span>
        <input v-model="searchKw" :placeholder="$t('peers.search_placeholder')"
          class="flex-1 bg-transparent outline-none px-3 py-2 font-mono text-xs"
          style="color:var(--text-main);" />
        <span class="font-mono text-[9px] px-3" style="color:var(--text-muted);">
          {{ filtered.length }} / {{ peers.length }}
        </span>
      </div>

      <div style="border:1px solid var(--border);overflow:hidden;">
        <div class="grid font-mono text-[9px] uppercase tracking-widest px-3 py-1.5"
          style="grid-template-columns:1fr 130px 150px 170px 70px;background:var(--bg-panel-alt);border-bottom:1px solid var(--border);color:var(--text-muted);">
          <span>{{ $t('peers.col_moniker') }}</span>
          <span>{{ $t('peers.col_ip') }}</span>
          <span>{{ $t('peers.col_country') }}</span>
          <span>{{ $t('peers.col_provider') }}</span>
          <span>{{ $t('peers.col_dir') }}</span>
        </div>
        <div class="overflow-y-auto" style="max-height:480px;">
          <div v-for="peer in filtered" :key="peer.node_id"
            class="grid px-3 py-2 font-mono text-xs group cursor-pointer"
            style="grid-template-columns:1fr 130px 150px 170px 70px;border-bottom:1px solid var(--border-muted);background:var(--bg-panel);"
            @mouseenter="($event.currentTarget as HTMLElement).style.background='var(--accent-bg)'"
            @mouseleave="($event.currentTarget as HTMLElement).style.background='var(--bg-panel)'"
            @click="copyPeerStr(peer)"
            :title="`${$t('peers.copy_hint')}: ${peer.node_id}@${peer.ip}:${peer.port}`">
            <div class="flex items-center gap-2 min-w-0">
              <span style="color:var(--accent);">▶</span>
              <span class="truncate font-semibold" style="color:var(--text-main);">{{ peer.moniker }}</span>
              <span class="font-mono text-[8px] hidden group-hover:inline truncate" style="color:var(--text-muted);">{{ peer.node_id.slice(0,12) }}...</span>
            </div>
            <div class="truncate" style="color:var(--text-secondary);">{{ peer.ip }}:{{ peer.port }}</div>
            <div class="flex items-center gap-1.5 truncate">
              <img v-if="peer.countryCode !== 'xx'" :src="`https://flagcdn.com/16x12/${peer.countryCode}.png`" style="width:16px;height:12px;flex-shrink:0;" />
              <span style="color:var(--text-secondary);">{{ peer.city ? peer.city+', ' : '' }}{{ peer.country }}</span>
            </div>
            <div class="truncate">
              <span class="font-mono text-[9px] px-1 py-0.5"
                :style="`color:${providerColor(peer.org)};border:1px solid ${providerColor(peer.org)}33;`">
                {{ peer.org.replace(/^AS\d+\s*/,'').slice(0,22) }}
              </span>
            </div>
            <div>
              <span class="font-mono text-[9px]" :style="peer.isOutbound ? 'color:var(--accent)' : 'color:var(--text-muted)'">
                {{ peer.isOutbound ? '▲ OUT' : '▼ IN' }}
              </span>
            </div>
          </div>
        </div>
      </div>
      <p class="font-mono text-[9px] mt-2 text-center" style="color:var(--text-muted);">{{ $t('peers.copy_hint') }}</p>
    </div>

    <!-- Empty -->
    <div v-else-if="!loading && !error" class="text-center py-16 font-mono text-xs" style="color:var(--text-muted);">
      <div class="text-3xl mb-2">◉</div>
      <div>{{ $t('peers.empty') }}</div>
    </div>
  </div>
</template>

<route>
  {
    meta: {
      i18n: 'peers',
      order: 12
    }
  }
</route>
