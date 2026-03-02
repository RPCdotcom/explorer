<script lang="ts" setup>
import { useBlockchain } from '@/stores';
import { ref, onMounted, computed } from 'vue';
import { Icon } from '@iconify/vue';

const blockchain = useBlockchain();

// ── Types ──────────────────────────────────────────────
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
  node_id:   string;
  moniker:   string;
  ip:        string;
  port:      string;
  country:   string;
  countryCode: string;
  city:      string;
  org:       string;          // provider
  lat:       number;
  lon:       number;
  isOutbound: boolean;
  version:   string;
  network:   string;
}

// ── State ──────────────────────────────────────────────
const peers     = ref<PeerGeo[]>([]);
const loading   = ref(false);
const error     = ref('');
const searchKw  = ref('');
const mapEl     = ref<HTMLDivElement | null>(null);
let   leafletMap: any = null;

// ── Computed ───────────────────────────────────────────
const rpcEndpoint = computed(() => {
  const ep = blockchain.current?.endpoints?.rpc;
  return ep?.[0]?.address || '';
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

const stats = computed(() => {
  const countries = new Set(peers.value.map(p => p.countryCode));
  const orgs      = new Set(peers.value.map(p => p.org));
  return {
    total:     peers.value.length,
    countries: countries.size,
    providers: orgs.size,
    outbound:  peers.value.filter(p => p.isOutbound).length,
  };
});

// ── Fetch peers from RPC ───────────────────────────────
async function fetchPeers() {
  if (!rpcEndpoint.value) {
    error.value = 'RPC endpoint bulunamadı.';
    return;
  }

  loading.value = true;
  error.value   = '';
  peers.value   = [];

  try {
    const base = rpcEndpoint.value.replace(/\/$/, '');
    const res  = await fetch(`${base}/net_info`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const rawPeers: RawPeer[] = data?.result?.peers || [];
    if (!rawPeers.length) {
      error.value = 'Peer bulunamadı veya net_info boş döndü.';
      loading.value = false;
      return;
    }

    // batch IP geolocation — ip-api.com free, max 100/req
    const ips = [...new Set(rawPeers.map(p => p.remote_ip))];
    const chunks: string[][] = [];
    for (let i = 0; i < ips.length; i += 100) chunks.push(ips.slice(i, i + 100));

    const geoMap: Record<string, any> = {};
    for (const chunk of chunks) {
      const geoRes = await fetch('http://ip-api.com/batch?fields=status,country,countryCode,city,org,lat,lon,query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk.map(ip => ({ query: ip }))),
      });
      const geoData: any[] = await geoRes.json();
      geoData.forEach(g => { if (g.status === 'success') geoMap[g.query] = g; });
    }

    peers.value = rawPeers.map(p => {
      const geo = geoMap[p.remote_ip] || {};
      // parse port from listen_addr (tcp://0.0.0.0:26656 or ip:port)
      const listenAddr = p.node_info?.listen_addr || '';
      const portMatch  = listenAddr.match(/:(\d+)$/);
      const port       = portMatch ? portMatch[1] : '26656';

      return {
        node_id:     p.node_id,
        moniker:     p.node_info?.moniker || 'unknown',
        ip:          p.remote_ip,
        port,
        country:     geo.country     || 'Unknown',
        countryCode: (geo.countryCode || 'XX').toLowerCase(),
        city:        geo.city        || '',
        org:         geo.org         || 'Unknown',
        lat:         geo.lat         || 0,
        lon:         geo.lon         || 0,
        isOutbound:  p.is_outbound,
        version:     p.node_info?.version || '',
        network:     p.node_info?.network || '',
      } as PeerGeo;
    }).filter(p => p.lat !== 0 || p.lon !== 0 || p.ip !== '');

    // render map after data
    await renderMap();

  } catch (e: any) {
    error.value = `Hata: ${e.message}`;
  } finally {
    loading.value = false;
  }
}

// ── Leaflet map ────────────────────────────────────────
async function renderMap() {
  // dynamic import leaflet (CDN via script tag)
  if (!(window as any).L) {
    await loadLeaflet();
  }
  const L = (window as any).L;
  if (!mapEl.value) return;

  // destroy old map if exists
  if (leafletMap) { leafletMap.remove(); leafletMap = null; }

  leafletMap = L.map(mapEl.value, { zoomControl: true }).setView([20, 10], 2);

  // dark tile layer
  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    { attribution: '&copy; CartoDB', maxZoom: 19 }
  ).addTo(leafletMap);

  // cluster peers by country/lat-lon with slight jitter
  const seen: Record<string, number> = {};
  peers.value.forEach(peer => {
    if (peer.lat === 0 && peer.lon === 0) return;
    const key = `${peer.lat.toFixed(1)}_${peer.lon.toFixed(1)}`;
    seen[key] = (seen[key] || 0) + 1;
    const jitter  = (Math.random() - 0.5) * 1.2;
    const lat     = peer.lat + jitter;
    const lon     = peer.lon + jitter;

    const flag = peer.countryCode !== 'xx'
      ? `https://flagcdn.com/16x12/${peer.countryCode}.png`
      : '';

    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:10px;height:10px;border-radius:50%;
        background:var(--accent,#00e676);
        border:1.5px solid #fff;
        box-shadow:0 0 6px rgba(0,230,118,0.7);
        cursor:pointer;
      "></div>`,
      iconSize: [10, 10],
      iconAnchor: [5, 5],
    });

    const marker = L.marker([lat, lon], { icon }).addTo(leafletMap);
    marker.bindPopup(`
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;min-width:200px;">
        <div style="font-weight:700;margin-bottom:4px;color:#00e676;">
          ${flag ? `<img src="${flag}" style="vertical-align:middle;margin-right:4px;"/>` : ''}
          ${escHtml(peer.moniker)}
        </div>
        <div style="color:#aaa;margin-bottom:2px;">
          <span style="color:#555;">IP</span> ${escHtml(peer.ip)}:${peer.port}
        </div>
        <div style="color:#aaa;margin-bottom:2px;">
          <span style="color:#555;">NODE ID</span><br/>
          <span style="font-size:9px;word-break:break-all;">${escHtml(peer.node_id)}</span>
        </div>
        <div style="color:#aaa;margin-bottom:2px;">
          <span style="color:#555;">LOCATION</span>
          ${peer.city ? escHtml(peer.city) + ', ' : ''}${escHtml(peer.country)}
        </div>
        <div style="color:#aaa;margin-bottom:2px;">
          <span style="color:#555;">PROVIDER</span> ${escHtml(peer.org)}
        </div>
        <div style="color:#aaa;">
          <span style="color:#555;">DIR</span>
          <span style="${peer.isOutbound ? 'color:#00e676' : 'color:#888'}">
            ${peer.isOutbound ? '▲ OUTBOUND' : '▼ INBOUND'}
          </span>
        </div>
      </div>
    `, { maxWidth: 280 });
  });
}

function escHtml(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function loadLeaflet(): Promise<void> {
  return new Promise((resolve) => {
    // CSS
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    // JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

// ── Lifecycle ──────────────────────────────────────────
onMounted(() => {
  fetchPeers();
});

// ── Helpers ────────────────────────────────────────────
function copyPeerStr(peer: PeerGeo) {
  const str = `${peer.node_id}@${peer.ip}:${peer.port}`;
  navigator.clipboard.writeText(str).catch(() => {});
}

function providerColor(org: string): string {
  const lower = org.toLowerCase();
  if (lower.includes('hetzner'))   return '#d45';
  if (lower.includes('amazon') || lower.includes('aws')) return '#fa0';
  if (lower.includes('google'))    return '#4af';
  if (lower.includes('ovh'))       return '#08f';
  if (lower.includes('digital'))   return '#06f';
  if (lower.includes('contabo'))   return '#a4f';
  if (lower.includes('vultr'))     return '#09f';
  if (lower.includes('linode') || lower.includes('akamai')) return '#2c9';
  return '#888';
}
</script>

<template>
  <div>
    <!-- ══ Header ══ -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <div>
        <h1 class="font-mono text-lg font-bold tracking-tight" style="color:var(--text-main);">
          <span style="color:var(--accent);">▸</span> PEER MAP
        </h1>
        <p class="font-mono text-[10px]" style="color:var(--text-muted);">
          {{ rpcEndpoint || 'RPC endpoint yükleniyor...' }}
        </p>
      </div>
      <div class="ml-auto flex gap-2">
        <button
          @click="fetchPeers"
          :disabled="loading"
          class="font-mono text-xs px-3 py-1.5 flex items-center gap-2 transition-all"
          style="border:1px solid var(--border);background:var(--bg-panel);color:var(--text-main);"
        >
          <Icon :icon="loading ? 'mdi:loading' : 'mdi:refresh'" :class="loading ? 'animate-spin' : ''" />
          {{ loading ? 'TARANIIYOR...' : 'YENİLE' }}
        </button>
      </div>
    </div>

    <!-- ══ Error ══ -->
    <div v-if="error" class="mb-4 px-4 py-2 font-mono text-xs flex gap-2"
      style="border:1px solid var(--red);color:var(--red);background:rgba(229,57,53,0.07);">
      <span>[!]</span><span>{{ error }}</span>
    </div>

    <!-- ══ Stats bar ══ -->
    <div v-if="peers.length" class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
      <div v-for="(val, label) in {
        'TOTAL PEERS': stats.total,
        'ÜLKELER': stats.countries,
        'PROVIDERLAR': stats.providers,
        'OUTBOUND': stats.outbound,
      }" :key="label"
        class="px-3 py-2 flex flex-col"
        style="border:1px solid var(--border-muted);background:var(--bg-panel);">
        <span class="font-mono text-[9px] uppercase tracking-widest" style="color:var(--text-muted);">{{ label }}</span>
        <span class="font-mono text-xl font-bold" style="color:var(--accent);">{{ val }}</span>
      </div>
    </div>

    <!-- ══ Map ══ -->
    <div class="mb-4 relative" style="border:1px solid var(--border);box-shadow:2px 2px 0 var(--border);">
      <!-- ASCII corner -->
      <span class="absolute top-0 left-0 font-mono text-[9px] px-1 z-10"
        style="background:var(--bg-panel);color:var(--accent);">┌─[ PEER MAP ]─</span>

      <!-- Loading overlay -->
      <div v-if="loading"
        class="absolute inset-0 z-20 flex flex-col items-center justify-center"
        style="background:var(--bg-panel);">
        <div class="font-mono text-xs mb-2" style="color:var(--accent);">
          <span class="animate-pulse">████████░░░░░░░░</span>
        </div>
        <div class="font-mono text-[10px]" style="color:var(--text-muted);">
          Peerlar taranıyor, GeoIP sorgulanıyor...
        </div>
      </div>

      <div ref="mapEl" style="height:420px;width:100%;background:#111;"></div>
    </div>

    <!-- ══ Search + Table ══ -->
    <div v-if="peers.length">
      <!-- Search -->
      <div class="flex items-center mb-3"
        style="border:1px solid var(--border);background:var(--bg-panel);">
        <span class="font-mono text-[10px] px-3 py-2 shrink-0"
          style="color:var(--accent);border-right:1px solid var(--border);">SEARCH</span>
        <input v-model="searchKw" placeholder="moniker, ip, ülke, provider..."
          class="flex-1 bg-transparent outline-none px-3 py-2 font-mono text-xs"
          style="color:var(--text-main);" />
        <span class="font-mono text-[9px] px-3" style="color:var(--text-muted);">
          {{ filtered.length }} / {{ peers.length }}
        </span>
      </div>

      <!-- Table -->
      <div style="border:1px solid var(--border);overflow:hidden;">
        <!-- Header -->
        <div class="grid font-mono text-[9px] uppercase tracking-widest px-3 py-1.5"
          style="
            grid-template-columns: 1fr 120px 140px 160px 70px;
            background:var(--bg-panel-alt);
            border-bottom:1px solid var(--border);
            color:var(--text-muted);
          ">
          <span>MONIKER</span>
          <span>IP:PORT</span>
          <span>ÜLKE</span>
          <span>PROVIDER</span>
          <span>DIR</span>
        </div>

        <!-- Rows -->
        <div class="overflow-y-auto" style="max-height:480px;">
          <div
            v-for="peer in filtered" :key="peer.node_id"
            class="grid px-3 py-2 font-mono text-xs transition-colors group cursor-pointer"
            style="
              grid-template-columns: 1fr 120px 140px 160px 70px;
              border-bottom: 1px solid var(--border-muted);
              background: var(--bg-panel);
            "
            @mouseenter="($event.currentTarget as HTMLElement).style.background='var(--accent-bg)'"
            @mouseleave="($event.currentTarget as HTMLElement).style.background='var(--bg-panel)'"
            @click="copyPeerStr(peer)"
            :title="`Kopyala: ${peer.node_id}@${peer.ip}:${peer.port}`"
          >
            <!-- Moniker -->
            <div class="flex items-center gap-2 min-w-0">
              <span style="color:var(--accent);">▶</span>
              <span class="truncate font-semibold" style="color:var(--text-main);">{{ peer.moniker }}</span>
              <span class="font-mono text-[8px] hidden group-hover:inline truncate" style="color:var(--text-muted);">
                {{ peer.node_id.slice(0, 12) }}...
              </span>
            </div>

            <!-- IP:Port -->
            <div class="truncate" style="color:var(--text-secondary);">
              {{ peer.ip }}:{{ peer.port }}
            </div>

            <!-- Country -->
            <div class="flex items-center gap-1.5 truncate">
              <img
                v-if="peer.countryCode !== 'xx'"
                :src="`https://flagcdn.com/16x12/${peer.countryCode}.png`"
                class="shrink-0"
                style="width:16px;height:12px;"
              />
              <span style="color:var(--text-secondary);">{{ peer.city ? peer.city + ', ' : '' }}{{ peer.country }}</span>
            </div>

            <!-- Provider -->
            <div class="truncate">
              <span class="font-mono text-[9px] px-1 py-0.5"
                :style="`color:${providerColor(peer.org)};border:1px solid ${providerColor(peer.org)}33;`">
                {{ peer.org.replace(/^AS\d+\s*/,'').slice(0, 22) }}
              </span>
            </div>

            <!-- Direction -->
            <div>
              <span class="font-mono text-[9px]"
                :style="peer.isOutbound ? 'color:var(--accent)' : 'color:var(--text-muted)'">
                {{ peer.isOutbound ? '▲ OUT' : '▼ IN' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <p class="font-mono text-[9px] mt-2 text-center" style="color:var(--text-muted);">
        Satıra tıklayarak <code>nodeID@ip:port</code> formatını kopyalayabilirsin
      </p>
    </div>

    <!-- Empty state -->
    <div v-else-if="!loading && !error"
      class="text-center py-16 font-mono text-xs"
      style="color:var(--text-muted);">
      <div class="text-3xl mb-2">◉</div>
      <div>Henüz peer yok. RPC bağlantısını kontrol et.</div>
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
