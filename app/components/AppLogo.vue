<template>
  <span class="brand-lockup" aria-label="SlideCraft">
    <span class="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
    <span class="brand-name">SlideCraft</span>
  </span>
</template>

<style scoped>
.brand-lockup {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-display);
  font-weight: 680;
  letter-spacing: -0.035em;
  font-size: 18px;
}

.brand-mark {
  display: grid;
  grid-template-columns: repeat(3, 4px);
  gap: 3px;
  align-items: end;
  width: 26px;
  height: 26px;
  padding: 5px;
  border-radius: 8px;
  background: var(--color-ink);
}

.brand-mark span {
  display: block;
  border-radius: 1px;
  background: #f8f7f3;
}

.brand-mark span:nth-child(1) { height: 7px; }
.brand-mark span:nth-child(2) { height: 13px; }
.brand-mark span:nth-child(3) { height: 10px; background: #c9c2ff; }
</style>
