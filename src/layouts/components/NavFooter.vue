<template>
  <footer class="flex items-center justify-between px-5 py-3 font-mono text-[10px]"
    style="
      border-top: 1px dashed var(--border-muted);
      color: var(--text-muted);
      background: var(--bg-panel);
    ">
    <div class="flex items-center gap-2">
      <span style="color:var(--accent);">└─</span>
      <span>&copy; {{ new Date().getFullYear() }} RPCdot.com</span>
      <span style="color:var(--border-muted);">//</span>
      <a class="transition-colors hover:text-current"
        style="color:var(--text-muted);"
        href="https://ping.pub" target="_blank" rel="noopener noreferrer">
        ping.pub
      </a>
    </div>
    <div class="hidden md:flex items-center gap-4">
      <a class="transition-colors"
        style="color:var(--text-muted);"
        href="https://github.com/ping-pub/explorer/blob/master/LICENSE"
        target="_blank" rel="noopener noreferrer">
        [LICENSE]
      </a>
      <a class="transition-colors"
        style="color:var(--text-muted);"
        href="https://github.com/ping-pub/explorer"
        target="_blank" rel="noopener noreferrer">
        [GITHUB]
      </a>
    </div>
  </footer>
</template>
