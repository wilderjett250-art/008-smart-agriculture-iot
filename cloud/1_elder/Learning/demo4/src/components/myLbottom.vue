<template>
  <div class="shebei">
    <p>重大设备互联网运行</p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      mokuai1: [
        { value: 1, text: "正常", sty: '#00ff40' },
        { value: 4, text: "暂停", sty: 'red' },
        { value: 0, text: "故障", sty: 'yellow' },
      ],
    };
  },
};
</script>
