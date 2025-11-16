<template>
  <div class="app-wrapper">
    <router-view />
  </div>
</template>

<script>
export default {
    name: 'BSCLayout',
    methods: {}
};
</script>

<style lang="scss" scoped>
  @import "~@/styles/mixin.scss";
  @import "~@/styles/variables.scss";

  .app-wrapper {
    @include clearfix;
    position: relative;
    height: 100%;
    width: 100%;
  }
</style>
