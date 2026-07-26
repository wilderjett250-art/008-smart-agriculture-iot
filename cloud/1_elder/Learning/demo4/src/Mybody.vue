<template>
  <div class="box">
    <Header @changeV="headerChangeV" />
    <MapLayer />
    <Footer />
    <div class="aside-show" v-show="d_visible">
      <Laside @carlocation="carshow($event)" />
      <Raside />
      <Risk v-show="riskdata" />
      <Government v-show="gm" />
      <Carpositon v-show="carechart" />
      <Worksum v-show="work" />
      <Cellperson v-show="cell"/>
      <Table/>
    </div>
    <div class="lab-show" v-show="d_visible2">
      <Search />
      <Lable />
      <Show />
    </div>
  </div>
</template>

<script>
// import BtnCard from './components/BtnCard.vue'
import { mapState } from "vuex";
import MapLayer from "./MapLayer.vue";
import Footer from "./footer.vue";
import Header from "./header.vue";
import Laside from "./Laside/laside.vue";
import Raside from "./Raside/raside.vue";
import Mylab from "./Mylab-le.vue";
import Show from "./show.vue";
import Search from "./search.vue";
import Carpositon from "./carposition/carposition.vue";
import Risk from "./Raside/risk.vue";
import Government from "./Raside/government.vue";
import Worksum from "./Laside/worksum.vue";
import Table from './navigation.vue'
import Cellperson from "./Raside/cellperson.vue";
export default {
  name: "body",
  components: {
    MapLayer,
    Footer,
    Header,
    Raside,
    Lable,
    Laside,
    Show,
    Search,
    Carpositon,
    Risk,
    Government,
    Worksum,
    Table,
    Cellperson,
    Mylab
  },
  computed: {
    ...mapState(["carechart", "riskdata", "gm", "work","cell"]),
  },
  data() {
    return {
      d_visible: true,
      d_visible2: false,
      // carvisible:0,
    };
  },
  methods: {
    headerChangeV() {
      this.d_visible = !this.d_visible;
      this.d_visible2 = !this.d_visible2;
    },
  },
};
</script>

<style>
.box {
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
  position: relative;
  right: 0;
  top:0;
  overflow: hidden;
}
</style>
