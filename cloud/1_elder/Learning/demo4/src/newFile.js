import bg from "./assets/js/bg.js";

export default (await import('vue')).defineComponent({
name: 'app',
components: {
Header,
footer
},
mounted() {
bg();
}
});
